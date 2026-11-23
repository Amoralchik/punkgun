import { AudioEngine } from '../core/audio';
import { districtFor } from './districts';
import type { LifepathId } from './lifepath';
import type { ChallengeId } from './challenges';
import { Input } from '../core/input';
import { Settings } from '../core/settings';
import { randomSeed, seedLabel } from '../core/math';
import { setLocale, t } from '../core/i18n';
import { resolveKeymap } from '../core/settings';
import { Hub } from '../ui/hub';
import { BossIntro } from '../ui/boss-intro';
import { BossPhaseOverlay } from '../ui/boss-phase';
import { MissionBrief } from '../ui/mission-brief';
import { SettingsPanel } from '../ui/settings-panel';
import { BreachController } from '../ui/breach-controller';
import { DialogueController } from '../ui/dialogue-controller';
import { EndingController } from '../ui/ending-controller';
import { PauseController } from '../ui/pause-controller';
import { MenuNavigation } from '../ui/menu-navigation';
import { RunLauncher } from './run-launcher';
import { Renderer } from '../render/renderer';
import { Hud } from '../ui/hud';
import { Safehouse } from '../ui/safehouse';
import { LayoutId, Level, loadLevel, Station, StationKind } from './map';
import type { Contract } from './missions';
import { buildBoard } from './campaign';
import { DialogueSession } from './dialogue-session';
import { FACTIONS, authoredDialogue, bossBriefing, localizeDialogue } from './lore';
import { availableEndings, type EndingId } from './endings';
import type { RunBoon } from './boons';

import type { ApproachId } from './attributes';
import { Profile } from './profile';
import { RunConfig } from './run';
import { World } from './world';
import type { WorldEvent } from './world-types';
import type { RewardSummary } from './results';
import { buildResult } from './result-flow';
import { playWorldEventAudio } from './world-event-audio';
import { WorldEventHud } from './world-event-hud';
import { CombatEventFeedback } from './combat-event-feedback';
import { RunStateEvents } from './run-state-events';
import { BossEventFeedback } from './boss-event-feedback';
import { syncHud } from './hud-sync';
import { buildMissionSpec } from './mission-spec';
import { createHubWorld, nearestStation } from './hub-flow';
import { GameStateMachine, type GameState } from './game-state';
import { FrameShell } from './frame-shell';
import { KeyboardController } from '../ui/keyboard-controller';
import { stepWorld } from './frame-step';
import { advanceFrame } from './frame-orchestrator';
import { settleRun } from './settlement';


export class Game {
  private readonly input = new Input();
  private readonly settings = new Settings();
  private readonly audio = new AudioEngine();
  private readonly renderer: Renderer;
  private readonly hud = new Hud();
  private readonly eventHud = new WorldEventHud(this.hud, this.audio);
  private readonly combatEvents: CombatEventFeedback;
  private readonly runEvents: RunStateEvents;
  private readonly bossEvents: BossEventFeedback;
  private readonly approachVignette = document.getElementById('approach-vignette')!;
  private readonly screenTransition = document.getElementById('screen-transition')!;
  private readonly hub = new Hub();
  private readonly bossIntro = new BossIntro();
  private readonly bossPhase = new BossPhaseOverlay();
  private readonly brief = new MissionBrief();
  private readonly settingsPanel = new SettingsPanel(this.settings, () => this.applySettings());
  private readonly breach = new BreachController(this.input, {
    onFinish: (success, nodeId, hazard, reward) =>
      this.finishBreach(success, nodeId, hazard, reward),
    onClick: () => this.audio.uiClick(),
    onError: () => this.audio.uiError(),
  });
  private readonly profile: Profile;
  private readonly dialogue: DialogueController;
  private readonly ending: EndingController;
  private readonly pause: PauseController;
  private readonly menu: MenuNavigation;
  private readonly frameShell: FrameShell;
  private readonly keyboard: KeyboardController;
  private readonly launcher: RunLauncher;
  private readonly safehouse: Safehouse;
  private readonly levelCache = new Map<LayoutId, Level>();
  private contracts: Contract[] = [];
  private currentContract: Contract | null = null;
  private world: World;
  private readonly phase = new GameStateMachine();
  private acc = 0;
  private overlayT = 0;
  private overlayShown = false;
  private briefT = 0;
  private currentApproach: ApproachId = 'standard';
  private currentChallenge: ChallengeId = 'standard';
  private currentBoons: RunBoon[] = [];
  private lastShotsHit = 0;
  private lastKills = 0;
  private startedWithWeapon = false;
  private lastReward: RewardSummary | null = null;
  private panelOpen = false;
  private recoveryNote: string | null = null;

