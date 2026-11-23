import { AudioEngine } from '../core/audio';
import { districtFor } from './districts';
import type { LifepathId } from './lifepath';
import { CHALLENGE_MAP, type ChallengeId } from './challenges';
import { Input } from '../core/input';
import { Settings } from '../core/settings';
import { randomSeed, seedLabel } from '../core/math';
import { setLocale, t } from '../core/i18n';
import { resolveKeymap } from '../core/settings';
import { Hub } from '../ui/hub';
import { BossIntro } from '../ui/boss-intro';
import { SettingsPanel } from '../ui/settings-panel';
import { BreachController } from '../ui/breach-controller';
import { Renderer } from '../render/renderer';
import { Hud } from '../ui/hud';
import { Safehouse } from '../ui/safehouse';
import { LayoutId, Level, loadLevel, Station, StationKind } from './map';
import { CONSUMABLE_MAP } from './consumables';
import { Contract, objectiveText } from './missions';
import { buildBoard } from './campaign';
import { BOSSES } from './bosses';
import { BOSS_DIALOGUE, FACTIONS, authoredDialogue, dialogueCheckLabel, dialogueCheckMet, handlerLine, localizeDialogue, type DialogueLine } from './lore';
import { DialogueSession } from './dialogue-session';
import { availableEndings, endingUnlocked, ENDINGS, type EndingId } from './endings';
import { BOONS, type RunBoon } from './boons';

import { APPROACH_MAP, ApproachId } from './attributes';
import { MODIFIER_MAP } from './modifiers';
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

type GameState = 'safehouse' | 'playing' | 'paused' | 'breach' | 'dead' | 'win';

