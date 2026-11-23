import { AudioEngine, ambienceForLevel } from '../core/audio';
import { Input } from '../core/input';
import { Settings, controlKeymap, type ControlPreset, type Palette } from '../core/settings';
import { randomSeed, seedLabel } from '../core/math';
import { t } from '../core/i18n';
import { Renderer } from '../render/renderer';
import { Hud } from '../ui/hud';
import { Safehouse } from '../ui/safehouse';
import { LayoutId, Level, loadLevel, Station, StationKind } from './map';
import { CONSUMABLE_MAP } from './consumables';
import { Contract, objectiveText } from './missions';
import { buildBoard } from './campaign';
import { BOSSES } from './bosses';
import { BOSS_DIALOGUE, DialogueLine, FACTIONS, handlerLine } from './lore';
import { ENDING_ORDER, ENDINGS, type EndingId } from './endings';
import { APPROACH_MAP, ApproachId } from './attributes';
import { MODIFIER_MAP } from './modifiers';
import { xpForNext } from './progression';
import { Profile } from './profile';
import { RunConfig } from './run';
import { WEAPONS } from './weapons';
import { World } from './world';
import type { WorldEvent } from './world-types';
import { deathResult, winResult, type RewardSummary } from './results';
import { settleRun } from './settlement';

const FIXED = 1 / 120;
const deathDelay = 0.7;
const winDelay = 0.35;

type GameState = 'safehouse' | 'playing' | 'paused' | 'dead' | 'win';

export class Game {
  private readonly input = new Input();
  private readonly settings = new Settings();
  private readonly audio = new AudioEngine();
  private readonly renderer: Renderer;
  private readonly hud = new Hud();
  private readonly pauseRoot = document.getElementById('overlay-pause')!;
  private readonly pauseSettingsEl = document.getElementById('pause-settings')!;
  private readonly manualRoot = document.getElementById('overlay-manual')!;
  private readonly briefRoot = document.getElementById('overlay-brief')!;
  private readonly approachVignette = document.getElementById('approach-vignette')!;
  private readonly screenTransition = document.getElementById('screen-transition')!;
  private readonly briefKicker = document.getElementById('brief-kicker')!;
  private readonly briefTitle = document.getElementById('brief-title')!;
  private readonly briefFaction = document.getElementById('brief-faction')!;
  private readonly briefObjective = document.getElementById('brief-objective')!;
  private readonly briefHandler = document.getElementById('brief-handler')!;
  private readonly dialogueRoot = document.getElementById('overlay-dialogue')!;
  private readonly dialogueSpeakerEl = document.getElementById('dialogue-speaker')!;
  private readonly dialogueTextEl = document.getElementById('dialogue-text')!;
  private readonly dialogueProgressEl = document.getElementById('dialogue-progress')!;
  private readonly dialogueNextEl = document.getElementById('dialogue-next') as HTMLButtonElement;
  private readonly endingRoot = document.getElementById('overlay-ending')!;
  private readonly endingOptions = document.getElementById('ending-options')!;
  private readonly abandonBtn = document.querySelector<HTMLButtonElement>(
    '#overlay-pause [data-act="abandon"]',
  )!;
  private readonly setVolume = document.getElementById('set-volume') as HTMLInputElement;
  private readonly setShake = document.getElementById('set-shake') as HTMLInputElement;
  private readonly setBloom = document.getElementById('set-bloom') as HTMLInputElement;
  private readonly setFlash = document.getElementById('set-flash') as HTMLInputElement;
  private readonly setScanlines = document.getElementById('set-scanlines') as HTMLInputElement;
  private readonly setCones = document.getElementById('set-cones') as HTMLInputElement;
  private readonly setWeather = document.getElementById('set-weather') as HTMLInputElement;
  private readonly setReducedMotion = document.getElementById(
    'set-reduced-motion',
  ) as HTMLInputElement;
  private readonly setControls = document.getElementById('set-controls') as HTMLSelectElement;
  private readonly setPalette = document.getElementById('set-palette') as HTMLSelectElement;
  private readonly setSubtitles = document.getElementById('set-subtitles') as HTMLInputElement;
  private readonly setDialogueLog = document.getElementById(
    'set-dialogue-log',
  ) as HTMLInputElement;
  private readonly hubRoot = document.getElementById('hub')!;
  private readonly hubPrompt = document.getElementById('hub-prompt')!;
  private readonly hubLevel = document.getElementById('hub-level')!;
  private readonly hubMoney = document.getElementById('hub-money')!;
  private readonly profile: Profile;
  private readonly safehouse: Safehouse;
  private readonly levelCache = new Map<LayoutId, Level>();
  private contracts: Contract[] = [];
  private currentContract: Contract | null = null;
  private world: World;
  private state: GameState = 'safehouse';
  private acc = 0;
  private overlayT = 0;
  private overlayShown = false;
  private briefT = 0;
  private currentApproach: ApproachId = 'standard';
  private pendingRun: { contract: Contract; approachId: ApproachId } | null = null;
  private dialogueOpen = false;
  private dialogueLines: DialogueLine[] = [];
  private dialogueIndex = 0;
  private lastShotsHit = 0;
  private lastKills = 0;
  private startedWithWeapon = false;
  private lastReward: RewardSummary | null = null;
  private manualOpen = false;
  private endingOpen = false;
  private panelOpen = false;
  private recoveryNote: string | null = null;
  private abandonArmed = false;
  private abandonTimer: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.profile = new Profile();
    this.recoveryNote = this.profile.recoveryNote();
    this.safehouse = new Safehouse(this.profile, {
      onDeploy: (contractId, approachId) => this.startRun(contractId, approachId),
      onClick: () => {
        this.audio.unlock();
        this.audio.uiClick();
      },
      onError: () => {
        this.audio.unlock();
        this.audio.uiError();
      },
      onReroll: () => this.rerollBoard(),
      onManual: () => this.showManual(),
      onClose: () => this.closePanel(),
    });