  private get state(): GameState {
    return this.phase.state;
  }

  private set state(next: GameState) {
    if (!this.phase.transition(next)) {
      console.warn(`PUNKGUN invalid state transition: ${this.phase.state} -> ${next}`);
    }
  }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.profile = new Profile();
    this.combatEvents = new CombatEventFeedback(this.audio, this.hud, this.profile, () => this.world);
    this.bossEvents = new BossEventFeedback(
      this.audio,
      this.hud,
      this.bossPhase,
      this.bossIntro,
      () => this.world.bossName,
    );
    this.runEvents = new RunStateEvents(this.profile, this.audio, this.hud, {
      world: () => this.world,
      contract: () => this.currentContract,
      challenge: () => this.currentChallenge,
      onDeath: () => {
        this.state = 'dead';
        this.overlayT = 0;
        this.overlayShown = false;
      },
      onWin: () => {
        this.state = 'win';
        this.overlayT = 0;
        this.overlayShown = false;
        this.bankClear();
      },
    });
    this.menu = new MenuNavigation(
      this.input,
      () => this.menuIsOpen(),
      () => this.menuBack(),
    );
    this.frameShell = new FrameShell(this.input, this.menu);
    this.pause = new PauseController({
      onResume: () => this.resumeGame(),
      onSettingsSync: () => this.settingsPanel.sync(),
      onManual: () => this.showManual(),
      onAbandon: () => this.handleAbandon(),
      onManualClosed: () => {
        if (!this.settings.data.tutorialSeen) this.settings.set('tutorialSeen', true);
        if (!this.settings.data.tourSeen && this.state === 'safehouse') this.showTour();
      },
      onTourClosed: () => this.settings.set('tourSeen', true),
    });
    this.ending = new EndingController(this.profile, {
      hideResults: () => this.hud.hideResults(),
      onWin: () => this.audio.win(),
      onFinish: () => this.showResultOverlay(),
    });
    this.dialogue = new DialogueController(this.profile, {
      onDeploy: (boons) => this.launcher.deploy(boons),
      onLog: (text) => this.hud.logLine(text),
      onSubtitle: (text, duration) => this.hud.subtitle(text, duration),
      onClick: () => this.audio.uiClick(),
      onError: () => this.audio.uiError(),
    });
    this.launcher = new RunLauncher({
      contracts: () => this.contracts,
      currentContract: () => this.currentContract,
      dialogue: this.dialogue,
      audio: this.audio,
      profile: this.profile,
      locale: () => this.settings.data.locale,
      onCommit: (contract, approach, challenge, boons) =>
        this.commitRun(contract, approach, boons, challenge),
    });
    this.recoveryNote = this.profile.recoveryNote();
    this.safehouse = new Safehouse(this.profile, {
      onDeploy: (contractId, approachId, challenge) =>
        this.launcher.start(contractId, approachId, challenge),
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

    this.keyboard = new KeyboardController({
      state: () => this.state,
      toggleMute: () => this.audio.toggleMute(),
      isTourOpen: () => this.pause.isTourOpen,
      closeTour: () => this.closeTour(),
      finishBreach: () => this.breach.finish(false),
      isDialogueOpen: () => this.dialogueOpen,
      dialogueChoice: (index) =>
        this.dialogueSession?.current?.choices?.[index]?.id ?? null,
      cancelDialogue: () => this.cancelDialogue(),
      advanceDialogue: () => this.advanceDialogue(),
      chooseDialogue: (id) => this.chooseDialogue(id),
      isEpilogue: () => this.ending.isEpilogue,
      finishEpilogue: () => this.ending.finish(),
      isEnding: () => this.ending.isOpen,
      endings: () => availableEndings(this.profile.data),
      chooseEnding: (id) => this.ending.choose(id),
      isManualOpen: () => this.pause.isManualOpen,
      closeManual: () => this.closeManual(),
      pause: () => this.pauseGame(),
      resume: () => this.resumeGame(),
      isPanelOpen: () => this.panelOpen,
      safehouseEscape: () => this.safehouse.handleEscape(),
      closePanel: () => this.closePanel(),
      isCaseOpen: () => this.safehouse.caseOpen,
      rotateCase: () => this.safehouse.rotateSelectedCase(),
      canOpenDeploy: () =>
        !this.safehouse.augmentsOpen && !this.safehouse.workbenchOpen,
      openDeploy: () => this.safehouse.openDeploy(),
      openPanel: () => this.openPanel(),
      quickRetry: () => this.quickRetry(),
      returnToSafehouse: () => this.returnToSafehouse(),
    });
    this.contracts = this.rollBoard();
    this.currentContract = this.contracts[0];
    this.safehouse.setContracts(this.contracts);
    this.world = createHubWorld(
      this.getLevel('safehouse'),
      this.input,
      (event) => this.onEvent(event),
      this.profile.runMods(),
    );
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

  private showHub(): void {
    this.panelOpen = false;
    this.hub.show();
    this.safehouse.hide();
    this.hud.setVisible(false);
    this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, false);
    this.hub.updateStats(this.profile.data);
    this.updateHubPrompt();
  }

  private updateHubPrompt(): void {
    this.hub.updatePrompt(nearestStation(this.world), this.recoveryNote);
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
      buildMissionSpec(contract, approach, config.boons, this.profile.data.ngPlus),
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

    document.getElementById('overlay-dialogue')!.addEventListener('click', (ev) => this.dialogue.handleClick(ev));
    document.getElementById('overlay-ending')!.addEventListener('click', (ev) => {
      const id = (ev.target as HTMLElement).closest<HTMLElement>('[data-ending]')?.dataset
        .ending;
      if (id) this.ending.choose(id as EndingId);
    });
    document.getElementById('overlay-breach')!.addEventListener('click', (ev) => this.breach.handleClick(ev));
    document.getElementById('overlay-epilogue')!.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('[data-act="epilogue-next"]')) {
        this.ending.finish();
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
      this.pause.isManualOpen ||
      this.pause.isTourOpen ||
      this.ending.isOpen ||
      this.ending.isEpilogue ||
      (this.state === 'safehouse' && this.panelOpen)
    );
  }