export class Game {
  private readonly input = new Input();
  private readonly settings = new Settings();
  private readonly audio = new AudioEngine();
  private readonly renderer: Renderer;
  private readonly hud = new Hud();
  private readonly pauseRoot = document.getElementById('overlay-pause')!;
  private readonly pauseSettingsEl = document.getElementById('pause-settings')!;
  private readonly manualRoot = document.getElementById('overlay-manual')!;
  private readonly tourRoot = document.getElementById('overlay-tour')!;
  private readonly briefRoot = document.getElementById('overlay-brief')!;
  private readonly approachVignette = document.getElementById('approach-vignette')!;
  private readonly screenTransition = document.getElementById('screen-transition')!;
  private readonly briefKicker = document.getElementById('brief-kicker')!;
  private readonly briefTitle = document.getElementById('brief-title')!;
  private readonly briefFaction = document.getElementById('brief-faction')!;
  private readonly briefObjective = document.getElementById('brief-objective')!;
  private readonly briefHandler = document.getElementById('brief-handler')!;
  private readonly dialogueRoot = document.getElementById('overlay-dialogue')!;
  private readonly dialogueKickerEl = document.getElementById('dialogue-kicker')!;
  private readonly dialogueSpeakerEl = document.getElementById('dialogue-speaker')!;
  private readonly dialogueTextEl = document.getElementById('dialogue-text')!;
  private readonly dialogueProgressEl = document.getElementById('dialogue-progress')!;
  private readonly dialogueNextEl = document.getElementById('dialogue-next') as HTMLButtonElement;
  private readonly dialogueChoicesEl = document.getElementById('dialogue-choices')!;
  private readonly endingRoot = document.getElementById('overlay-ending')!;
  private readonly endingOptions = document.getElementById('ending-options')!;
  private readonly epilogueRoot = document.getElementById('overlay-epilogue')!;
  private readonly epilogueKicker = document.getElementById('epilogue-kicker')!;
  private readonly epilogueTitle = document.getElementById('epilogue-title')!;
  private readonly epilogueBody = document.getElementById('epilogue-body')!;
  private readonly abandonBtn = document.querySelector<HTMLButtonElement>(
    '#overlay-pause [data-act="abandon"]',
  )!;
  private readonly hub = new Hub();
  private readonly bossIntro = new BossIntro();
  private readonly settingsPanel = new SettingsPanel(this.settings, () => this.applySettings());
  private readonly breach = new BreachController(this.input, {
    onFinish: (success, nodeId, hazard, reward) =>
      this.finishBreach(success, nodeId, hazard, reward),
    onClick: () => this.audio.uiClick(),
    onError: () => this.audio.uiError(),
  });
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
  private currentChallenge: ChallengeId = 'standard';
  private pendingRun: {
    contract: Contract;
    approachId: ApproachId;
    challenge: ChallengeId;
  } | null = null;
  private currentBoons: RunBoon[] = [];
  private dialogueOpen = false;
  private dialogueSession: DialogueSession | null = null;
  private lastShotsHit = 0;
  private lastKills = 0;
  private startedWithWeapon = false;
  private lastReward: RewardSummary | null = null;
  private lastDeathInsured = false;
  private lastDeathInsuredWeapon: string | null = null;
  private deathRecorded = false;
  private manualOpen = false;
  private tourOpen = false;
  private endingOpen = false;
  private epilogueOpen = false;
  private panelOpen = false;
  private recoveryNote: string | null = null;
  private abandonArmed = false;
  private abandonTimer: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.profile = new Profile();
    this.recoveryNote = this.profile.recoveryNote();
    this.safehouse = new Safehouse(this.profile, {
      onDeploy: (contractId, approachId, challenge) =>
        this.startRun(contractId, approachId, challenge),
      onClick: () => {
        this.audio.unlock();
        this.audio.uiClick();
      },
      onError: () => {
        this.audio.unlock();
        this.audio.uiError();
      },
      onReroll: () => this.rerollBoard(),
      onNewGame: (lifepath, plus) => this.startNewGame(lifepath, plus),
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
    this.settingsPanel.sync();
    if (!this.settings.data.tutorialSeen) this.showManual();
    else if (!this.settings.data.tourSeen) this.showTour();
  }

  private rollBoard(): Contract[] {
    this.profile.ensureDaily();
    const board = [this.profile.dailyContract(), ...buildBoard(this.profile, randomSeed())];
    if (this.profile.data.ngPlus <= 0) return board;
    return board.map((contract) => ({
      ...contract,
      modifiers: Array.from(
        new Set([...contract.modifiers, 'elite' as const, 'overclocked' as const]),
      ),
    }));
  }

  private startNewGame(lifepath: LifepathId, plus = false): void {
    this.profile.startNewGame(lifepath, plus);
    this.returnToSafehouse();
    if (!this.settings.data.tutorialSeen) this.showManual();
  }

  private rerollBoard(): Contract[] | null {
    const cost = this.profile.boardRefreshCost();
    if (this.profile.data.money < cost) return null;
    this.profile.data.money -= cost;
    this.profile.save();
    this.contracts = this.rollBoard();
    this.currentContract = this.contracts[0] ?? null;
    this.hub.updateStats(this.profile.data);
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
    this.hub.show();
    this.safehouse.hide();
    this.hud.setVisible(false);
    this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, false);
    this.hub.updateStats(this.profile.data);
    this.updateHubPrompt();
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
    this.hub.updatePrompt(this.nearestStation(), this.recoveryNote);
  }

  private openPanel(kind?: StationKind): void {
    if (this.state !== 'safehouse' || this.panelOpen) return;
    this.panelOpen = true;
    this.hub.hide();
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
    this.hub.show();
    this.hub.updateStats(this.profile.data);
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
        bossRush: contract.bossRush,
        ngPlus: this.profile.data.ngPlus,
        boons: config.boons,
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
      document.getElementById(id)!.addEventListener('click', (event) => {
        if (this.state !== 'dead' && this.state !== 'win') return;
        const newGame = (event.target as HTMLElement).closest<HTMLElement>(
          '[data-act="win-new-game"]',
        );
        this.returnToSafehouse();
        if (newGame) this.safehouse.openNewGame();
      });
    }