    this.contracts = this.rollBoard();
    this.currentContract = this.contracts[0];
    this.safehouse.setContracts(this.contracts);
    this.world = this.createHubWorld();
    this.renderer.bind(this.world);
    this.showHub();
    this.installEvents();
    this.applySettings();
    this.syncSettingsUI();
    if (!this.settings.data.tutorialSeen) this.showManual();
  }

  private rollBoard(): Contract[] {
    return buildBoard(this.profile, randomSeed());
  }

  private rerollBoard(): Contract[] | null {
    if (this.profile.data.money < 75) return null;
    this.profile.data.money -= 75;
    this.profile.save();
    this.contracts = this.rollBoard();
    this.currentContract = this.contracts[0] ?? null;
    this.updateHubStats();
    return this.contracts;
  }

  private createHubWorld(): World {
    return new World(
      this.getLevel('safehouse'),
      this.input,
      (e) => this.onEvent(e),
      {
        weapon: 'fists',
        ammo: 0,
        attachment: null,
        variant: null,
        supplyType: null,
        supplyCharges: 0,
      },
      { objective: 'purge', requiredLoot: 0 },
      this.profile.runMods(),
      0,
    );
  }

  private showHub(): void {
    this.panelOpen = false;
    this.hubRoot.classList.remove('hidden');
    this.safehouse.hide();
    this.hud.setVisible(false);
    this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, false);
    this.updateHubStats();
    this.updateHubPrompt();
  }

  private updateHubStats(): void {
    const { level, xp, money } = this.profile.data;
    this.hubLevel.textContent = `LVL ${level} · ${xp}/${xpForNext(level)} XP`;
    this.hubMoney.textContent = `$${money.toLocaleString('en-US')}`;
  }

  private nearestStation(): Station | null {
    let best: Station | null = null;
    let bestD = 74;
    const p = this.world.player;
    for (const station of this.world.level.stations) {
      const d = Math.hypot(station.x - p.x, station.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = station;
      }
    }
    return best;
  }

  private updateHubPrompt(): void {
    const station = this.nearestStation();
    const labels: Record<StationKind, string> = {
      contracts: 'CONTRACTS',
      workbench: 'WORKBENCH',
      clinic: 'CLINIC',
      market: 'MARKET',
      supplies: 'SUPPLIES',
      archive: 'ARCHIVE',
      fabricator: 'FABRICATOR',
      operator: 'OPERATOR',
      deploy: 'DEPLOY',
    };
    this.hubPrompt.textContent = station
      ? `E — ${labels[station.kind]}`
      : this.recoveryNote
        ? `${this.recoveryNote} · TAB — OPEN TERMINAL`
        : 'TAB — OPEN TERMINAL';
  }

  private openPanel(kind?: StationKind): void {
    if (this.state !== 'safehouse' || this.panelOpen) return;
    this.panelOpen = true;
    this.hubRoot.classList.add('hidden');
    const notice = this.recoveryNote;
    this.recoveryNote = null;
    if (kind) this.safehouse.openStation(kind);
    else this.safehouse.show();
    if (notice) this.safehouse.setNotice(notice);
    this.input.endFrame();
  }

  private closePanel(): void {
    if (!this.panelOpen) return;
    this.panelOpen = false;
    this.safehouse.hide();
    this.hubRoot.classList.remove('hidden');
    this.updateHubStats();
    this.updateHubPrompt();
    this.input.endFrame();
  }

  private createWorld(config: RunConfig): World {
    const { contract, loadout, approach, seed } = config;
    const level = this.getLevel(contract.layoutId);
    return new World(
      level,
      this.input,
      (e) => this.onEvent(e),
      loadout,
      {
        objective: contract.objective,
        requiredLoot: contract.requiredLoot,
        approach,
        modifiers: contract.modifiers,
        bossId: contract.bossId,
      },
      this.profile.runMods(),
      seed,
    );
  }

  private getLevel(id: LayoutId): Level {
    let level = this.levelCache.get(id);
    if (!level) {
      level = loadLevel(id);
      this.levelCache.set(id, level);
    }
    return level;
  }

  private installEvents(): void {
    for (const id of ['overlay-death', 'overlay-win']) {
      document.getElementById(id)!.addEventListener('click', () => {
        if (this.state === 'dead' || this.state === 'win') this.returnToSafehouse();
      });
    }

    this.dialogueRoot.addEventListener('click', (ev) => {
      const act = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'dialogue-next') this.advanceDialogue();
      else if (act === 'dialogue-cancel') this.cancelDialogue();
    });
    this.endingRoot.addEventListener('click', (ev) => {
      const id = (ev.target as HTMLElement).closest<HTMLElement>('[data-ending]')?.dataset
        .ending;
      if (id) this.chooseEnding(id as EndingId);
    });
    this.pauseRoot.addEventListener('click', (ev) => this.handlePauseClick(ev));
    this.manualRoot.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('[data-act="close-manual"]')) this.closeManual();
    });

    for (const el of [this.setVolume, this.setShake, this.setBloom]) {
      el.addEventListener('input', () => this.onSettingsInput());
    }
    for (const el of [
      this.setFlash,
      this.setScanlines,
      this.setCones,
      this.setWeather,
      this.setReducedMotion,
      this.setSubtitles,
      this.setDialogueLog,
    ]) {
      el.addEventListener('change', () => this.onSettingsInput());
    }
    for (const el of [this.setControls, this.setPalette]) {
      el.addEventListener('change', () => this.onSettingsInput());
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.audio.toggleMute();
        return;
      }
      if (this.dialogueOpen) {
        if (e.code === 'Escape') {
          e.preventDefault();
          this.cancelDialogue();
        } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
          e.preventDefault();
          this.advanceDialogue();
        }
        return;
      }
      if (this.endingOpen) {
        const index = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
        if (index >= 0) {
          e.preventDefault();
          this.chooseEnding(ENDING_ORDER[index]);
        }
        return;
      }
      if (this.manualOpen) {
        if (e.code === 'Escape') this.closeManual();
        return;
      }
      if (this.state === 'playing') {
        if (e.code === 'Escape') this.pauseGame();
        return;
      }
      if (this.state === 'paused') {
        if (e.code === 'Escape') this.resumeGame();
        return;
      }
      if (this.state === 'safehouse') {
        if (this.panelOpen) {
          if (e.code === 'Escape') {
            if (!this.safehouse.handleEscape()) this.closePanel();
          } else if (e.code === 'KeyR' && this.safehouse.caseOpen) {
            this.safehouse.rotateSelectedCase();
          } else if (
            e.code === 'Enter' &&
            !this.safehouse.augmentsOpen &&
            !this.safehouse.workbenchOpen &&
            !(document.activeElement instanceof HTMLButtonElement)
          ) {
            this.safehouse.openDeploy();
          }
          return;
        }
        if (e.code === 'Tab') {
          e.preventDefault();
          this.openPanel();
        }
        return;
      }
      if (this.state === 'dead') {
        if (e.code === 'KeyR') this.quickRetry();
        else if (e.code === 'Space' || e.code === 'Enter') this.returnToSafehouse();
        return;
      }
      if (this.state === 'win') {
        if (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Space') {
          this.returnToSafehouse();
        }
      }
    });
  }

  private applySettings(): void {
    const reduced = this.settings.data.reducedMotion;
    this.input.setKeymap(controlKeymap(this.settings.data.controls));
    this.audio.setVolume(this.settings.data.volume);
    this.renderer.setShakeScale(reduced ? 0 : this.settings.data.shake);
    this.renderer.setBloomScale(this.settings.data.bloom);
    this.renderer.setConesVisible(this.settings.data.cones);
    this.renderer.setWeatherEnabled(this.settings.data.weather);
    this.renderer.setReducedMotion(reduced);
    this.renderer.setPalette(this.settings.data.palette);
    this.hud.setFlashEnabled(this.settings.data.flash && !reduced);
    this.hud.setSubtitlesEnabled(this.settings.data.subtitles);
    this.hud.setLogEnabled(this.settings.data.dialogueLog);
    document.body.dataset.palette = this.settings.data.palette;
    document.body.classList.toggle('no-scanlines', !this.settings.data.scanlines);
    document.body.classList.toggle('reduced-motion', reduced);
  }

  private syncSettingsUI(): void {
    this.setVolume.value = String(Math.round(this.settings.data.volume * 100));
    this.setShake.value = String(Math.round(this.settings.data.shake * 100));
    this.setBloom.value = String(Math.round(this.settings.data.bloom * 100));
    this.setFlash.checked = this.settings.data.flash;
    this.setScanlines.checked = this.settings.data.scanlines;
    this.setCones.checked = this.settings.data.cones;
    this.setWeather.checked = this.settings.data.weather;
    this.setReducedMotion.checked = this.settings.data.reducedMotion;
    this.setControls.value = this.settings.data.controls;
    this.setPalette.value = this.settings.data.palette;
    this.setSubtitles.checked = this.settings.data.subtitles;
    this.setDialogueLog.checked = this.settings.data.dialogueLog;
  }

  private onSettingsInput(): void {
    this.settings.set('volume', Number(this.setVolume.value) / 100);
    this.settings.set('shake', Number(this.setShake.value) / 100);
    this.settings.set('bloom', Number(this.setBloom.value) / 100);
    this.settings.set('flash', this.setFlash.checked);
    this.settings.set('scanlines', this.setScanlines.checked);
    this.settings.set('cones', this.setCones.checked);
    this.settings.set('weather', this.setWeather.checked);
    this.settings.set('reducedMotion', this.setReducedMotion.checked);
    this.settings.set('controls', this.setControls.value as ControlPreset);
    this.settings.set('palette', this.setPalette.value as Palette);
    this.settings.set('subtitles', this.setSubtitles.checked);
    this.settings.set('dialogueLog', this.setDialogueLog.checked);
    this.applySettings();
  }

  private pauseGame(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.world.shake = 0;
    this.pauseRoot.classList.remove('hidden');
    this.pauseSettingsEl.classList.add('hidden');
    this.abandonArmed = false;
    this.abandonBtn.textContent = 'ABANDON RUN';
    if (this.abandonTimer !== null) {
      window.clearTimeout(this.abandonTimer);
      this.abandonTimer = null;
    }
    this.syncSettingsUI();
    this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, false);
    this.input.endFrame();
  }

  private resumeGame(): void {
    if (this.state !== 'paused') return;
    this.pauseRoot.classList.add('hidden');
    this.state = 'playing';
    this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, true);
    this.input.endFrame();
  }

  private handlePauseClick(ev: MouseEvent): void {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) return;
    switch (target.dataset.act) {
      case 'resume':
        this.resumeGame();
        break;
      case 'settings':
        this.pauseSettingsEl.classList.toggle('hidden');
        this.syncSettingsUI();
        break;
      case 'manual':
        this.showManual();
        break;
      case 'abandon':
        this.handleAbandon();
        break;
      default:
        break;
    }
  }

  private handleAbandon(): void {
    if (!this.abandonArmed) {
      this.abandonArmed = true;
      this.abandonBtn.textContent = 'CONFIRM ABANDON';
      if (this.abandonTimer !== null) window.clearTimeout(this.abandonTimer);
      this.abandonTimer = window.setTimeout(() => {
        this.abandonArmed = false;
        this.abandonBtn.textContent = 'ABANDON RUN';
      }, 5000);
      return;
    }
    if (this.abandonTimer !== null) {
      window.clearTimeout(this.abandonTimer);
      this.abandonTimer = null;
    }
    this.abandonArmed = false;
    this.pauseRoot.classList.add('hidden');
    this.returnToSafehouse();
  }

  private showManual(): void {
    this.manualOpen = true;
    this.manualRoot.classList.remove('hidden');
    (document.getElementById('manual-close') as HTMLButtonElement | null)?.focus();
  }

  private closeManual(): void {
    this.manualOpen = false;
    this.manualRoot.classList.add('hidden');
    if (!this.settings.data.tutorialSeen) this.settings.set('tutorialSeen', true);
  }

  private startRun(contractId: string, approachId: ApproachId = 'standard'): void {
    const contract = this.contracts.find((c) => c.id === contractId) ?? this.currentContract;
    if (!contract || contract.locked) return;
    this.audio.unlock();
    if (contract.objective === 'boss') {
      this.pendingRun = { contract, approachId };
      const boss = contract.bossId ? BOSSES[contract.bossId] : null;
      this.dialogueLines =
        contract.bossId === 'psycho' || !boss
          ? BOSS_DIALOGUE
          : [
              { speaker: 'MOTH', text: `${boss.name}. ${boss.blurb}` },
              {
                speaker: 'KESTREL',
                text:
                  contract.chapter === 'final'
                    ? 'And after the board, what is left?'
                    : 'And the exit?',
              },
              {
                speaker: 'MOTH',
                text:
                  contract.chapter === 'final'
                    ? 'Whatever you decide. The leash ends here.'
                    : 'There is an exit. Reach it. I will keep the lights on.',
              },
            ];
      this.dialogueIndex = 0;
      this.dialogueOpen = true;
      this.dialogueRoot.classList.remove('hidden');
      this.renderDialogue();
      this.input.endFrame();
      return;
    }
    this.commitRun(contract, approachId);
  }

  private commitRun(contract: Contract, approachId: ApproachId): void {
    this.currentContract = contract;
    this.currentApproach = approachId;
    this.audio.unlock();
    const loadout = this.profile.beginRun();
    this.startedWithWeapon = loadout.weapon !== 'fists';
    this.beginMission({ contract, approach: approachId, seed: contract.seed, loadout });
  }

  private renderDialogue(): void {
    const line = this.dialogueLines[this.dialogueIndex];
    if (!line) return;
    this.dialogueSpeakerEl.textContent = line.speaker;
    this.dialogueSpeakerEl.style.color = line.speaker === 'MOTH' ? 'var(--cyan)' : 'var(--magenta)';
    this.dialogueTextEl.textContent = line.text;
    this.dialogueProgressEl.textContent = `${this.dialogueIndex + 1} / ${this.dialogueLines.length}`;
    this.dialogueNextEl.textContent =
      this.dialogueIndex === this.dialogueLines.length - 1 ? 'DEPLOY' : 'CONTINUE';
    this.hud.logLine(`${line.speaker}: ${line.text}`);
    this.hud.subtitle(`${line.speaker}: ${line.text}`, 4200);
  }

  private advanceDialogue(): void {
    if (!this.dialogueOpen) return;
    this.audio.uiClick();
    if (this.dialogueIndex < this.dialogueLines.length - 1) {
      this.dialogueIndex++;
      this.renderDialogue();
      return;
    }
    const pending = this.pendingRun;
    this.closeDialogue();
    if (pending) this.commitRun(pending.contract, pending.approachId);
  }

  private closeDialogue(): void {
    this.dialogueOpen = false;
    this.dialogueRoot.classList.add('hidden');
    this.pendingRun = null;
    this.input.endFrame();
  }

  private cancelDialogue(): void {
    if (!this.dialogueOpen) return;
    this.audio.uiClick();
    this.closeDialogue();
  }

  private quickRetry(): void {
    const contract = this.currentContract;
    if (!contract) return;
    this.audio.unlock();
    const loadout = this.profile.recordAttempt();
    this.startedWithWeapon = false;
    this.beginMission({ contract, approach: this.currentApproach, seed: contract.seed, loadout });
  }

  private beginMission(config: RunConfig): void {
    const { contract, approach } = config;
    this.currentContract = contract;
    this.currentApproach = approach;
    this.manualOpen = false;
    this.manualRoot.classList.add('hidden');
    this.endingOpen = false;
    this.endingRoot.classList.add('hidden');
    this.world = this.createWorld(config);
    this.renderer.bind(this.world);
    this.acc = 0;
    this.overlayT = 0;
    this.overlayShown = false;
    this.lastReward = null;
    this.state = 'playing';
    this.world.player.invulnT = 1.2;
    this.audio.setAmbience(ambienceForLevel(contract.layoutId));
    this.audio.setFaction(contract.faction);
    this.audio.setBossMode(contract.objective === 'boss' || contract.chapter === 'final');
    this.panelOpen = false;
    this.hubRoot.classList.add('hidden');
    this.safehouse.hide();
    this.hud.hideResults();
    this.hud.setVisible(true);
    this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, true);
    this.lastShotsHit = 0;
    this.lastKills = 0;
    this.setApproachVignette(approach);
    document.body.classList.toggle('contract-fog', contract.modifiers.includes('fog'));
    document.body.classList.toggle('contract-blackout', approach === 'blackout');
    this.showBrief(contract);
    this.playScreenTransition();
    this.input.endFrame();
  }

  private setApproachVignette(approach: ApproachId): void {
    this.approachVignette.className =
      approach === 'standard' ? 'approach-vignette' : `approach-vignette on ${approach}`;
  }

  private showBrief(contract: Contract): void {
    const faction = FACTIONS[contract.faction];
    const approach = APPROACH_MAP[this.currentApproach];
    const mods = contract.modifiers.map((id) => MODIFIER_MAP[id].name).join(' · ');
    const seed = seedLabel(contract.seed);
    this.briefKicker.textContent = `// ${contract.risk} RISK · ${contract.layoutName} · ${approach.name}${
      mods ? ` · ${mods}` : ''
    } · SEED ${seed}`;
    this.briefRoot.dataset.seed = seed;
    this.briefTitle.textContent = contract.title;
    this.briefFaction.textContent = faction.name;
    this.briefFaction.style.color = faction.color;
    this.briefObjective.textContent = objectiveText(contract);
    this.briefHandler.textContent = `MOTH: ${handlerLine(contract.faction, contract.title.length)}`;
    this.hud.logLine(`MOTH: ${handlerLine(contract.faction, contract.title.length)}`);
    this.briefRoot.classList.remove('hidden');
    this.briefT = 1.5;
  }

  private returnToSafehouse(): void {
    this.audio.setAmbience('none');
    this.audio.setBossMode(false);
    this.audio.setFaction('market');
    this.audio.setIntensity(0);
    this.hud.setHacked(false);
    this.state = 'safehouse';
    this.pauseRoot.classList.add('hidden');
    this.manualRoot.classList.add('hidden');
    this.manualOpen = false;
    this.endingRoot.classList.add('hidden');
    this.endingOpen = false;
    this.hud.hideResults();
    this.hud.setVisible(false);
    this.hud.exitPointer(0, 0, false);
    this.briefRoot.classList.add('hidden');
    this.briefT = 0;
    this.approachVignette.className = 'approach-vignette';
    document.body.classList.remove('contract-fog', 'contract-blackout');
    this.dialogueRoot.classList.add('hidden');
    this.dialogueOpen = false;
    this.pendingRun = null;
    this.contracts = this.rollBoard();
    this.currentContract = this.contracts[0] ?? null;
    this.safehouse.setContracts(this.contracts);
    this.world = this.createHubWorld();
    this.renderer.bind(this.world);
    this.acc = 0;
    this.overlayT = 0;
    this.overlayShown = false;
    this.showHub();
    this.playScreenTransition();
    this.input.endFrame();
  }

  private playScreenTransition(): void {
    this.screenTransition.classList.remove('active');
    void this.screenTransition.offsetWidth;
    this.screenTransition.classList.add('active');
  }

  private onEvent(e: WorldEvent): void {
    if (this.state === 'playing' || this.state === 'dead' || this.state === 'win') {
      const screen = this.renderer.worldToScreen(e.x, e.y);
      this.audio.setSfxPan(
        Math.max(-1, Math.min(1, (screen.x / Math.max(1, window.innerWidth)) * 2 - 1)),
      );
    }
    switch (e.type) {
      case 'pistol':
        this.audio.shot(false);
        break;
      case 'shotgun':
        this.audio.shot(true);
        break;
      case 'shot-smg':
        this.audio.smgShot();
        break;
      case 'shot-rifle':
        this.audio.rifleShot();
        break;
      case 'shot-ak':
        this.audio.akShot();
        break;
      case 'shot-lmg':
        this.audio.lmgShot();
        break;
      case 'shot-revolver':
        this.audio.revolverShot();
        break;
      case 'shot-carbine':
        this.audio.carbineShot();
        break;
      case 'shot-needler':
        this.audio.needlerShot();
        break;
      case 'shot-dmr':
        this.audio.dmrShot();
        break;
      case 'shot-plasma':
        this.audio.plasmaShot();
        break;
      case 'shot-railgun':
        this.audio.railgunShot();
        break;
      case 'armorHitEnemy':
        this.audio.shieldHit();
        break;
      case 'armorBreakEnemy':
        this.audio.bossHit();
        break;
      case 'enemyShot':
      case 'enemyShotgun':
        this.audio.enemyShot();
        break;
      case 'swing':
        this.audio.swing();
        break;
      case 'punch':
      case 'enemyPunch':
        this.audio.punch();
        break;
      case 'kill':
        this.audio.kill();
        this.profile.addComponent(
          Math.random() < this.profile.data.perks.scavenger * 0.25 ? 2 : 1,
        );
        break;
      case 'stealthKill':
        this.audio.stealthKill();
        this.profile.addComponent(
          Math.random() < this.profile.data.perks.scavenger * 0.25 ? 2 : 1,
        );
        break;
      case 'siren':
        this.audio.siren();
        break;
      case 'shieldHit':
        this.audio.shieldHit();
        break;
      case 'bossHit':
        this.audio.bossHit();
        break;
      case 'bossPhase':
        this.audio.bossPhase();
        this.hud.subtitle(t('event.bossPhase'));
        this.hud.logLine('BOSS: plate shattered');
        break;
      case 'bossShock':
        this.audio.explosion();
        break;
      case 'bossCharge':
        this.audio.alert();
        break;
      case 'bossWeakHit':
        this.audio.bossHit();
        this.audio.explosion();
        break;
      case 'stim':
        this.audio.stim();
        break;
      case 'smoke':
        this.audio.smoke();
        break;
      case 'flash':
        this.audio.flash();
        this.hud.flashDamage('flash');
        break;
      case 'fragThrow':
        this.audio.fragThrow();
        break;
      case 'explosion':
        this.audio.explosion();
        break;
      case 'sniperShot':
        this.audio.sniperShot();
        break;
      case 'sandevistan':
        this.audio.sandevistan();
        break;
      case 'camo':
        this.audio.camo();
        break;
      case 'emp':
      case 'deck':
        this.audio.emp();
        break;
      case 'berserk':
        this.audio.berserk();
        break;
      case 'overclock':
        this.audio.overclock();
        break;
      case 'kerenzikov':
        this.audio.kerenzikov();
        this.hud.subtitle(t('event.kerenzikov'));
        break;
      case 'camoBreak':
        this.audio.camoBreak();
        break;
      case 'secondHeart':
        this.audio.secondHeart();
        this.hud.flashDamage('armor');
        this.hud.subtitle(t('event.secondHeart'));
        this.hud.logLine('SECOND HEART: survived lethal hit');
        break;
      case 'biomonitor':
        this.audio.biomonitor();
        break;
      case 'suppressedShot':
        this.audio.suppressedShot(false);
        break;
      case 'suppressedShotgun':
        this.audio.suppressedShot(true);
        break;
      case 'loot':
        this.audio.loot();
        break;
      case 'armorHit':
        this.audio.armorHit();
        this.hud.flashDamage('armor');
        this.hud.damageDirection(e.angle + Math.PI);
        break;
      case 'playerDeath':
        this.audio.death();
        this.hud.flashDamage('death');
        this.hud.damageDirection(e.angle + Math.PI);
        this.state = 'dead';
        this.overlayT = 0;
        this.overlayShown = false;
        break;
      case 'loudBreach':
        this.audio.siren();
        break;
      case 'doorSlam':
        this.audio.doorSlam();
        break;
      case 'doorOpen':
        this.audio.doorOpen();
        break;
      case 'pickup':
        this.audio.pickup();
        break;
      case 'throw':
        this.audio.throwSfx();
        break;
      case 'empty':
        this.audio.empty();
        break;
      case 'reloadStart':
        this.audio.reloadStart();
        break;
      case 'reloadEnd':
        this.audio.reloadEnd();
        break;
      case 'reloadCancel':
        this.audio.reloadCancel();
        break;
      case 'alert':
      case 'bodyFound':
      case 'cameraAlert':
        this.audio.alert();
        break;
      case 'cameraBroken':
      case 'turretBroken':
      case 'laserBroken':
        this.audio.shieldHit();
        break;
      case 'turretShot':
        this.audio.enemyShot();
        break;
      case 'laserHit':
        this.audio.shieldHit();
        break;
      case 'netrunnerHack':
        this.audio.uiError();
        this.hud.subtitle(t('event.netrunnerHack'), 3200);
        this.hud.logLine('NETRUNNER: hack landed');
        break;
      case 'sabotage':
        this.hud.subtitle(t('event.sabotage'));
        this.hud.logLine('SABOTAGE: terminal tapped');
        break;
      case 'caseSecured':
        this.hud.subtitle(t('event.caseSecured'));
        this.hud.logLine('EXTRACTION: case secured');
        break;
      case 'objectiveComplete':
        this.hud.subtitle(t('event.objectiveComplete'));
        this.hud.logLine('OBJECTIVE: complete');
        break;
      case 'operatorDeploy':
        this.audio.alert();
        break;
      case 'exitOpen':
        this.audio.exitOpen();
        this.hud.subtitle(t('event.exitOpen'));
        this.hud.logLine('EXIT: open');
        break;
      case 'win':
        this.audio.win();
        this.state = 'win';
        this.overlayT = 0;
        this.overlayShown = false;
        this.bankClear();
        break;
      default:
        break;
    }
  }

  private bankClear(): void {
    const { reward, levelsGained } = settleRun(
      this.profile,
      this.world,
      this.currentContract,
      this.currentApproach,
    );
    if (levelsGained > 0) this.audio.levelUp();
    this.lastReward = reward;
  }

  private showResultOverlay(): void {
    if (this.state === 'dead') {
      const contract = this.currentContract;
      const { stats, note } = deathResult({
        contractTitle: contract?.title ?? null,
        time: this.world.time,
        kills: this.world.kills,
        lootValue: this.world.lootValue,
        deathCause: this.world.deathCause,
        carriedWeapon: this.startedWithWeapon || this.world.player.weapon !== 'fists',
      });
      this.hud.showResult('death', stats, note);
      return;
    }

    if (this.currentContract?.chapter === 'final' && !this.profile.data.ending) {
      this.showEndingChoice();
      return;
    }

    const r = this.lastReward;
    if (!r) return;
    const { stats, note } = winResult(r, {
      approachName: APPROACH_MAP[this.currentApproach].name,
      approachMult: APPROACH_MAP[this.currentApproach].payoutMult,
      modifierNames: (this.currentContract?.modifiers ?? []).map((id) => MODIFIER_MAP[id].name),
      final: this.currentContract?.chapter === 'final',
      money: this.profile.data.money,
      ending: this.profile.data.ending,
    });
    this.hud.showResult('win', stats, note);
  }

  private showEndingChoice(): void {
    this.endingOpen = true;
    this.hud.hideResults();
    this.endingOptions.innerHTML = ENDING_ORDER.map((id, index) => {
      const def = ENDINGS[id];
      return `<button class="ending-option" style="--ending:${def.color}" data-ending="${id}">
        <span class="ending-key">${String(index + 1).padStart(2, '0')} · ${def.kicker.replace('// ', '')}</span>
        <b>${def.title}</b>
        <small>${def.summary}</small>
        <small>${def.body[0]}</small>
      </button>`;
    }).join('');
    this.endingRoot.classList.remove('hidden');
    (this.endingOptions.querySelector('button') as HTMLButtonElement | null)?.focus();
    this.input.endFrame();
  }

  private chooseEnding(id: EndingId): void {
    if (!this.endingOpen || !ENDINGS[id]) return;
    this.endingOpen = false;
    this.profile.data.ending = id;
    this.profile.save();
    this.endingRoot.classList.add('hidden');
    this.audio.win();
    this.showResultOverlay();
    this.input.endFrame();
  }

  frame(dtRaw: number): void {
    const dt = Math.min(dtRaw, 0.05);
    const aim = this.renderer.screenToWorld(this.input.mouseX, this.input.mouseY);

    let edgesConsumed = false;
    if (this.state === 'safehouse' && !this.panelOpen && !this.manualOpen) {
      this.acc = Math.min(this.acc + dt, 0.2);
      let edge = true;
      let guard = 0;
      while (this.acc >= FIXED && guard++ < 16) {
        this.world.update(FIXED, aim, edge);
        if (edge) edgesConsumed = true;
        edge = false;
        this.acc -= FIXED;
      }
      this.updateHubPrompt();
      const station = this.nearestStation();
      if (station && this.input.wasPressed('KeyE')) this.openPanel(station.kind);
    }
    if (
      this.state === 'playing' &&
      this.currentContract?.modifiers.includes('rush') &&
      this.world.time >= 90
    ) {
      this.world.deathCause = 'TIME EXPIRED';
      this.world.player.alive = false;
      this.state = 'dead';
      this.overlayT = 0;
      this.overlayShown = false;
      this.hud.flashDamage('death');
      this.audio.death();
    }

    if (this.state === 'playing' && this.briefT > 0) {
      this.briefT = Math.max(0, this.briefT - dt);
      if (this.briefT === 0) this.briefRoot.classList.add('hidden');
      this.acc = 0;
      edgesConsumed = true;
    } else if (this.state === 'playing' || this.state === 'dead') {
      const reduced = this.settings.data.reducedMotion;
      if (!reduced && this.world.hitstop > 0) {
        this.world.hitstop = Math.max(0, this.world.hitstop - dt);
        this.world.update(dt * 0.08, aim, true);
        edgesConsumed = true;
      } else {
        const scale = this.state === 'dead' && !reduced ? 0.32 : 1;
        this.acc = Math.min(this.acc + dt * scale, 0.2);
        let edge = true;
        let guard = 0;
        while (this.acc >= FIXED && guard++ < 16) {
          this.world.update(FIXED, aim, edge);
          if (edge) edgesConsumed = true;
          edge = false;
          this.acc -= FIXED;
        }
      }
    }

    if (this.state === 'dead' || this.state === 'win') {
      this.overlayT += dt;
      const delay = this.state === 'dead' ? deathDelay : winDelay;
      if (!this.overlayShown && this.overlayT >= delay) {
        this.overlayShown = true;
        this.showResultOverlay();
      }
    }

    if (this.state !== 'safehouse') {
      const p = this.world.player;
      this.hud.setStats(
        this.world.aliveEnemies,
        p.weapon,
        p.variant,
        p.attachment,
        p.clip,
        p.ammo,
        p.reloadT > 0,
        this.world.time,
        this.world.lootValue,
        p.armor,
        p.maxArmor,
        this.world.exitOpen,
        this.state === 'playing' ? this.world.promptText() : null,
      );
      this.hud.setHacked(p.hackedT > 0);
      this.hud.setObjective(
        this.currentContract?.title ?? 'OBJECTIVE',
        this.world.objectiveText(),
        this.world.exitOpen,
      );
      const supply = p.supplyType
        ? `${CONSUMABLE_MAP[p.supplyType].name} ×${p.supplyCharges}`
        : '';
      this.hud.setConsumable(supply, !!p.supplyType && p.supplyCharges > 0);
      const boss = this.world.boss;
      this.hud.setBoss(
        this.world.bossName,
        boss?.armor ?? 0,
        boss?.maxArmor ?? 0,
        !!boss && boss.alive && this.state === 'playing',
        boss ? Math.max(1, boss.maxArmor - boss.armor + 1) : 1,
      );
      if (this.world.shotsHit > this.lastShotsHit || this.world.kills > this.lastKills) {
        this.hud.hitmarker(this.world.kills > this.lastKills);
        this.lastShotsHit = this.world.shotsHit;
        this.lastKills = this.world.kills;
      }
      const approachDef = APPROACH_MAP[this.currentApproach];
      if (approachDef.id === 'blackout') {
        const screen = this.renderer.worldToScreen(p.x, p.y);
        this.approachVignette.style.setProperty('--px', `${screen.x}px`);
        this.approachVignette.style.setProperty('--py', `${screen.y}px`);
      }
      this.hud.setApproach(
        approachDef.id === 'standard' ? '' : approachDef.name,
        approachDef.color,
      );
      this.hud.setHeat(this.world.heat);
      this.audio.setIntensity(this.world.heat / 100);
      this.hud.setAbilities(this.world.abilitySlots());
      this.hud.setPsychosis(
        this.profile.humanityStage,
        this.profile.humanityInfo().label,
      );
      const spread =
        1 +
        Math.min(
          0.38,
          (p.attackCd > 0 ? p.attackCd * 0.9 : 0) + WEAPONS[p.weapon].spread * 1.8,
        );
      this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, this.state === 'playing', spread);
      const ex = this.world.level.exit.x - p.x;
      const ey = this.world.level.exit.y - p.y;
      const exitDeg = 90 - (Math.atan2(ey, ex) * 180) / Math.PI;
      this.hud.exitPointer(
        exitDeg,
        Math.round(Math.hypot(ex, ey) / 64),
        this.world.exitOpen && this.state === 'playing' && p.alive,
      );
    }

    this.renderer.sync(this.world, dt);
    // A 165 Hz display can render frames without a fixed 120 Hz sim step.
    // Keep edge-triggered input pending until a step actually consumes it.
    if (edgesConsumed || (this.state !== 'playing' && this.state !== 'dead')) {
      this.input.endFrame();
    }
  }
}