  private menuBack(): void {
    if (this.state === 'dead' || this.state === 'win') {
      this.returnToSafehouse();
      return;
    }
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }),
    );
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
    this.pause.openPause();
    this.settingsPanel.sync();
    this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, false);
    this.input.endFrame();
  }

  private resumeGame(): void {
    if (this.state !== 'paused') return;
    this.pause.closePause();
    this.state = 'playing';
    this.hud.crosshairAt(this.input.mouseX, this.input.mouseY, true);
    this.input.endFrame();
  }

  private handleAbandon(): void {
    this.pause.closePause();
    this.returnToSafehouse();
  }

  private showManual(): void {
    this.pause.showManual();
  }

  private closeManual(): void {
    this.pause.closeManual();
  }

  private showTour(): void {
    this.pause.showTour();
  }

  private closeTour(): void {
    this.pause.closeTour();
  }

  private finishBreach(
    success: boolean,
    nodeId: number,
    hazard: 'camera' | 'turret' | 'safe' | null,
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

  private get dialogueOpen(): boolean {
    return this.dialogue.isOpen;
  }

  private get dialogueSession(): DialogueSession | null {
    return this.dialogue.session;
  }

  private advanceDialogue(): void {
    this.dialogue.advance();
  }

  private chooseDialogue(choiceId: string): void {
    this.dialogue.choose(choiceId);
  }

  private cancelDialogue(): void {
    this.dialogue.cancel();
    this.launcher.cancel();
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
    this.pause.closeAll();
    this.ending.close();
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
    this.runEvents.reset();
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
    document.body.classList.toggle('finale', contract.chapter === 'final');
    this.showBrief(contract);
    this.playScreenTransition();
    this.input.endFrame();
  }

  private setApproachVignette(approach: ApproachId): void {
    this.approachVignette.className =
      approach === 'standard' ? 'approach-vignette' : `approach-vignette on ${approach}`;
  }

  private showBrief(contract: Contract): void {
    const line = this.brief.show(
      contract,
      this.currentApproach,
      this.currentBoons,
      this.profile.data.ngPlus,
      this.settings.data.locale,
    );
    this.hud.logLine(`MOTH: ${line}`);
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
    this.bossPhase.hide();
    this.state = 'safehouse';
    this.pause.closeAll();
    this.ending.close();
    this.hud.hideResults();
    this.hud.setVisible(false);
    this.hud.exitPointer(0, 0, false);
    this.brief.hide();
    this.briefT = 0;
    this.approachVignette.className = 'approach-vignette';
    document.body.classList.remove('contract-fog', 'contract-blackout', 'finale');
    this.dialogue.close();
    this.launcher.cancel();
    this.profile.clearInsurance();

    this.contracts = this.rollBoard();
    this.currentContract = this.contracts[0] ?? null;
    this.safehouse.setContracts(this.contracts);
    this.world = createHubWorld(
      this.getLevel('safehouse'),
      this.input,
      (event) => this.onEvent(event),
      this.profile.runMods(),
    );
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
    if (playWorldEventAudio(e, this.audio)) return;
    if (this.eventHud.handle(e)) return;
    if (this.combatEvents.handle(e)) return;
    if (this.runEvents.handle(e)) return;
    if (this.bossEvents.handle(e)) return;
    switch (e.type) {
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
    const view = buildResult({
      dead: this.state === 'dead',
      contract: this.currentContract,
      world: this.world,
      carriedWeapon: this.startedWithWeapon || this.world.player.weapon !== 'fists',
      insured: this.runEvents.deathInsured,
      insuredWeapon: this.runEvents.deathInsuredWeapon,
      reward: this.lastReward,
      approachId: this.currentApproach,
      ending: this.profile.data.ending,
      money: this.profile.data.money,
    });
    if (view.kind === 'ending') {
      this.ending.showChoice();
      return;
    }
    if (view.kind === 'death' || view.kind === 'win') {
      this.hud.showResult(view.kind, view.stats, view.note);
    }
  }

  frame(dtRaw: number): void {
    const dt = Math.min(dtRaw, 0.05);
    this.frameShell.begin(dt);
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
    if (this.state === 'safehouse' && !this.panelOpen && !this.pause.isManualOpen) {
      const stepped = stepWorld(this.world, this.acc, dt, aim, {
        state: 'safehouse',
        reducedMotion: this.settings.data.reducedMotion,
      });
      this.acc = stepped.acc;
      edgesConsumed = edgesConsumed || stepped.edges;
      this.updateHubPrompt();
      const station = nearestStation(this.world);
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
      this.hud.flashDamage('death');
      this.audio.death();
    }
    if (this.state !== 'safehouse') {
      const frame = advanceFrame(
        this.world,
        dt,
        aim,
        this.state,
        {
          acc: this.acc,
          briefT: this.briefT,
          overlayT: this.overlayT,
          overlayShown: this.overlayShown,
        },
        this.settings.data.reducedMotion,
        false,
      );
      this.acc = frame.acc;
      this.briefT = frame.briefT;
      this.overlayT = frame.overlayT;
      this.overlayShown = frame.overlayShown;
      edgesConsumed = edgesConsumed || frame.edges;
      if (frame.briefHidden) this.brief.hide();
      if (frame.overlayReady) this.showResultOverlay();
    }

    if (this.state !== 'safehouse') {
      const synced = syncHud({
        state: this.state,
        world: this.world,
        profile: this.profile,
        contract: this.currentContract,
        approach: this.currentApproach,
        mouseX: this.input.mouseX,
        mouseY: this.input.mouseY,
        lastShotsHit: this.lastShotsHit,
        lastKills: this.lastKills,
        hud: this.hud,
        renderer: this.renderer,
        audio: this.audio,
        setVignettePoint: (x, y) => {
          this.approachVignette.style.setProperty('--px', `${x}px`);
          this.approachVignette.style.setProperty('--py', `${y}px`);
        },
      });
      this.lastShotsHit = synced.lastShotsHit;
      this.lastKills = synced.lastKills;
    }

    this.frameShell.finish(this.renderer, this.world, dt, edgesConsumed, this.state);
  }
}