    this.dialogueRoot.addEventListener('click', (ev) => {
      const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-act], [data-choice]');
      const act = target?.dataset.act;
      if (act === 'dialogue-next') this.advanceDialogue();
      else if (act === 'dialogue-cancel') this.cancelDialogue();
      else if (target?.dataset.choice) this.chooseDialogue(target.dataset.choice);
    });
    this.endingRoot.addEventListener('click', (ev) => {
      const id = (ev.target as HTMLElement).closest<HTMLElement>('[data-ending]')?.dataset
        .ending;
      if (id) this.chooseEnding(id as EndingId);
    });
    document.getElementById('overlay-breach')!.addEventListener('click', (ev) => this.breach.handleClick(ev));
    this.epilogueRoot.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('[data-act="epilogue-next"]')) {
        this.finishEpilogue();
      }
    });
    this.tourRoot.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('[data-act="tour-close"]')) {
        this.closeTour();
      }
    });
    this.pauseRoot.addEventListener('click', (ev) => this.handlePauseClick(ev));
    this.manualRoot.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('[data-act="close-manual"]')) this.closeManual();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.audio.toggleMute();
        return;
      }
      if (this.tourOpen) {
        if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.closeTour();
        }
        return;
      }
      if (this.state === 'breach') {
        if (e.code === 'Escape') {
          e.preventDefault();
          this.breach.finish(false);
        }
        return;
      }
      if (this.dialogueOpen) {
        const choiceIndex = [
          'Digit1',
          'Digit2',
          'Digit3',
          'Digit4',
          'Digit5',
          'Digit6',
          'Digit7',
          'Digit8',
        ].indexOf(e.code);
        if (e.code === 'Escape') {
          e.preventDefault();
          this.cancelDialogue();
        } else if (choiceIndex >= 0) {
          const choice = this.dialogueSession?.current?.choices?.[choiceIndex];
          if (choice) {
            e.preventDefault();
            this.chooseDialogue(choice.id);
          }
        } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
          e.preventDefault();
          this.advanceDialogue();
        }
        return;
      }
      if (this.epilogueOpen) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          this.finishEpilogue();
        }
        return;
      }
      if (this.endingOpen) {
        const endings = availableEndings(this.profile.data);
        const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
        if (index >= 0) {
          e.preventDefault();
          const id = endings[index];
          if (id) this.chooseEnding(id);
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

  private menuIsOpen(): boolean {
    return (
      this.state === 'paused' ||
      this.state === 'dead' ||
      this.state === 'win' ||
      this.state === 'breach' ||
      this.dialogueOpen ||
      this.manualOpen ||
      this.tourOpen ||
      this.endingOpen ||
      this.epilogueOpen ||
      (this.state === 'safehouse' && this.panelOpen)
    );
  }

  private pollMenuNavigation(): void {
    if (!this.menuIsOpen()) return;
    const overlays = Array.from(
      document.querySelectorAll<HTMLElement>('.overlay:not(.hidden)'),
    );
    const root = overlays.at(-1);
    if (!root) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])',
      ),
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    let index = active ? items.indexOf(active) : -1;
    if (index < 0) {
      items[0].focus();
      index = 0;
    }
    if (this.input.wasPressed('MenuDown') || this.input.wasPressed('MenuRight')) {
      items[(index + 1) % items.length].focus();
    } else if (this.input.wasPressed('MenuUp') || this.input.wasPressed('MenuLeft')) {
      items[(index - 1 + items.length) % items.length].focus();
    } else if (this.input.wasPressed('MenuAccept')) {
      if (active && root.contains(active)) active.click();
      else items[0].click();
    } else if (this.input.wasPressed('MenuBack')) {
      if (this.state === 'dead' || this.state === 'win') {
        this.returnToSafehouse();
      } else {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }),
        );
      }
    }
  }

  private applySettings(): void {
    const reduced = this.settings.data.reducedMotion;
    this.input.setKeymap(
      resolveKeymap(this.settings.data.controls, this.settings.data.keymap),
    );
    this.audio.setVolume(this.settings.data.volume);
    this.renderer.setShakeScale(reduced ? 0 : this.settings.data.shake);
    this.renderer.setBloomScale(this.settings.data.bloom);
    this.renderer.setConesVisible(this.settings.data.cones);
    this.renderer.setWeatherEnabled(this.settings.data.weather);
    this.renderer.setReducedMotion(reduced);
    this.renderer.setPalette(this.settings.data.palette);
    setLocale(this.settings.data.locale);
    document.documentElement.lang = this.settings.data.locale;
    if (this.panelOpen) this.safehouse.render();
    this.hud.setFlashEnabled(this.settings.data.flash && !reduced);
    this.hud.setSubtitlesEnabled(this.settings.data.subtitles);
    this.hud.setLogEnabled(this.settings.data.dialogueLog);
    document.body.dataset.palette = this.settings.data.palette;
    document.body.classList.toggle('no-scanlines', !this.settings.data.scanlines);
    document.body.classList.toggle('reduced-motion', reduced);
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
    this.settingsPanel.sync();
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
        this.settingsPanel.sync();
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
    if (!this.settings.data.tourSeen && this.state === 'safehouse') this.showTour();
  }

  private showTour(): void {
    this.tourOpen = true;
    this.tourRoot.classList.remove('hidden');
  }

  private closeTour(): void {
    this.tourOpen = false;
    this.tourRoot.classList.add('hidden');
    this.settings.set('tourSeen', true);
  }

  private startRun(
    contractId: string,
    approachId: ApproachId = 'standard',
    challenge: ChallengeId = 'standard',
  ): void {
    const contract = this.contracts.find((c) => c.id === contractId) ?? this.currentContract;
    if (!contract || contract.locked) return;
    this.audio.unlock();
    if (contract.objective === 'boss') {
      this.pendingRun = { contract, approachId, challenge };
      const boss = contract.bossId ? BOSSES[contract.bossId] : null;
      const es = this.settings.data.locale === 'es';
      const dialogueLines: DialogueLine[] =
        contract.bossId === 'psycho' || !boss
          ? BOSS_DIALOGUE
          : [
              {
                speaker: 'MOTH',
                text: es ? `${boss.name}. ${boss.blurbEs}` : `${boss.name}. ${boss.blurb}`,
              },
              {
                speaker: 'KESTREL',
                text: es
                  ? contract.chapter === 'final'
                    ? '¿Y después del consejo, qué queda?'
                    : '¿Y la salida?'
                  : contract.chapter === 'final'
                    ? 'And after the board, what is left?'
                    : 'And the exit?',
              },
              {
                speaker: 'MOTH',
                text: es
                  ? contract.chapter === 'final'
                    ? 'Lo que decidas. La correa termina aquí.'
                    : 'Hay una salida. Llega. Mantendré las luces encendidas.'
                  : contract.chapter === 'final'
                    ? 'Whatever you decide. The leash ends here.'
                    : 'There is an exit. Reach it. I will keep the lights on.',
              },
            ];
      this.dialogueSession = new DialogueSession(
        localizeDialogue(dialogueLines, this.settings.data.locale),
      );
      this.dialogueKickerEl.textContent = `// BOSS BRIEFING · ${FACTIONS[contract.faction].name}`;
      this.dialogueOpen = true;
      this.dialogueRoot.classList.remove('hidden');
      this.renderDialogue();
      this.input.endFrame();
      return;
    }
    if (contract.authored) {
      this.pendingRun = { contract, approachId, challenge };
      this.dialogueSession = new DialogueSession(
        authoredDialogue(
          contract,
          this.profile.data.story,
          this.profile.data.role,
          this.profile.data.lifepath,
          this.settings.data.locale,
        ),
      );
      this.dialogueKickerEl.textContent = `// PRE-OP BRIEFING · ${FACTIONS[contract.faction].name}`;
      this.dialogueOpen = true;
      this.dialogueRoot.classList.remove('hidden');
      this.renderDialogue();
      this.input.endFrame();
      return;
    }
    this.commitRun(contract, approachId, [], challenge);
  }

  private finishBreach(
    success: boolean,
    nodeId: number,
    hazard: 'camera' | 'turret' | null,
    reward: number,
  ): void {
    this.state = 'playing';
    if (hazard) this.world.resolveHazardBreach(hazard, nodeId, success);
    else this.world.resolveBreach(nodeId, success);
    if (success) {
      this.profile.data.money += reward;
      this.profile.addComponent(1);
      this.profile.save();
    }
    this.input.endFrame();
  }

  private commitRun(
    contract: Contract,
    approachId: ApproachId,
    boons: RunBoon[] = [],
    challenge: ChallengeId = 'standard',
  ): void {
    const effective: Contract = {
      ...contract,
      challenge,
      modifiers:
        challenge === 'rush' && !contract.modifiers.includes('rush')
          ? [...contract.modifiers, 'rush']
          : contract.modifiers,
    };
    this.currentContract = effective;
    this.currentApproach = approachId;
    this.currentChallenge = challenge;
    this.currentBoons = boons;
    this.profile.data.challenge = challenge;
    this.profile.save();
    this.audio.unlock();
    const loadout = this.profile.beginRun(challenge === 'fists');
    this.startedWithWeapon = loadout.weapon !== 'fists';
    this.beginMission({
      contract: effective,
      approach: approachId,
      seed: effective.seed,
      loadout,
      boons,
    });
  }

  private renderDialogue(): void {
    const session = this.dialogueSession;
    const line = session?.current;
    if (!session || !line) return;
    this.dialogueSpeakerEl.textContent = line.speaker;
    this.dialogueSpeakerEl.style.color =
      line.speaker === 'MOTH' ? 'var(--cyan)' : 'var(--magenta)';
    this.dialogueTextEl.textContent = line.text;
    this.dialogueProgressEl.textContent = `${session.index + 1} / ${session.lines.length}`;
    const hasChoices = session.hasChoices;
    this.dialogueNextEl.style.display = hasChoices ? 'none' : '';
    this.dialogueNextEl.textContent = session.atEnd ? 'DEPLOY' : 'CONTINUE';
    this.dialogueChoicesEl.innerHTML = hasChoices
      ? line.choices!
          .map((choice) => {
            const met = dialogueCheckMet(
              choice.check,
              this.profile.data.attributes,
              this.profile.data.reputation,
              this.profile.data.role,
              this.profile.data.lifepath,
            );
            const checkLabel = choice.check
              ? `<small>${dialogueCheckLabel(choice.check)}${met ? ' · READY' : ' · LOCKED'}</small>`
              : '';
            const repLabel = choice.reputation
              ? Object.entries(choice.reputation)
                  .map(([faction, delta]) => {
                    const name = FACTIONS[faction as keyof typeof FACTIONS].name.split(' ')[0];
                    return `${name} ${delta > 0 ? '+' : ''}${delta}`;
                  })
                  .join(' · ')
              : '';
            const consequence = repLabel ? `<small>${repLabel}</small>` : '';
            return `<button class="dialogue-choice" data-choice="${choice.id}" ${
              met ? '' : 'disabled'
            }><span>${choice.label}</span>${checkLabel}${consequence}</button>`;
          })
          .join('')
      : '';
    this.hud.logLine(`${line.speaker}: ${line.text}`);
    this.hud.subtitle(`${line.speaker}: ${line.text}`, 4200);
  }

  private advanceDialogue(): void {
    const session = this.dialogueSession;
    if (!this.dialogueOpen || !session) return;
    if (session.hasChoices) return;
    this.audio.uiClick();
    if (!session.atEnd) {
      session.advance();
      this.renderDialogue();
      return;
    }
    const pending = this.pendingRun;
    const boons = [...session.boons];
    this.closeDialogue();
    if (pending) {
      this.commitRun(pending.contract, pending.approachId, boons, pending.challenge);
    }
  }

  private chooseDialogue(choiceId: string): void {
    const session = this.dialogueSession;
    const pending = this.pendingRun;
    if (!this.dialogueOpen || !session || !pending) return;
    const result = session.choose(choiceId, this.profile, pending.contract.faction);
    if (!result.ok) {
      this.audio.uiError();
      return;
    }
    this.audio.uiClick();
    if (result.boon) {
      this.hud.logLine(`BOON: ${BOONS[result.boon].label} — ${BOONS[result.boon].desc}`);
    }
    if (result.reputation.length > 0) {
      this.hud.logLine(
        `STANDING: ${result.reputation
          .map(([faction, delta]) => `${FACTIONS[faction].name.split(' ')[0]} ${delta > 0 ? '+' : ''}${delta}`)
          .join(' · ')}`,
      );
    }
    this.renderDialogue();
  }

  private closeDialogue(): void {
    this.dialogueOpen = false;
    this.dialogueSession = null;
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
    this.beginMission({
      contract,
      approach: this.currentApproach,
      seed: contract.seed,
      loadout,
      boons: this.currentBoons,
    });
  }

  private beginMission(config: RunConfig): void {
    const { contract, approach } = config;
    this.currentContract = contract;
    this.currentApproach = approach;
    this.currentChallenge = contract.challenge ?? 'standard';
    this.manualOpen = false;
    this.manualRoot.classList.add('hidden');
    this.tourOpen = false;
    this.tourRoot.classList.add('hidden');
    this.endingOpen = false;
    this.epilogueOpen = false;
    this.endingRoot.classList.add('hidden');
    this.epilogueRoot.classList.add('hidden');
    this.world = this.createWorld(config);
    this.renderer.bind(this.world);
    if (contract.objective === 'boss') {
      this.bossIntro.show(
        '// BOSS ENCOUNTER',
        this.world.bossName,
        contract.bossRush ? 'BOSS RUSH' : contract.title,
      );
    }
    this.acc = 0;
    this.overlayT = 0;
    this.overlayShown = false;
    this.lastReward = null;
    this.lastDeathInsured = false;
    this.deathRecorded = false;
    this.state = 'playing';
    this.world.player.invulnT = 1.2;
    if (contract.challenge === 'glass') {
      this.world.player.armor = 0;
      this.world.player.maxArmor = 0;
      this.world.player.revived = true;
    }
    this.audio.setAmbience(districtFor(contract.layoutId).ambience);
    this.audio.setFaction(contract.faction);
    this.audio.setBossMode(contract.objective === 'boss' || contract.chapter === 'final');
    this.panelOpen = false;
    this.hub.hide();
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
    const boons = this.currentBoons.map((id) => BOONS[id].label).join(' · ');
    const seed = seedLabel(contract.seed);
    const challenge = contract.challenge && contract.challenge !== 'standard'
      ? CHALLENGE_MAP[contract.challenge].name
      : '';
    this.briefKicker.textContent = `// ${contract.risk} RISK · ${contract.layoutName} · ${approach.name}${
      this.profile.data.ngPlus > 0 ? ` · NG+${this.profile.data.ngPlus}` : ''
    }${challenge ? ` · ${challenge}` : ''}${mods ? ` · ${mods}` : ''}${boons ? ` · ${boons}` : ''} · SEED ${seed}`;
    this.briefRoot.dataset.seed = seed;
    this.briefTitle.textContent = contract.title;
    this.briefFaction.textContent = faction.name;
    this.briefFaction.style.color = faction.color;
    this.briefObjective.textContent = objectiveText(contract);
    this.briefHandler.textContent = `MOTH: ${handlerLine(contract.faction, contract.title.length, this.settings.data.locale)}`;
    this.hud.logLine(`MOTH: ${handlerLine(contract.faction, contract.title.length, this.settings.data.locale)}`);
    this.briefRoot.classList.remove('hidden');
    this.briefT = 1.5;
  }

  private returnToSafehouse(): void {
    this.audio.setAmbience('none');
    this.audio.setBossMode(false);
    this.audio.setFaction('market');
    this.audio.setIntensity(0);
    this.currentBoons = [];
    this.hud.setHacked(false);
    this.bossIntro.hide();
    this.state = 'safehouse';
    this.pauseRoot.classList.add('hidden');
    this.manualRoot.classList.add('hidden');
    this.manualOpen = false;
    this.endingRoot.classList.add('hidden');
    this.endingOpen = false;
    this.epilogueRoot.classList.add('hidden');
    this.epilogueOpen = false;
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
    this.profile.clearInsurance();
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
        this.audio.combo(this.world.combo);
        this.profile.addComponent(
          Math.random() < this.profile.data.perks.scavenger * 0.25 ? 2 : 1,
        );
        break;
      case 'stealthKill':
        this.audio.stealthKill();
        this.audio.combo(this.world.combo);
        this.profile.addComponent(
          Math.random() < this.profile.data.perks.scavenger * 0.25 ? 2 : 1,
        );
        break;
      case 'execution':
        this.audio.execution();
        this.hud.subtitle(t('event.execution'));
        this.hud.logLine('EXECUTION: stunned hostile finished');
        break;
      case 'dash':
        this.audio.dash();
        break;
      case 'quickhack':
        this.audio.quickhack();
        this.hud.subtitle(t('event.quickhack'));
        this.hud.logLine('QUICKHACK: target rebooted');
        break;
      case 'quickhackFail':
        this.audio.quickhackFail();
        this.hud.subtitle(t('event.quickhackFail'), 1600);
        break;
      case 'glassBreak':
        this.audio.glassBreak();
        break;
      case 'medicHeal':
        this.audio.medicHeal();
        this.hud.logLine('MEDIC: ally plate restored');
        break;
      case 'houndLeap':
        this.audio.houndLeap();
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
        const policy = this.profile.data.insurance;
        this.lastDeathInsuredWeapon = policy ? WEAPONS[policy.weapon].name : null;
        this.lastDeathInsured = !!this.profile.claimInsurance();
        if (!this.deathRecorded) {
          this.deathRecorded = true;
          this.profile.recordRun({
            title: this.currentContract?.title ?? 'UNKNOWN CONTRACT',
            layoutName: this.currentContract?.layoutName ?? '',
            time: this.world.time,
            kills: this.world.kills,
            payout: 0,
            rank: '—',
            success: false,
            daily: this.currentContract?.daily === true,
            challenge: this.currentContract?.challenge ?? this.currentChallenge,
          });
        }
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
      case 'doorLocked':
        this.audio.uiError();
        this.hud.logLine('DOOR SEALED — KICK TO BREACH');
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
      case 'breachStart':
        if (this.state === 'playing' && e.nodeId !== undefined) {
          this.state = 'breach';
          this.breach.open(
            e.nodeId,
            e.hazard ?? null,
            (this.world.seed ^ Math.imul(e.nodeId, 0x9e3779b1)) >>> 0,
          );
        }
        break;
      case 'breachSuccess':
        this.hud.subtitle('BREACH COMPLETE — SECURITY LOOPED');
        this.hud.logLine('BREACH: security looped');
        this.audio.win();
        break;
      case 'breachFail':
        this.hud.subtitle('BREACH FAILED — SECTOR ALERTED');
        this.hud.logLine('BREACH: failed');
        this.audio.uiError();
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
      case 'bossRushWave':
        this.bossIntro.show('// NEXT BOSS', this.world.bossName, `WAVE ${e.wave}/${e.total}`);
        this.audio.alert();
        this.audio.setBossMode(true);
        this.hud.subtitle(`BOSS RUSH ${e.wave}/${e.total} — ${this.world.bossName}`, 4000);
        this.hud.logLine(`BOSS RUSH: wave ${e.wave}/${e.total} — ${this.world.bossName}`);
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
        insured: this.lastDeathInsured,
        insuredWeapon: this.lastDeathInsuredWeapon,
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
    this.epilogueOpen = false;
    this.hud.hideResults();
    this.endingOptions.innerHTML = availableEndings(this.profile.data).map((id, index) => {
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
    if (!this.endingOpen || !ENDINGS[id] || !endingUnlocked(id, this.profile.data)) return;
    this.endingOpen = false;
    this.epilogueOpen = true;
    this.profile.recordEnding(id);
    this.profile.data.ending = id;
    this.profile.save();
    this.endingRoot.classList.add('hidden');
    this.epilogueKicker.textContent = ENDINGS[id].kicker;
    this.epilogueTitle.textContent = ENDINGS[id].title;
    this.epilogueBody.innerHTML = ENDINGS[id].body.map((p) => `<p>${p}</p>`).join('');
    this.epilogueRoot.classList.remove('hidden');
    this.audio.win();
    this.input.endFrame();
  }

  private finishEpilogue(): void {
    if (!this.epilogueOpen) return;
    this.epilogueOpen = false;
    this.epilogueRoot.classList.add('hidden');
    this.showResultOverlay();
    this.input.endFrame();
  }

  frame(dtRaw: number): void {
    const dt = Math.min(dtRaw, 0.05);
    this.input.pollGamepad(dt);
    this.pollMenuNavigation();
    if (this.input.wasPressed('Pause')) {
      if (this.state === 'playing') this.pauseGame();
      else if (this.state === 'paused') this.resumeGame();
    }
    const aim = this.renderer.screenToWorld(this.input.mouseX, this.input.mouseY);

    if (this.state === 'breach') {
      this.breach.tick(dt);
      this.renderer.sync(this.world, dt);
      this.input.endFrame();
      return;
    }

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
      this.hud.setCombo(this.world.combo, this.world.comboT, this.world.comboMax);
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
