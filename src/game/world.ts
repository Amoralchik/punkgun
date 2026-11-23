import { Input } from '../core/input';
import { angleDelta, clamp, dist, mulberry32, randomSeed, turnToward } from '../core/math';
import { Level, TILE, isWall, tileCenter, worldToTile } from './map';
import { Pathfinder } from './path';
import { updateBullets } from './world-bullets';
import { updateDoorAngles } from './world-doors';
import {
  aimPlayer,
  dashDirection,
  movementAxes,
  playerMoveSpeed,
  tickPlayerCooldowns,
} from './world-player';
import { segmentHitsCircle } from './world-geometry';
import {
  assignSquads,
  findCoverPoint,
  flankPoint,
  grenadeThreat,
  isFlanker,
  meleeKind,
  squadLeader,
} from './world-ai';
import { baseMods, RunMods } from './progression';
import { CONSUMABLE_MAP, ConsumableId } from './consumables';
import {
  ATTACHMENT_MAP,
  AttachmentId,
  attachmentMag,
  attachmentPellets,
} from './attachments';
import { LOOT_DEFS } from './economy';
import { GunId, WEAPONS, WeaponId, isGun, NamedWeaponId, NAMED_MAP } from './weapons';
import { APPROACH_MAP, ApproachId } from './attributes';
import { ModifierId } from './modifiers';
import { ENEMY_TRAITS, pickEnemyKind, rollEnemyLoadout } from './enemy-data';
import { BOSSES, BOSS_ORDER, BossId } from './bosses';
import { createObjectiveNodes, nearestObjectiveNode, objectiveNodeText } from './world-objectives';
import type { RunBoon } from './boons';
import {
  addBlood as emitBlood,
  addCasing as emitCasing,
  addSparks as emitSparks,
  updateParticles as stepParticles,
} from './effects';
import type {
  Barrel,
  Bullet,
  Camera,
  Turret,
  Laser,
  Decal,
  Door,
  Enemy,
  EnemyKind,
  EnemyState,
  Explosion,
  Grenade,
  LootItem,
  MissionSpec,
  ObjectiveNode,
  Particle,
  Pickup,
  Player,
  SmokeCloud,
  Steam,
  WorldEvent,
  WorldState,
} from './world-types';

const ENEMY_SPEED = 148;
const SWING_DURATION = 0.24;
const SWING_HIT_AT = 0.065;

export class World {
  readonly player: Player;
  readonly enemies: Enemy[] = [];
  readonly pickups: Pickup[] = [];
  readonly loot: LootItem[] = [];
  readonly bullets: Bullet[] = [];
  readonly barrels: Barrel[] = [];
  readonly cameras: Camera[] = [];
  readonly turrets: Turret[] = [];
  readonly lasers: Laser[] = [];
  readonly steams: Steam[] = [];
  readonly glassBroken = new Set<number>();
  readonly doors: Door[] = [];
  readonly decals: Decal[] = [];
  readonly particles: Particle[] = [];
  readonly smokes: SmokeCloud[] = [];
  readonly grenades: Grenade[] = [];
  readonly explosions: Explosion[] = [];
  readonly objectives: ObjectiveNode[] = [];

  state: WorldState = 'playing';
  time = 0;
  kills = 0;
  lootValue = 0;
  exitOpen = false;
  targetId: number | null = null;
  heat = 0;
  peakHeat = 0;
  combo = 0;
  comboT = 0;
  bestCombo = 0;
  quickhackFxT = 0;
  quickhackX = 0;
  quickhackY = 0;
  shotsFired = 0;
  shotsHit = 0;
  stealthKills = 0;
  /** First-time enemy/camera/turret detections; zero means a ghost run. */
  detections = 0;
  deathCause = 'UNKNOWN';
  reinforcementWave = 0;
  defenseT = 0;
  defenseWaveT = 0;
  extractionPressureT = 0;
  modifierVision = 1;
  modifierFire = 1;
  modifierHeat = 1;
  hackMultiplier = 1;
  readonly mission: MissionSpec;
  readonly bossId: BossId | null;
  private currentBossId: BossId | null;
  private readonly bossRushQueue: BossId[];
  private bossRushIndex = -1;
  private readonly ngPlus: number;
  readonly boons: RunBoon[];
  private readonly mods: RunMods;
  private approachVision = 1;
  private heatShift = 0;
  hitstop = 0;
  shake = 0;

  private readonly doorMap = new Map<number, Door>();
  private readonly spotted = new Set<number>();
  private readonly spottedCameras = new Set<number>();
  private readonly pathfinder: Pathfinder;
  private readonly rand: () => number;
  private nextId = 1;

  constructor(
    readonly level: Level,
    private readonly input: Input,
    readonly emit: (e: WorldEvent) => void,
    loadout: {
      weapon: WeaponId;
      ammo: number;
      attachment: AttachmentId | null;
      variant: NamedWeaponId | null;
      supplyType: ConsumableId | null;
      supplyCharges: number;
    } | null = null,
    mission: MissionSpec = { objective: 'purge', requiredLoot: 0 },
    mods: RunMods = baseMods(),
    readonly seed: number = randomSeed(),
  ) {
    this.mission = mission;
    this.mods = mods;
    this.bossId = mission.bossId ?? null;
    this.currentBossId = mission.bossId ?? null;
    this.bossRushQueue = mission.bossRush ? [...BOSS_ORDER] : [];
    this.ngPlus = Math.max(0, Math.min(99, Math.floor(mission.ngPlus ?? 0)));
    this.boons = mission.boons ?? [];
    this.rand = mulberry32(seed);
    this.pathfinder = new Pathfinder(level.w, level.h);

    for (const b of level.barrels) {
      this.barrels.push({ id: this.nextId++, x: b.x, y: b.y, r: 20, alive: true });
    }
    const center = tileCenter(level.w >> 1, level.h >> 1, level.h);
    for (const c of level.cameras) {
      this.cameras.push({
        id: this.nextId++,
        x: c.x,
        y: c.y,
        angle: 0,
        baseAngle: Math.atan2(center.y - c.y, center.x - c.x),
        alive: true,
        alertT: 0,
        disabledT: 0,
      });
    }
    for (const t of level.turrets) {
      this.turrets.push({
        id: this.nextId++,
        x: t.x,
        y: t.y,
        angle: 0,
        alive: true,
        aiming: false,
        fireCd: 0.8,
        aimT: 0,
        flashT: 0,
        disabledT: 0,
      });
    }
    let laserPhase = 0;
    for (const l of level.lasers) {
      this.lasers.push({
        id: this.nextId++,
        x: l.x,
        y: l.y,
        axis: l.axis,
        phase: laserPhase,
        alive: true,
        disabledT: 0,
      });
      laserPhase += 0.85;
    }

    level.steam.forEach((steam, index) => {
      this.steams.push({
        id: this.nextId++,
        x: steam.x,
        y: steam.y,
        r: 86,
        phase: index * 0.9,
        active: false,
      });
    });

    for (const d of level.doors) {
      const center = tileCenter(d.cx, d.cy, level.h);
      const door: Door = {
        ...d,
        open: false,
        locked: false,
        angle: 0,
        target: 0,
        speed: 3.4,
        x: center.x,
        y: center.y,
      };
      this.doors.push(door);
      this.doorMap.set(d.cy * level.w + d.cx, door);
    }

    const loadWeapon = loadout?.weapon ?? 'fists';
    const loadAttachment = loadout?.attachment ?? null;
    const extraAmmo =
      loadAttachment && isGun(loadWeapon)
        ? (ATTACHMENT_MAP[loadAttachment].ammoBonus[loadWeapon as GunId] ?? 0)
        : 0;
    const totalAmmo = (loadout?.ammo ?? 0) + extraAmmo;
    const loadDef = WEAPONS[loadWeapon];
    const clip = isGun(loadWeapon)
      ? Math.min(totalAmmo, attachmentMag(loadWeapon, loadAttachment))
      : 0;

    this.player = {
      id: this.nextId++,
      x: level.spawn.x,
      y: level.spawn.y,
      vx: 0,
      vy: 0,
      r: 15,
      angle: 0,
      aimX: level.spawn.x + 100,
      aimY: level.spawn.y,
      alive: true,
      weapon: loadWeapon,
      ammo: isGun(loadWeapon) ? totalAmmo - clip : 0,
      clip,
      reloadT: 0,
      attackCd: 0,
      swingT: 0,
      swingHit: true,
      flashT: 0,
      corpseAngle: 0,
      armor: mods.armor,
      maxArmor: mods.armor,
      invulnT: 0,
      attachment: loadAttachment,
      variant: loadout?.variant ?? null,
      supplyType: loadout?.supplyType ?? null,
      supplyCharges: loadout?.supplyCharges ?? 0,
      slowT: 0,
      slowCd: 0,
      camoT: 0,
      camoCloakCd: 0,
      empCd: 0,
      berserkT: 0,
      berserkCd: 0,
      overclockT: 0,
      overclockCd: 0,
      deckCd: 0,
      kerenCd: 0,
      killSpeedT: 0,
      revived: false,
      regenT: 0,
      hackedT: 0,
      dashT: 0,
      dashCd: 0,
      dashDirX: 0,
      dashDirY: 0,
      quickhackCd: 0,
    };

    level.enemies.forEach((spawn, i) =>
      this.addEnemy(spawn.x, spawn.y, i % 2 === 0 ? 1 : -1, 'idle', spawn.kind),
    );
    const extra = mission.risk === 'HIGH' ? 2 : mission.risk === 'MED' ? 1 : 0;
    const seedSpawn = level.enemies[0];
    if (extra > 0 && seedSpawn) {
      for (let i = 0; i < extra; i++) {
        const offset = (i + 1) * 26;
        const kind =
          mission.risk === 'HIGH' && i === 1
            ? this.rand() < 0.5
              ? 'heavy'
              : 'stalker'
            : pickEnemyKind(this.rand());
        this.addEnemy(seedSpawn.x + offset, seedSpawn.y - offset, 1, 'idle', kind);
      }
    }

    if (mission.objective === 'boss') {
      if (mission.bossRush) {
        this.bossRushIndex = 0;
        this.spawnBoss(this.bossRushQueue[0]);
      } else {
        this.spawnBoss(mission.bossId ?? 'psycho');
      }
    }

    // Give the player the briefing window before any enemy can act.
    assignSquads(this.enemies);
    for (const enemy of this.enemies) enemy.stunT = 1.2;
    this.applyApproach(mission.approach ?? 'standard');

    if (mission.objective === 'target' || mission.objective === 'hunt') {
      if (this.enemies.length > 0) {
        let best = this.enemies[0];
        let bestD = Infinity;
        for (const e of this.enemies) {
          const d = dist(e.x, e.y, level.exit.x, level.exit.y);
          if (d < bestD) {
            bestD = d;
            best = e;
          }
        }
        best.isTarget = true;
        if (mission.objective === 'hunt') {
          best.speedMult = Math.max(1.4, best.speedMult * 1.45);
          best.visionMult = Math.max(1.2, best.visionMult);
        }
        this.targetId = best.id;
      }
    }

    for (const w of level.weapons) {
      this.pickups.push({
        id: this.nextId++,
        x: w.x,
        y: w.y,
        vx: 0,
        vy: 0,
        weapon: w.weapon,
        ammo: w.ammo,
        flying: false,
        angle: (this.rand() - 0.5) * 3,
        spin: 0,
        attachment: null,
        variant: null,
      });
    }

    for (const l of level.loot) {
      this.loot.push({
        id: this.nextId++,
        x: l.x,
        y: l.y,
        kind: l.kind,
        value: l.value,
        collected: false,
      });
    }
    this.applyModifiers(mission.modifiers ?? []);
    this.applyBoons();
    this.setupObjectives();
  }

  private applyBoons(): void {
    if (this.boons.includes('armor')) {
      this.player.armor++;
      this.player.maxArmor++;
    }
    if (this.boons.includes('quiet')) this.modifierVision *= 0.85;
  }

  private findBossSpawn(level: Level): { x: number; y: number } {
    const from = worldToTile(level.spawn.x, level.spawn.y, level.h);
    const reachable = (x: number, y: number): boolean => {
      const to = worldToTile(x, y, level.h);
      if (isWall(level, to.cx, to.cy)) return false;
      return this.pathfinder.find(level, from.cx, from.cy, to.cx, to.cy) !== null;
    };

    if (level.boss && reachable(level.boss.x, level.boss.y)) return level.boss;

    const center = tileCenter(level.w >> 1, level.h >> 1, level.h);
    if (reachable(center.x, center.y)) return center;

    let best = level.spawn;
    let bestScore = -Infinity;
    for (let cy = 0; cy < level.h; cy++) {
      for (let cx = 0; cx < level.w; cx++) {
        if (isWall(level, cx, cy)) continue;
        const pos = tileCenter(cx, cy, level.h);
        if (dist(pos.x, pos.y, level.exit.x, level.exit.y) < 120) continue;
        if (!reachable(pos.x, pos.y)) continue;
        const score =
          dist(pos.x, pos.y, level.spawn.x, level.spawn.y) -
          dist(pos.x, pos.y, center.x, center.y) * 0.35;
        if (score > bestScore) {
          bestScore = score;
          best = pos;
        }
      }
    }
    return best;
  }

  private setupObjectives(): void {
    this.objectives.push(
      ...createObjectiveNodes(this.mission, this.level, this.loot, () => this.nextId++),
    );
    if (this.mission.objective === 'defense') this.defenseWaveT = 12;
  }

  private applyModifiers(ids: ModifierId[]): void {
    if (ids.length === 0) return;
    if (ids.includes('fog')) this.modifierVision *= 0.7;
    if (ids.includes('sirens')) {
      this.modifierHeat *= 1.5;
      this.heatShift = 15;
    }
    if (ids.includes('overclocked')) this.modifierFire *= 0.8;
    if (ids.includes('blackIce')) this.hackMultiplier = 2;
    if (ids.includes('noArmor')) {
      this.player.armor = 0;
      this.player.maxArmor = 0;
    }
    if (ids.includes('elite')) {
      for (const e of this.enemies) {
        e.armor++;
        e.maxArmor++;
      }
    }
    if (ids.includes('hotLoot')) {
      for (const item of this.loot) item.value = Math.round(item.value * 1.5);
    }
    if (ids.includes('cyberpsycho')) {
      let converted = 0;
      for (const e of this.enemies) {
        if (converted >= 2) break;
        if (e.kind === 'boss' || e.kind === 'blade') continue;
        e.kind = 'blade';
        e.weapon = 'fists';
        e.ammo = 0;
        e.speedMult = Math.max(e.speedMult, 1.28);
        converted++;
      }
    }
    if (ids.includes('swarm')) {
      this.spawnReinforcements(3);
    }
    if (ids.includes('blackIce') && !this.enemies.some((e) => e.kind === 'netrunner')) {
      const spawn = this.level.enemies[0];
      if (spawn) this.addEnemy(spawn.x, spawn.y, 1, 'chase', 'netrunner');
    }
    if (ids.includes('alarm') || ids.includes('lockdown')) {
      for (const e of this.enemies) {
        e.state = 'chase';
        e.lastSeenX = this.player.x;
        e.lastSeenY = this.player.y;
        e.searchT = 8;
        e.markT = 1;
        e.angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        e.fireCd = 0.5 + this.rand() * 0.4;
      }
    }
    if (ids.includes('lockdown')) {
      this.heat = Math.max(this.heat, 35);
      this.peakHeat = Math.max(this.peakHeat, this.heat);
    }
  }

  get aliveEnemies(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  get boss(): Enemy | null {
    return (
      this.enemies.find((e) => e.kind === 'boss' && e.alive) ??
      this.enemies.find((e) => e.kind === 'boss') ??
      null
    );
  }

  get bossName(): string {
    return BOSSES[this.currentBossId ?? this.bossId ?? 'psycho'].name;
  }

  get ghostRun(): boolean {
    return this.detections === 0 && this.player.alive && this.time > 0;
  }

  get bossRushProgress(): string {
    return this.mission.bossRush
      ? `${this.bossRushIndex + 1}/${this.bossRushQueue.length}`
      : '';
  }

  private get bossDef() {
    return BOSSES[this.currentBossId ?? this.bossId ?? 'psycho'];
  }

  private spawnBoss(id: BossId): void {
    const bossDef = BOSSES[id];
    const spawn = this.findBossSpawn(this.level);
    const boss = this.addEnemy(spawn.x, spawn.y, 1, 'idle', 'boss');
    const plus = Math.min(3, this.ngPlus);
    boss.armor = bossDef.armor + plus;
    boss.maxArmor = boss.armor;
    boss.speedMult = Math.min(1.6, bossDef.speedMult + this.ngPlus * 0.04);
    boss.isTarget = true;
    this.currentBossId = id;
    this.targetId = boss.id;
  }

  get collectedLoot(): number {
    let n = 0;
    for (const item of this.loot) if (item.collected) n++;
    return n;
  }

  get visionRange(): number {
    return 500 * this.mods.vision;
  }

  get visionHalfAngle(): number {
    return 1.1;
  }

  get abilityRanks(): { sandevistan: number; camo: number } {
    return { sandevistan: this.mods.sandevistan, camo: this.mods.camo };
  }

  get comboMax(): number {
    return 3 + this.mods.comboWindow;
  }

  /** HUD-ready active cyberware state, filtered to installed abilities. */
  abilitySlots(): Array<{
    key: string;
    label: string;
    activeT: number;
    cooldown: number;
    maxCooldown: number;
  }> {
    const p = this.player;
    const m = this.mods;
    const slots: Array<{
      key: string;
      label: string;
      activeT: number;
      cooldown: number;
      maxCooldown: number;
    }> = [];
    slots.push({
      key: 'SPACE',
      label: 'DASH',
      activeT: p.dashT,
      cooldown: p.dashCd,
      maxCooldown: 1.1 * m.dashCd,
    });
    if (m.deck > 0) {
      slots.push({
        key: 'Z',
        label: 'QUICKHACK',
        activeT: 0,
        cooldown: p.quickhackCd,
        maxCooldown: (10 - (m.deck - 1) * 2) * m.abilityCd,
      });
    }
    if (m.sandevistan > 0) {
      slots.push({
        key: 'SHIFT',
        label: 'SANDEVISTAN',
        activeT: p.slowT,
        cooldown: p.slowCd,
        maxCooldown: (14 - (m.sandevistan - 1) * 3) * m.abilityCd,
      });
    }
    if (m.camo > 0) {
      slots.push({
        key: 'C',
        label: 'OPTICAL CAMO',
        activeT: p.camoT,
        cooldown: p.camoCloakCd,
        maxCooldown: (12 - (m.camo - 1) * 2) * m.abilityCd,
      });
    }
    if (m.emp > 0) {
      slots.push({
        key: 'X',
        label: 'EMP',
        activeT: 0,
        cooldown: p.empCd,
        maxCooldown: (20 - (m.emp - 1) * 3) * m.abilityCd,
      });
    }
    if (m.berserk > 0) {
      slots.push({
        key: 'V',
        label: 'BERSERK',
        activeT: p.berserkT,
        cooldown: p.berserkCd,
        maxCooldown: (20 - (m.berserk - 1) * 3) * m.abilityCd,
      });
    }
    if (m.overclock > 0) {
      slots.push({
        key: 'G',
        label: 'OVERCLOCK',
        activeT: p.overclockT,
        cooldown: p.overclockCd,
        maxCooldown: (18 - (m.overclock - 1) * 3) * m.abilityCd,
      });
    }
    if (m.deck > 0) {
      slots.push({
        key: 'H',
        label: 'INTRUSION',
        activeT: 0,
        cooldown: p.deckCd,
        maxCooldown: (22 - (m.deck - 1) * 3) * m.abilityCd,
      });
    }
    return slots;
  }

  objectiveText(): string {
    if (this.exitOpen) return 'EXIT OPEN — GET OUT';
    if (this.mission.objective === 'purge') {
      return `PURGE ${this.enemies.length - this.aliveEnemies}/${this.enemies.length}`;
    }
    if (this.mission.objective === 'target' || this.mission.objective === 'hunt') {
      const target = this.enemies.find((e) => e.id === this.targetId);
      return target && target.alive
        ? this.mission.objective === 'hunt'
          ? 'HUNT THE MARKED TARGET'
          : 'KILL THE MARKED TARGET'
        : 'TARGET DOWN — EXIT';
    }
    if (this.mission.objective === 'boss') {
      const boss = this.boss;
      const wave = this.mission.bossRush ? `WAVE ${this.bossRushProgress} · ` : '';
      const plus = this.ngPlus > 0 ? `NG+${this.ngPlus} · ` : '';
      return boss ? `${plus}${wave}${this.bossName} ARMOR ${boss.armor}/${boss.maxArmor}` : 'KILL THE BOSS';
    }
    const nodeText = objectiveNodeText(this.mission, this.objectives);
    if (nodeText) return nodeText;
    return `CACHES ${this.collectedLoot}/${this.mission.requiredLoot}`;
  }

  private checkObjective(): void {
    if (this.exitOpen) return;
    let done = false;
    if (this.mission.objective === 'purge') {
      done = this.aliveEnemies === 0;
    } else if (this.mission.objective === 'target' || this.mission.objective === 'hunt') {
      const target = this.enemies.find((e) => e.id === this.targetId);
      done = !!target && !target.alive;
    } else if (this.mission.objective === 'boss') {
      const boss = this.boss;
      done = !!boss && !boss.alive;
      if (done && this.mission.bossRush && this.bossRushIndex < this.bossRushQueue.length - 1) {
        this.bossRushIndex++;
        this.spawnBoss(this.bossRushQueue[this.bossRushIndex]);
        this.player.invulnT = Math.max(this.player.invulnT, 1);
        const current = this.boss;
        this.emit({
          type: 'bossRushWave',
          x: current?.x ?? this.player.x,
          y: current?.y ?? this.player.y,
          angle: 0,
          wave: this.bossRushIndex + 1,
          total: this.bossRushQueue.length,
        });
        return;
      }
    } else if (this.mission.objective === 'sabotage') {
      done = this.objectives.length > 0 && this.objectives.every((n) => n.completed);
    } else if (this.mission.objective === 'extraction') {
      done = this.objectives[0]?.completed === true;
    } else if (this.mission.objective === 'defense') {
      done = this.objectives[0]?.completed === true;
    } else {
      done = this.collectedLoot >= this.mission.requiredLoot;
    }
    if (!done) return;
    this.exitOpen = true;
    this.emit({ type: 'exitOpen', x: this.level.exit.x, y: this.level.exit.y, angle: 0 });
  }

  private updateObjectives(dt: number): void {
    if (this.state !== 'playing') return;
    const p = this.player;
    if (this.mission.objective === 'defense') {
      const zone = this.objectives[0];
      if (!zone || zone.completed) return;
      if (!p.alive || dist(p.x, p.y, zone.x, zone.y) > zone.radius) return;
      zone.progress = Math.min(zone.required, zone.progress + dt);
      this.defenseT = zone.progress;
      this.defenseWaveT -= dt;
      if (this.defenseWaveT <= 0) {
        this.defenseWaveT = 12;
        this.spawnReinforcements(2, 'grunt');
        this.emit({ type: 'siren', x: p.x, y: p.y, angle: 0 });
      }
      if (zone.progress >= zone.required) {
        zone.completed = true;
        this.emit({ type: 'objectiveComplete', x: zone.x, y: zone.y, angle: 0 });
        this.checkObjective();
      }
      return;
    }
    if (this.mission.objective === 'extraction') {
      const node = this.objectives[0];
      if (!node?.completed || this.exitOpen) return;
      this.extractionPressureT -= dt;
      if (this.extractionPressureT <= 0) {
        this.extractionPressureT = 8;
        this.spawnReinforcements(2, 'rusher');
        this.emit({ type: 'siren', x: p.x, y: p.y, angle: 0 });
      }
    }
  }

  resolveHazardBreach(
    hazard: 'camera' | 'turret',
    hazardId: number,
    success: boolean,
  ): void {
    const target =
      hazard === 'camera'
        ? this.cameras.find((camera) => camera.id === hazardId)
        : this.turrets.find((turret) => turret.id === hazardId);
    if (!target || !target.alive) return;
    if (!success) {
      this.addHeat(10);
      this.emit({ type: 'breachFail', x: target.x, y: target.y, angle: 0 });
      return;
    }
    target.alive = false;
    this.emit({
      type: hazard === 'camera' ? 'cameraBroken' : 'turretBroken',
      x: target.x,
      y: target.y,
      angle: 0,
    });
    this.emit({ type: 'breachSuccess', x: target.x, y: target.y, angle: 0 });
  }

  resolveBreach(nodeId: number, success: boolean): void {
    const node = this.objectives.find((entry) => entry.id === nodeId);
    if (!node || node.completed) return;
    if (!success) {
      this.addHeat(14);
      this.emit({ type: 'breachFail', x: node.x, y: node.y, angle: 0 });
      return;
    }
    this.completeObjectiveNode(node);
    for (const cam of this.cameras) {
      if (cam.alive && dist(cam.x, cam.y, node.x, node.y) <= 440) cam.disabledT = 8;
    }
    for (const turret of this.turrets) {
      if (turret.alive && dist(turret.x, turret.y, node.x, node.y) <= 440) {
        turret.disabledT = 8;
      }
    }
    for (const laser of this.lasers) {
      if (laser.alive && dist(laser.x, laser.y, node.x, node.y) <= 440) {
        laser.disabledT = 8;
      }
    }
    this.emit({ type: 'breachSuccess', x: node.x, y: node.y, angle: 0 });
  }

  private completeObjectiveNode(node: ObjectiveNode): void {
    if (node.completed) return;
    node.completed = true;
    node.progress = node.required;
    if (node.kind === 'terminal') {
      this.addHeat(7);
      this.emit({ type: 'sabotage', x: node.x, y: node.y, angle: 0 });
      this.alertAt(node.x, node.y, 220);
    } else {
      this.addHeat(35);
      this.spawnReinforcements(3, 'rusher');
      this.extractionPressureT = 5;
      this.emit({ type: 'caseSecured', x: node.x, y: node.y, angle: 0 });
    }
    this.checkObjective();
  }

  update(dt: number, aim: { x: number; y: number }, edge: boolean): void {
    if (this.state === 'won') return;
    if (this.state === 'playing') this.time += dt;
    this.player.aimX = aim.x;
    this.player.aimY = aim.y;

    const slow = this.player.alive && this.player.slowT > 0 ? 0.35 : 1;
    if (this.player.alive) this.updatePlayer(dt, edge);
    this.updateCameras(dt);
    this.updateTurrets(dt);
    this.updateLasers(dt);
    this.updateEnemies(dt * slow);
    updateBullets(this, dt, slow);
    this.updatePickups(dt);
    this.updateGrenades(dt);
    this.updateSmokes(dt);
    this.updateSteams(dt);
    this.updateParticles(dt);
    this.updateDoors(dt);
    this.updateObjectives(dt);

    if (this.player.alive && this.exitOpen && this.state === 'playing') {
      const d = dist(this.player.x, this.player.y, this.level.exit.x, this.level.exit.y);
      // Exit tile is solid: closest reachable center distance is ~47.
      if (d < 60) {
        this.state = 'won';
        this.emit({ type: 'win', x: this.player.x, y: this.player.y, angle: 0 });
      }
    }

    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.heat = Math.max(0, this.heat - dt * 1.4);
    this.quickhackFxT = Math.max(0, this.quickhackFxT - dt);
    if (this.comboT > 0) {
      this.comboT = Math.max(0, this.comboT - dt);
      if (this.comboT === 0) this.combo = 0;
    }
  }

  /* ------------------------------------------------------------------ */
  /* queries                                                             */
  /* ------------------------------------------------------------------ */

  isSolidTile(cx: number, cy: number): boolean {
    if (isWall(this.level, cx, cy)) {
      const index = cy * this.level.w + cx;
      if (this.level.glass[index] === 1) return !this.glassBroken.has(index);
      return true;
    }
    const door = this.doorMap.get(cy * this.level.w + cx);
    return !!door && !door.open;
  }

  private blocksSight(cx: number, cy: number): boolean {
    if (isWall(this.level, cx, cy)) {
      return this.level.glass[cy * this.level.w + cx] !== 1;
    }
    const door = this.doorMap.get(cy * this.level.w + cx);
    return !!door && !door.open;
  }

  solidAt(x: number, y: number): boolean {
    const { cx, cy } = worldToTile(x, y, this.level.h);
    return this.isSolidTile(cx, cy);
  }

  lineClear(ax: number, ay: number, bx: number, by: number): boolean {
    const d = dist(ax, ay, bx, by);
    const steps = Math.ceil(d / 14);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const { cx, cy } = worldToTile(ax + (bx - ax) * t, ay + (by - ay) * t, this.level.h);
      if (this.blocksSight(cx, cy)) return false;
    }
    return true;
  }

  breakGlassAt(x: number, y: number): boolean {
    const { cx, cy } = worldToTile(x, y, this.level.h);
    const index = cy * this.level.w + cx;
    if (this.level.glass[index] !== 1 || this.glassBroken.has(index)) return false;
    this.glassBroken.add(index);
    const center = tileCenter(cx, cy, this.level.h);
    this.addSparks(center.x, center.y, Math.atan2(-1, 0));
    this.emit({ type: 'glassBreak', x: center.x, y: center.y, angle: 0 });
    this.alertAt(center.x, center.y, 240);
    return true;
  }

  private addEnemy(
    x: number,
    y: number,
    strafeSign = 1,
    state: EnemyState = 'idle',
    forcedKind?: EnemyKind,
  ): Enemy {
    const kindRoll = this.rand();
    const kind: EnemyKind = forcedKind ?? pickEnemyKind(kindRoll);
    const { weapon, ammo } = rollEnemyLoadout(kind, this.rand);
    const traits = ENEMY_TRAITS[kind];
    const center = tileCenter(this.level.w >> 1, this.level.h >> 1, this.level.h);
    const baseAngle = Math.atan2(center.y - y, center.x - x);
    const enemy: Enemy = {
      id: this.nextId++,
      kind,
      isTarget: false,
      x,
      y,
      vx: 0,
      vy: 0,
      r: traits.radius,
      angle: baseAngle + (this.rand() - 0.5) * 1.2,
      alive: true,
      weapon,
      ammo,
      state,
      stateT: 0,
      fireCd: 0.3 + this.rand() * 0.7,
      meleeCd: 0,
      markT: 0,
      flashT: 0,
      path: [],
      pathT: this.rand() * 0.3,
      lastSeenX: this.player?.x ?? x,
      lastSeenY: this.player?.y ?? y,
      searchT: 0,
      corpseAngle: 0,
      deathVx: 0,
      deathVy: 0,
      corpseFound: false,
      patrolX: x,
      patrolY: y,
      patrolT: 0,
      baseAngle,
      targetAngle: baseAngle,
      scanT: 0.5 + this.rand() * 2,
      strafeT: 0,
      strafeSign,
      aiming: false,
      stunT: 0,
      shieldT: 0,
      speedMult: traits.speedMult,
      visionMult: traits.visionMult,
      armor: traits.armor,
      maxArmor: traits.armor,
      invulnT: 0,
      grenadeCd: kind === 'grenadier' ? 1.2 + this.rand() * 1.5 : 0,
      hackT: 0,
      hackCd: kind === 'netrunner' ? 1.4 + this.rand() * 1.4 : 0,
      deployCd: kind === 'operator' ? 1.2 + this.rand() * 1.2 : 0,
      bossChargeT: 0,
      bossChargeCd: kind === 'boss' ? 3 : 0,
      bossWeakT: 0,
      squad: -1,
      suppressT: 0,
      coverT: 0,
      coverX: 0,
      coverY: 0,
      flankT: 0,
      flankX: 0,
      flankY: 0,
      leapT: 0,
      leapCd: 0,
      healCd: 0,
      medicCharges: kind === 'medic' ? 2 : 0,
    };
    if (state === 'chase') {
      enemy.lastSeenX = this.player.x;
      enemy.lastSeenY = this.player.y;
      enemy.searchT = 8;
      enemy.markT = 1;
      enemy.angle = Math.atan2(this.player.y - y, this.player.x - x);
      enemy.fireCd = 0.4 + this.rand() * 0.4;
    }
    this.enemies.push(enemy);
    return enemy;
  }

  private applyApproach(approach: ApproachId): void {
    const def = APPROACH_MAP[approach] ?? APPROACH_MAP.standard;
    this.approachVision = def.visionMult;
    if (approach === 'highline') {
      this.player.slowT = Math.max(this.player.slowT, 2);
      this.player.slowCd = Math.max(this.player.slowCd, 1);
    }
    if (!def.loud) return;
    this.heat = Math.max(this.heat, 25);
    this.peakHeat = Math.max(this.peakHeat, this.heat);
    for (const e of this.enemies) {
      e.state = 'chase';
      e.lastSeenX = this.player.x;
      e.lastSeenY = this.player.y;
      e.searchT = 8;
      e.markT = 1;
      e.angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
      e.fireCd = 0.5 + this.rand() * 0.4;
    }
    this.emit({ type: 'loudBreach', x: this.player.x, y: this.player.y, angle: 0 });
  }

  private spawnReinforcements(count: number, forcedKind?: EnemyKind): void {
    const p = this.player;
    const points = [...this.level.enemies]
      .map((spawn) => ({ ...spawn, d: dist(spawn.x, spawn.y, p.x, p.y) }))
      .sort((a, b) => b.d - a.d)
      .slice(0, count);
    for (const point of points) {
      this.addEnemy(point.x, point.y, 1, 'chase', forcedKind ?? point.kind);
    }
    assignSquads(this.enemies);
    this.emit({ type: 'siren', x: p.x, y: p.y, angle: 0 });
  }

  private addHeat(amount: number): void {
    this.heat = Math.min(100, this.heat + amount * this.mods.heatMult * this.modifierHeat);
    this.peakHeat = Math.max(this.peakHeat, this.heat);
    if (this.exitOpen) return;
    const firstWave = Math.max(25, 55 - this.heatShift);
    const secondWave = Math.max(55, 90 - this.heatShift);
    if (this.heat >= firstWave && this.reinforcementWave < 1) {
      this.reinforcementWave = 1;
      this.spawnReinforcements(2);
    }
    if (this.heat >= secondWave && this.reinforcementWave < 2) {
      this.reinforcementWave = 2;
      this.spawnReinforcements(2);
    }
  }

  private nearestExecution(): Enemy | null {
    const p = this.player;
    let best: Enemy | null = null;
    let bestD = 70 * this.mods.takedownReach;
    for (const e of this.enemies) {
      if (!e.alive || e.kind === 'boss' || e.stunT <= 0) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d >= bestD) continue;
      if (!this.lineClear(p.x, p.y, e.x, e.y)) continue;
      best = e;
      bestD = d;
    }
    return best;
  }

  private nearestBackstab(): Enemy | null {
    const p = this.player;
    let best: Enemy | null = null;
    let bestD = 66 * this.mods.takedownReach;
    for (const e of this.enemies) {
      if (!e.alive || e.kind === 'boss') continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d >= bestD) continue;
      const toPlayer = Math.atan2(p.y - e.y, p.x - e.x);
      if (Math.abs(angleDelta(e.angle, toPlayer)) < 2.05) continue;
      if (!this.lineClear(p.x, p.y, e.x, e.y)) continue;
      best = e;
      bestD = d;
    }
    return best;
  }

  private nearestPickup(): Pickup | null {
    let best: Pickup | null = null;
    let bestD = 48;
    for (const p of this.pickups) {
      if (p.flying) continue;
      const d = dist(this.player.x, this.player.y, p.x, p.y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private nearestLoot(): LootItem | null {
    let best: LootItem | null = null;
    let bestD = 54;
    for (const item of this.loot) {
      if (item.collected) continue;
      const d = dist(this.player.x, this.player.y, item.x, item.y);
      if (d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  private nearestBreachable(): {
    kind: 'camera' | 'turret';
    id: number;
    x: number;
    y: number;
  } | null {
    let best: { kind: 'camera' | 'turret'; id: number; x: number; y: number } | null = null;
    let bestD = 72;
    for (const camera of this.cameras) {
      if (!camera.alive || camera.disabledT > 0) continue;
      const d = dist(this.player.x, this.player.y, camera.x, camera.y);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'camera', id: camera.id, x: camera.x, y: camera.y };
      }
    }
    for (const turret of this.turrets) {
      if (!turret.alive || turret.disabledT > 0) continue;
      const d = dist(this.player.x, this.player.y, turret.x, turret.y);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'turret', id: turret.id, x: turret.x, y: turret.y };
      }
    }
    return best;
  }

  private nearestDoor(): Door | null {
    let best: Door | null = null;
    let bestD = 86;
    for (const d of this.doors) {
      if (d.open) continue;
      const dd = dist(this.player.x, this.player.y, d.x, d.y);
      if (dd < bestD) {
        bestD = dd;
        best = d;
      }
    }
    return best;
  }

  promptText(): string | null {
    if (!this.player.alive || this.state !== 'playing') return null;
    if (this.nearestExecution()) return 'E — EXECUTE';
    if (this.nearestBackstab()) return 'E — SILENT TAKEDOWN';
    const objective = nearestObjectiveNode(this.objectives, this.player);
    if (objective) {
      return objective.kind === 'terminal' ? 'E — BREACH TERMINAL' : 'E — SECURE CASE';
    }
    const loot = this.nearestLoot();
    if (loot) return `E — GRAB ${LOOT_DEFS[loot.kind].name} · $${loot.value}`;
    const p = this.nearestPickup();
    if (p) return `E — TAKE ${WEAPONS[p.weapon].name}`;
    const breachable = this.nearestBreachable();
    if (breachable) return `E — BREACH ${breachable.kind.toUpperCase()}`;
    const d = this.nearestDoor();
    if (d) return 'E — SLAM DOOR';
    if (this.exitOpen) {
      const dd = dist(this.player.x, this.player.y, this.level.exit.x, this.level.exit.y);
      if (dd < 240) return 'EXIT OPEN — GET OUT';
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* player                                                              */
  /* ------------------------------------------------------------------ */

  private updatePlayer(dt: number, edge: boolean): void {
    const p = this.player;
    aimPlayer(p, p.aimX, p.aimY);
    tickPlayerCooldowns(p, dt);
    if (p.reloadT > 0) {
      const prev = p.reloadT;
      p.reloadT = Math.max(0, p.reloadT - dt);
      if (prev > 0 && p.reloadT === 0) this.finishReload();
    }
    p.regenT += dt;
    if (
      this.mods.biomonitor > 0 &&
      p.armor < p.maxArmor &&
      p.regenT >= 6 - (this.mods.biomonitor - 1) * 1.5 - this.mods.regenBoost
    ) {
      p.armor = Math.min(p.maxArmor, p.armor + 1);
      p.regenT = 0;
      this.emit({ type: 'biomonitor', x: p.x, y: p.y, angle: 0 });
    }

    if (edge) {
      const def = WEAPONS[p.weapon];
      if (this.input.wasPressed('KeyR') && p.hackedT <= 0) this.toggleReload();
      if (this.input.mousePressed || (def.auto && this.input.mouseDown)) this.playerAttack();
      if (this.input.rightPressed) this.playerThrow();
      if (this.input.wasPressed('KeyE') || this.input.wasPressed('KeyF')) this.playerInteract();
      if (this.input.wasPressed('KeyQ')) this.useSupply();
      if (p.dashT <= 0 && p.dashCd <= 0 && this.input.wasPressed('Space')) {
        const dash = dashDirection(this.input, p);
        p.dashT = 0.16;
        p.dashCd = 1.1 * this.mods.dashCd;
        p.dashDirX = dash.x;
        p.dashDirY = dash.y;
        p.invulnT = Math.max(p.invulnT, 0.06 + this.mods.dashInvuln);
        this.emit({ type: 'dash', x: p.x, y: p.y, angle: p.angle });
      }
      if (p.hackedT <= 0 && this.mods.deck > 0 && p.quickhackCd <= 0 && this.input.wasPressed('KeyZ')) {
        this.triggerQuickhack();
      }
      if (
        p.hackedT <= 0 &&
        (this.input.wasPressed('ShiftLeft') || this.input.wasPressed('ShiftRight')) &&
        this.mods.sandevistan > 0 &&
        p.slowCd <= 0
      ) {
        p.slowT = 2.5 + (this.mods.sandevistan - 1) * 0.8;
        p.slowCd = (14 - (this.mods.sandevistan - 1) * 3) * this.mods.abilityCd;
        this.emit({ type: 'sandevistan', x: p.x, y: p.y, angle: p.angle });
      }
      if (this.input.wasPressed('KeyC') && p.hackedT <= 0 && this.mods.camo > 0 && p.camoCloakCd <= 0) {
        p.camoT = 2.5 + (this.mods.camo - 1) * 0.8;
        p.camoCloakCd = (12 - (this.mods.camo - 1) * 2) * this.mods.abilityCd;
        this.emit({ type: 'camo', x: p.x, y: p.y, angle: p.angle });
      }
      if (this.input.wasPressed('KeyX') && p.hackedT <= 0 && this.mods.emp > 0 && p.empCd <= 0) {
        this.triggerEmp();
      }
      if (this.input.wasPressed('KeyV') && p.hackedT <= 0 && this.mods.berserk > 0 && p.berserkCd <= 0) {
        p.berserkT = 4 + (this.mods.berserk - 1) * 0.8;
        p.berserkCd = (20 - (this.mods.berserk - 1) * 3) * this.mods.abilityCd;
        this.emit({ type: 'berserk', x: p.x, y: p.y, angle: p.angle });
      }
      if (
        this.input.wasPressed('KeyG') &&
        p.hackedT <= 0 &&
        this.mods.overclock > 0 &&
        p.overclockCd <= 0
      ) {
        p.overclockT = 3.5 + (this.mods.overclock - 1) * 0.7;
        p.overclockCd = (18 - (this.mods.overclock - 1) * 3) * this.mods.abilityCd;
        this.emit({ type: 'overclock', x: p.x, y: p.y, angle: p.angle });
      }
      if (
        this.input.wasPressed('KeyH') &&
        p.hackedT <= 0 &&
        this.mods.deck > 0 &&
        p.deckCd <= 0
      ) {
        this.triggerDeck();
      }
    }

    if (p.swingT > 0) {
      const prev = p.swingT;
      p.swingT = Math.max(0, p.swingT - dt);
      if (!p.swingHit && SWING_DURATION - prev < SWING_HIT_AT && SWING_DURATION - p.swingT >= SWING_HIT_AT) {
        p.swingHit = true;
        this.resolveMelee();
      }
    }

    const axes = movementAxes(this.input);
    const ix = axes.x;
    const iy = axes.y;
    const speed = playerMoveSpeed(this.mods, p);
    if (p.dashT > 0) {
      p.vx = p.dashDirX * 880;
      p.vy = p.dashDirY * 880;
    } else {
      const k = 1 - Math.exp(-24 * dt);
      p.vx += (ix * speed - p.vx) * k;
      p.vy += (iy * speed - p.vy) * k;
    }

    p.x += p.vx * dt;
    this.resolveCircle(p);
    p.y += p.vy * dt;
    this.resolveCircle(p);
  }

  private toggleReload(): void {
    const p = this.player;
    if (!p.alive || !isGun(p.weapon)) return;
    if (p.reloadT > 0) {
      p.reloadT = 0;
      this.emit({ type: 'reloadCancel', x: p.x, y: p.y, angle: p.angle });
      return;
    }
    const def = WEAPONS[p.weapon];
    const mag = attachmentMag(p.weapon, p.attachment);
    if (p.clip >= mag || p.ammo <= 0) return;
    p.reloadT =
      def.reload *
      this.mods.reload *
      (p.attachment ? (ATTACHMENT_MAP[p.attachment].reloadMult ?? 1) : 1);
    p.attackCd = Math.max(p.attackCd, 0.1);
    this.emit({ type: 'reloadStart', x: p.x, y: p.y, angle: p.angle });
  }

  private finishReload(): void {
    const p = this.player;
    if (!p.alive || !isGun(p.weapon)) return;
    const mag = attachmentMag(p.weapon, p.attachment);
    const take = Math.min(mag - p.clip, p.ammo);
    if (take <= 0) return;
    p.clip += take;
    p.ammo -= take;
    this.emit({ type: 'reloadEnd', x: p.x, y: p.y, angle: p.angle });
  }

  private triggerEmp(): void {
    const p = this.player;
    const rank = this.mods.emp;
    if (rank <= 0) return;
    const radius = 220 + rank * 40;
    p.empCd = (20 - (rank - 1) * 3) * this.mods.abilityCd;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (dist(p.x, p.y, e.x, e.y) > radius) continue;
      e.stunT = Math.max(e.stunT, 2.5 + rank * 0.5);
      e.aiming = false;
      e.hackT = 0;
    }
    for (const c of this.cameras) {
      if (c.alive && dist(p.x, p.y, c.x, c.y) <= radius) c.disabledT = 7;
    }
    for (const t of this.turrets) {
      if (t.alive && dist(p.x, p.y, t.x, t.y) <= radius) t.disabledT = 7;
    }
    for (const l of this.lasers) {
      if (l.alive && dist(p.x, p.y, l.x, l.y) <= radius) l.disabledT = 7;
    }
    this.shake = Math.min(1, this.shake + 0.3);
    this.emit({ type: 'emp', x: p.x, y: p.y, angle: p.angle });
  }

  private triggerDeck(): void {
    const p = this.player;
    const rank = this.mods.deck;
    if (rank <= 0) return;
    const radius = 360 + rank * 60;
    p.deckCd = (22 - (rank - 1) * 3) * this.mods.abilityCd;
    for (const c of this.cameras) {
      if (c.alive && dist(p.x, p.y, c.x, c.y) <= radius) c.disabledT = 8 + rank;
    }
    for (const t of this.turrets) {
      if (t.alive && dist(p.x, p.y, t.x, t.y) <= radius) t.disabledT = 8 + rank;
    }
    for (const l of this.lasers) {
      if (l.alive && dist(p.x, p.y, l.x, l.y) <= radius) l.disabledT = 8 + rank;
    }
    this.emit({ type: 'deck', x: p.x, y: p.y, angle: p.angle });
  }

  private triggerQuickhack(): void {
    const p = this.player;
    if (this.mods.deck <= 0) return;
    let target: Enemy | null = null;
    let best = 70;
    for (const e of this.enemies) {
      if (!e.alive || e.kind === 'boss') continue;
      if (dist(p.x, p.y, e.x, e.y) > 520) continue;
      const aimD = dist(e.x, e.y, p.aimX, p.aimY);
      if (aimD >= best) continue;
      if (!this.lineClear(p.x, p.y, e.x, e.y)) continue;
      if (this.smokeBlocks(p.x, p.y, e.x, e.y)) continue;
      target = e;
      best = aimD;
    }
    if (!target) {
      this.emit({ type: 'quickhackFail', x: p.x, y: p.y, angle: p.angle });
      return;
    }
    p.quickhackCd = (10 - (this.mods.deck - 1) * 2) * this.mods.abilityCd;
    this.quickhackFxT = 0.3;
    this.quickhackX = target.x;
    this.quickhackY = target.y;
    target.stunT = Math.max(target.stunT, 1.2 + this.mods.deck * 0.7);
    target.aiming = false;
    target.flashT = 0.25;
    target.hackT = 0;
    if (target.kind === 'netrunner') target.hackCd = 8;
    if (target.kind === 'operator') target.deployCd = 8;
    this.addHeat(3);
    this.emit({ type: 'quickhack', x: target.x, y: target.y, angle: target.angle });
  }

  private playerAttack(): void {
    const p = this.player;
    if (p.attackCd > 0) return;
    if (p.reloadT > 0) return;
    if (p.camoT > 0) {
      p.camoT = 0;
      this.emit({ type: 'camoBreak', x: p.x, y: p.y, angle: p.angle });
    }
    const def = WEAPONS[p.weapon];

    if (def.melee) {
      p.attackCd = def.cooldown * this.mods.meleeCooldown;
      p.swingT = SWING_DURATION;
      p.swingHit = false;
      const dashX = Math.cos(p.angle) * 13;
      const dashY = Math.sin(p.angle) * 13;
      p.x += dashX;
      this.resolveCircle(p);
      p.y += dashY;
      this.resolveCircle(p);
      this.emit({ type: 'swing', x: p.x, y: p.y, angle: p.angle });
      if (p.weapon === 'bat') this.alertAt(p.x, p.y, 190);
      this.shake = Math.min(1, this.shake + def.shake);
      return;
    }

    if (p.clip <= 0) {
      p.attackCd = 0.24;
      this.emit({ type: 'empty', x: p.x, y: p.y, angle: p.angle });
      return;
    }

    p.clip--;
    this.shotsFired++;
    const shotgun = p.weapon === 'shotgun';
    const suppressed = p.attachment === 'suppressor';
    const attachment = p.attachment ? ATTACHMENT_MAP[p.attachment] : null;
    const shotHeat = def.sound === 'lmg' ? 11 : def.sound === 'rifle' ? 9 : def.sound === 'ak' ? 8 : shotgun ? 16 : def.sound === 'railgun' ? 13 : def.sound === 'plasma' ? 10 : 7;
    const alertRadius =
      def.sound === 'lmg' ? 1180 : def.sound === 'rifle' ? 980 : def.sound === 'ak' ? 860 : shotgun ? 900 : def.sound === 'railgun' ? 1250 : def.sound === 'plasma' ? 950 : 760;
    this.addHeat(shotHeat * (attachment?.heatMult ?? 1));
    p.attackCd =
      def.cooldown *
      this.mods.gunCooldown *
      (attachment?.cooldownMult ?? 1) *
      (p.overclockT > 0 ? 0.65 : 1);
    p.flashT = 0.06;
    const variantSpread = p.variant ? NAMED_MAP[p.variant].spreadMult : 1;
    const precision = def.family === 'RIFLE' || def.family === 'DMR' || def.family === 'RAILGUN';
    const overclockSpread = p.overclockT > 0 ? 0.8 : 1;
    const muzzleX = p.x + Math.cos(p.angle) * 26;
    const muzzleY = p.y + Math.sin(p.angle) * 26;

    const pellets = attachmentPellets(p.weapon as GunId, p.attachment);
    for (let i = 0; i < pellets; i++) {
      const a =
        p.angle +
        (this.rand() * 2 - 1) *
          def.spread *
          this.mods.spread *
          (precision ? this.mods.precisionSpread : 1) *
          overclockSpread *
          variantSpread *
          (attachment?.spreadMult ?? 1);
      this.bullets.push({
        x: muzzleX,
        y: muzzleY,
        px: muzzleX,
        py: muzzleY,
        vx: Math.cos(a) * def.speed,
        vy: Math.sin(a) * def.speed,
        life: 1.1,
        ownerId: p.id,
        ownerKind: 'player',
        pierce: def.pierce + this.mods.pierce + (attachment?.pierceBonus ?? 0),
      });
    }

    p.vx -= Math.cos(p.angle) * 85;
    p.vy -= Math.sin(p.angle) * 85;
    this.shake = Math.min(1, this.shake + def.shake);
    const soundType =
      def.sound === 'pistol'
        ? 'pistol'
        : def.sound === 'shotgun'
          ? 'shotgun'
          : (`shot-${def.sound}` as const);
    this.addCasing(muzzleX, muzzleY, p.angle);
    this.emit({
      type: suppressed ? (shotgun ? 'suppressedShotgun' : 'suppressedShot') : soundType,
      x: muzzleX,
      y: muzzleY,
      angle: p.angle,
    });
    this.alertAt(p.x, p.y, alertRadius * (attachment?.alertMult ?? 1));
  }

  private resolveMelee(): void {
    const p = this.player;
    const def = WEAPONS[p.weapon];
    const reach = def.range * this.mods.meleeReach + 16;
    let hitAny = false;
    let killed = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d > reach + e.r) continue;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      if (Math.abs(angleDelta(p.angle, a)) > 1.15) continue;
      if (!this.lineClear(p.x, p.y, e.x, e.y)) continue;
      if (e.kind === 'boss') {
        this.damageBoss(e, a);
        hitAny = true;
        continue;
      }
      if ((e.kind === 'heavy' || e.kind === 'breacher') && e.armor > 0) {
        this.damageHeavy(e, a);
        hitAny = true;
        continue;
      }
      if (e.kind === 'shield' && this.mods.gorilla === 0 && e.shieldT <= 0) {
        const toPlayer = Math.atan2(p.y - e.y, p.x - e.x);
        if (Math.abs(angleDelta(e.angle, toPlayer)) < 1.3) {
          this.addSparks(
            e.x + Math.cos(toPlayer) * 20,
            e.y + Math.sin(toPlayer) * 20,
            toPlayer,
          );
          e.shieldT = 0.42;
          this.emit({ type: 'shieldHit', x: e.x, y: e.y, angle: toPlayer });
          hitAny = true;
          continue;
        }
      }
      this.killEnemy(e, 'player', this.mods.mantis > 0);
      hitAny = true;
      killed = true;
    }
    if (killed && this.mods.meleeKillReset > 0) {
      p.attackCd = 0;
      p.swingT = 0;
      p.swingHit = true;
    }
    if (hitAny) {
      this.shake = Math.min(1, this.shake + 0.18);
      this.hitstop = Math.max(this.hitstop, 0.03);
    }
  }

  private playerThrow(): void {
    const p = this.player;
    if (p.weapon === 'fists' || !p.alive) return;
    if (p.camoT > 0) {
      p.camoT = 0;
      this.emit({ type: 'camoBreak', x: p.x, y: p.y, angle: p.angle });
    }
    const a = p.angle;
    this.pickups.push({
      id: this.nextId++,
      x: p.x + Math.cos(a) * 22,
      y: p.y + Math.sin(a) * 22,
      vx: Math.cos(a) * 940,
      vy: Math.sin(a) * 940,
      weapon: p.weapon,
      ammo: p.ammo + p.clip,
      flying: true,
      angle: a,
      spin: (this.rand() > 0.5 ? 1 : -1) * 22,
      attachment: p.attachment,
      variant: p.variant,
    });
    this.emit({ type: 'throw', x: p.x, y: p.y, angle: a });
    this.addHeat(2);
    p.weapon = 'fists';
    p.ammo = 0;
    p.clip = 0;
    p.reloadT = 0;
    p.attachment = null;
    p.variant = null;
    p.attackCd = Math.max(p.attackCd, 0.18);
    this.alertAt(p.x, p.y, 260);
  }

  private useSupply(): void {
    const p = this.player;
    if (!p.alive || !p.supplyType || p.supplyCharges <= 0) return;
    const type = p.supplyType;
    if (type === 'stim') {
      if (p.armor >= p.maxArmor && p.maxArmor >= 3) return;
      if (p.armor < p.maxArmor) p.armor = Math.min(p.maxArmor, p.armor + 1);
      else {
        p.maxArmor = Math.min(3, p.maxArmor + 1);
        p.armor = p.maxArmor;
      }
      this.emit({ type: 'stim', x: p.x, y: p.y, angle: p.angle });
    } else if (type === 'smoke') {
      this.smokes.push({
        id: this.nextId++,
        x: p.x,
        y: p.y,
        r: 96,
        life: 5,
        maxLife: 5,
      });
      this.emit({ type: 'smoke', x: p.x, y: p.y, angle: p.angle });
    } else if (type === 'flash') {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (dist(p.x, p.y, e.x, e.y) > 300) continue;
        e.stunT = Math.max(e.stunT, 2.5);
        e.aiming = false;
      }
      this.emit({ type: 'flash', x: p.x, y: p.y, angle: p.angle });
      this.shake = Math.min(1, this.shake + 0.2);
    } else if (type === 'frag') {
      this.grenades.push({
        id: this.nextId++,
        x: p.x + Math.cos(p.angle) * 22,
        y: p.y + Math.sin(p.angle) * 22,
        vx: Math.cos(p.angle) * 620,
        vy: Math.sin(p.angle) * 620,
        life: 0.8,
        owner: 'player',
      });
      this.emit({ type: 'fragThrow', x: p.x, y: p.y, angle: p.angle });
      this.addHeat(3);
    }
    p.supplyCharges--;
  }

  smokeBlocks(ax: number, ay: number, bx: number, by: number): boolean {
    for (const smoke of this.smokes) {
      if (smoke.life <= 0) continue;
      if (segmentHitsCircle(ax, ay, bx, by, smoke.x, smoke.y, smoke.r)) return true;
    }
    for (const steam of this.steams) {
      if (steam.active && segmentHitsCircle(ax, ay, bx, by, steam.x, steam.y, steam.r)) {
        return true;
      }
    }
    return false;
  }

  private updateSteams(dt: number): void {
    for (const steam of this.steams) {
      steam.phase = (steam.phase + dt) % 4;
      steam.active = steam.phase < 2;
    }
  }

  private updateSmokes(dt: number): void {
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.life -= dt;
      if (s.life <= 0) this.smokes.splice(i, 1);
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.life -= dt;
      if (e.life <= 0) this.explosions.splice(i, 1);
    }
  }

  private updateGrenades(dt: number): void {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (this.solidAt(g.x, g.y)) {
        g.vx = 0;
        g.vy = 0;
      }
      g.life -= dt;
      if (g.life <= 0) {
        this.explode(
          g.x,
          g.y,
          g.owner,
          g.owner === 'player' ? 115 * this.mods.grenadeRadius : 115,
        );
        this.grenades.splice(i, 1);
      }
    }
  }

  private explode(
    x: number,
    y: number,
    owner: 'player' | 'enemy' | 'barrel',
    radius = 115,
  ): void {
    this.explosions.push({ id: this.nextId++, x, y, life: 0.35, maxLife: 0.35 });
    this.addHeat(25);
    this.shake = 1;
    this.hitstop = Math.max(this.hitstop, 0.06);
    this.emit({ type: 'explosion', x, y, angle: 0 });
    for (let i = 0; i < 30; i++) {
      const a = this.rand() * Math.PI * 2;
      const s = 120 + this.rand() * 380;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.2 + this.rand() * 0.3,
        maxLife: 0.5,
        size: 3 + this.rand() * 5,
        kind: 'spark',
        color: this.rand() > 0.4 ? 0xffc46b : 0x9ffcff,
      });
    }
    if (owner !== 'player') {
      if (this.player.alive && dist(x, y, this.player.x, this.player.y) <= radius) {
        this.deathCause = 'EXPLOSION';
        this.killPlayer(Math.atan2(this.player.y - y, this.player.x - x));
      }
    }
    if (owner !== 'enemy') {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (dist(x, y, e.x, e.y) > radius) continue;
        if (e.kind === 'boss') this.damageBoss(e, Math.atan2(e.y - y, e.x - x));
        else this.killEnemy(e, 'player');
      }
    }
    for (const b of this.barrels) {
      if (!b.alive || dist(x, y, b.x, b.y) > radius + 25) continue;
      this.blowBarrel(b);
    }
    for (const t of this.turrets) {
      if (!t.alive || dist(x, y, t.x, t.y) > radius + 15) continue;
      t.alive = false;
      this.emit({ type: 'turretBroken', x: t.x, y: t.y, angle: t.angle });
    }
    for (const l of this.lasers) {
      if (!l.alive || dist(x, y, l.x, l.y) > radius + 15) continue;
      l.alive = false;
      this.emit({ type: 'laserBroken', x: l.x, y: l.y, angle: 0 });
    }
  }

  blowBarrel(b: Barrel): void {
    if (!b.alive) return;
    b.alive = false;
    this.explode(b.x, b.y, 'barrel');
  }

  private playerInteract(): void {
    const p = this.player;
    const execution = this.nearestExecution();
    if (execution) {
      this.emit({ type: 'execution', x: execution.x, y: execution.y, angle: p.angle });
      this.killEnemy(execution, 'player', true);
      p.dashCd = 0;
      p.attackCd = 0;
      return;
    }
    const backstab = this.nearestBackstab();
    if (backstab) {
      this.killEnemy(backstab, 'player', true);
      return;
    }
    const objective = nearestObjectiveNode(this.objectives, this.player);
    if (objective) {
      if (objective.kind === 'terminal') {
        this.emit({
          type: 'breachStart',
          x: objective.x,
          y: objective.y,
          angle: 0,
          nodeId: objective.id,
        });
        return;
      }
      this.completeObjectiveNode(objective);
      return;
    }
    const loot = this.nearestLoot();
    if (loot) {
      loot.collected = true;
      this.lootValue += Math.round(loot.value * this.mods.lootMult);
      this.emit({ type: 'loot', x: loot.x, y: loot.y, angle: 0 });
      this.checkObjective();
      return;
    }
    const pick = this.nearestPickup();
    if (pick) {
      if (p.weapon !== 'fists') {
        this.pickups.push({
          id: this.nextId++,
          x: p.x + Math.cos(p.angle + Math.PI) * 24,
          y: p.y + Math.sin(p.angle + Math.PI) * 24,
          vx: 0,
          vy: 0,
          weapon: p.weapon,
          ammo: p.ammo + p.clip,
          flying: false,
          angle: p.angle,
          spin: 0,
          attachment: p.attachment,
          variant: p.variant,
        });
      }
      p.weapon = pick.weapon;
      const pickDef = WEAPONS[pick.weapon];
      p.clip = isGun(pick.weapon) ? Math.min(pick.ammo, pickDef.mag) : 0;
      p.ammo = isGun(pick.weapon) ? Math.max(0, pick.ammo - p.clip) : 0;
      p.reloadT = 0;
      p.attachment = pick.attachment;
      p.variant = pick.variant;
      this.pickups.splice(this.pickups.indexOf(pick), 1);
      this.emit({ type: 'pickup', x: p.x, y: p.y, angle: p.angle });
      return;
    }
    const breachable = this.nearestBreachable();
    if (breachable) {
      this.emit({
        type: 'breachStart',
        x: breachable.x,
        y: breachable.y,
        angle: 0,
        nodeId: breachable.id,
        hazard: breachable.kind,
      });
      return;
    }
    const door = this.nearestDoor();
    if (door) this.openDoor(door, true);
  }

  /* ------------------------------------------------------------------ */
  /* enemies                                                             */
  /* ------------------------------------------------------------------ */

  private updateCameras(dt: number): void {
    const p = this.player;
    for (const cam of this.cameras) {
      if (!cam.alive) continue;
      cam.disabledT = Math.max(0, cam.disabledT - dt);
      if (cam.disabledT > 0) continue;
      cam.alertT = Math.max(0, cam.alertT - dt);
      cam.angle = cam.baseAngle + Math.sin(this.time * 0.8 + cam.id) * 0.65;
      if (!p.alive) continue;
      const d = dist(cam.x, cam.y, p.x, p.y);
      if (d > 360) continue;
      const a = Math.atan2(p.y - cam.y, p.x - cam.x);
      if (d > 64 && Math.abs(angleDelta(cam.angle, a)) > 0.55) continue;
      if (!this.lineClear(cam.x, cam.y, p.x, p.y)) continue;
      if (this.smokeBlocks(cam.x, cam.y, p.x, p.y)) continue;
      if (cam.alertT <= 0) {
        if (!this.spottedCameras.has(cam.id)) {
          this.spottedCameras.add(cam.id);
          this.detections++;
        }
        this.emit({ type: 'cameraAlert', x: cam.x, y: cam.y, angle: cam.angle });
        this.alertAt(cam.x, cam.y, 330);
        this.addHeat(6);
      }
      cam.alertT = 2.2;
    }
  }

  private updateLasers(dt: number): void {
    const p = this.player;
    if (!p.alive || p.invulnT > 0) return;
    for (const l of this.lasers) {
      if (!l.alive) continue;
      l.disabledT = Math.max(0, l.disabledT - dt);
      if (l.disabledT > 0) continue;
      const cycle = (this.time + l.phase) % 2.6;
      if (cycle > 1.35) continue;
      const within =
        l.axis === 'h'
          ? Math.abs(p.y - l.y) <= p.r + 6 && Math.abs(p.x - l.x) <= 32 + p.r
          : Math.abs(p.x - l.x) <= p.r + 6 && Math.abs(p.y - l.y) <= 32 + p.r;
      if (!within) continue;
      this.deathCause = 'LASER';
      this.emit({ type: 'laserHit', x: l.x, y: l.y, angle: 0 });
      this.killPlayer(Math.atan2(p.y - l.y, p.x - l.x));
      return;
    }
  }

  private deployTurret(e: Enemy): void {
    let x = e.x;
    let y = e.y;
    for (const distance of [34, 54, 74]) {
      const angle = e.angle + Math.PI;
      const nx = e.x + Math.cos(angle) * distance;
      const ny = e.y + Math.sin(angle) * distance;
      if (
        !this.solidAt(nx, ny) &&
        this.cameras.every((c) => !c.alive || dist(c.x, c.y, nx, ny) > 40)
      ) {
        x = nx;
        y = ny;
        break;
      }
    }
    this.turrets.push({
      id: this.nextId++,
      x,
      y,
      angle: e.angle,
      alive: true,
      aiming: false,
      fireCd: 0.6,
      aimT: 0,
      flashT: 0,
      disabledT: 0,
    });
    this.emit({ type: 'operatorDeploy', x, y, angle: e.angle });
  }

  private updateTurrets(dt: number): void {
    const p = this.player;
    for (const t of this.turrets) {
      if (!t.alive) continue;
      t.disabledT = Math.max(0, t.disabledT - dt);
      if (t.disabledT > 0) {
        t.aiming = false;
        t.aimT = 0;
        continue;
      }
      t.fireCd = Math.max(0, t.fireCd - dt);
      t.flashT = Math.max(0, t.flashT - dt);
      if (!p.alive) continue;
      const d = dist(t.x, t.y, p.x, p.y);
      const sight =
        d < 560 && this.lineClear(t.x, t.y, p.x, p.y) && !this.smokeBlocks(t.x, t.y, p.x, p.y);
      if (!sight) {
        t.aiming = false;
        t.aimT = 0;
        continue;
      }
      const a = Math.atan2(p.y - t.y, p.x - t.x);
      t.angle = turnToward(t.angle, a, dt * 4.2);
      if (Math.abs(angleDelta(t.angle, a)) > 0.18) {
        t.aiming = false;
        t.aimT = 0;
        continue;
      }
      t.aiming = true;
      t.aimT += dt;
      if (t.aimT >= 0.45 && t.fireCd <= 0) {
        this.turretShoot(t);
        t.fireCd = 1.15;
        t.aimT = 0;
      }
    }
  }

  private turretShoot(t: Turret): void {
    this.detections = Math.max(1, this.detections);
    const p = this.player;
    if (!p.alive) return;
    t.flashT = 0.08;
    t.angle = Math.atan2(p.y - t.y, p.x - t.x);
    this.bullets.push({
      x: t.x + Math.cos(t.angle) * 24,
      y: t.y + Math.sin(t.angle) * 24,
      px: t.x,
      py: t.y,
      vx: Math.cos(t.angle) * 1200,
      vy: Math.sin(t.angle) * 1200,
      life: 1.2,
      ownerId: t.id,
      ownerKind: 'enemy',
      pierce: 0,
    });
    this.addHeat(4);
    this.alertAt(t.x, t.y, 380);
    this.emit({ type: 'turretShot', x: t.x, y: t.y, angle: t.angle });
  }

  private updateEnemies(dt: number): void {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.meleeCd -= dt;
      e.markT = Math.max(0, e.markT - dt);
      e.flashT = Math.max(0, e.flashT - dt);
      e.pathT -= dt;
      e.shieldT = Math.max(0, e.shieldT - dt);
      e.invulnT = Math.max(0, e.invulnT - dt);
      e.grenadeCd = Math.max(0, e.grenadeCd - dt);
      e.hackCd = Math.max(0, e.hackCd - dt);
      e.deployCd = Math.max(0, e.deployCd - dt);
      e.bossChargeCd = Math.max(0, e.bossChargeCd - dt);
      e.bossWeakT = Math.max(0, e.bossWeakT - dt);
      e.suppressT = Math.max(0, e.suppressT - dt);
      e.coverT = Math.max(0, e.coverT - dt);
      e.flankT = Math.max(0, e.flankT - dt);
      e.leapT = Math.max(0, e.leapT - dt);
      e.leapCd = Math.max(0, e.leapCd - dt);
      e.healCd = Math.max(0, e.healCd - dt);
      e.aiming = false;
      if (e.stunT > 0) {
        e.stunT = Math.max(0, e.stunT - dt);
        e.vx = 0;
        e.vy = 0;
        continue;
      }

      this.noticeCorpse(e);
      const sees = this.player.alive && this.canSee(e);
      if (e.kind === 'netrunner' && !sees) e.hackT = 0;
      if (sees) {
        e.lastSeenX = this.player.x;
        e.lastSeenY = this.player.y;
        e.searchT = 10;
      }

      if (e.state === 'idle') {
        if (e.kind === 'boss') {
          e.scanT -= dt;
          if (e.scanT <= 0) {
            e.targetAngle = e.baseAngle + (this.rand() - 0.5) * 1.8;
            e.scanT = 1.4 + this.rand() * 2.4;
          }
          e.angle = turnToward(e.angle, e.targetAngle, dt * 2);
        } else {
          e.patrolT -= dt;
          if (e.patrolT <= 0) {
            for (let i = 0; i < 5; i++) {
              const a = this.rand() * Math.PI * 2;
              const r = 36 + this.rand() * 92;
              const tx = e.x + Math.cos(a) * r;
              const ty = e.y + Math.sin(a) * r;
              if (this.solidAt(tx, ty)) continue;
              e.patrolX = tx;
              e.patrolY = ty;
              break;
            }
            e.patrolT = 2.2 + this.rand() * 2.6;
          }
          const pd = dist(e.x, e.y, e.patrolX, e.patrolY);
          if (pd > 8) {
            this.steer(e, e.patrolX, e.patrolY, ENEMY_SPEED * 0.3 * e.speedMult, dt);
            e.angle = turnToward(e.angle, Math.atan2(e.vy, e.vx) || e.angle, dt * 4);
          } else {
            e.scanT -= dt;
            if (e.scanT <= 0) {
              e.targetAngle = e.baseAngle + (this.rand() - 0.5) * 1.8;
              e.scanT = 1.4 + this.rand() * 2.4;
            }
            e.angle = turnToward(e.angle, e.targetAngle, dt * 2);
          }
        }
        if (sees) this.spot(e);
        continue;
      }

      if (e.state === 'alert') {
        e.stateT -= dt;
        const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        e.angle = turnToward(e.angle, a, dt * 16);
        if (e.stateT <= 0) e.state = 'chase';
        continue;
      }

      // chase
      const targetX = sees ? this.player.x : e.lastSeenX;
      const targetY = sees ? this.player.y : e.lastSeenY;
      const dToPlayer = dist(e.x, e.y, this.player.x, this.player.y);

      if (sees) {
        const aim = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        e.angle = turnToward(e.angle, aim, dt * (e.kind === 'shield' ? 3.2 : 11));
      }

      if (e.kind !== 'boss') {
        const threat = grenadeThreat(e, this.grenades);
        if (threat) {
          this.steer(e, threat.x, threat.y, ENEMY_SPEED * 1.15 * e.speedMult, dt);
          continue;
        }
        if (e.suppressT > 0 && e.coverT <= 0 && !meleeKind(e.kind)) {
          const cover = findCoverPoint(
            this.level,
            e,
            this.player,
            (x, y) => !this.solidAt(x, y),
            (ax, ay, bx, by) => this.lineClear(ax, ay, bx, by),
          );
          if (cover) {
            e.coverX = cover.x;
            e.coverY = cover.y;
            e.coverT = 1.4;
            e.path = [];
          }
        }
        if (e.coverT > 0) {
          this.steer(e, e.coverX, e.coverY, ENEMY_SPEED * 1.1 * e.speedMult, dt);
          continue;
        }
        const leader = squadLeader(this.enemies, e);
        if (leader && isFlanker(this.enemies, e)) {
          if (e.flankT <= 0) {
            let point = flankPoint(leader, this.player, e.id % 2 === 0 ? 1 : -1);
            point.x = clamp(point.x, TILE, (this.level.w - 1) * TILE);
            point.y = clamp(point.y, TILE, (this.level.h - 1) * TILE);
            if (this.solidAt(point.x, point.y)) {
              point = flankPoint(leader, this.player, e.id % 2 === 0 ? -1 : 1);
              point.x = clamp(point.x, TILE, (this.level.w - 1) * TILE);
              point.y = clamp(point.y, TILE, (this.level.h - 1) * TILE);
            }
            e.flankX = point.x;
            e.flankY = point.y;
            e.flankT = 1.6;
          }
          if (e.flankT > 0) {
            this.steer(e, e.flankX, e.flankY, ENEMY_SPEED * 1.05 * e.speedMult, dt);
            if (dist(e.x, e.y, e.flankX, e.flankY) < 70) e.flankT = 0;
            continue;
          }
        }
      }

      if (e.kind === 'boss') {
        const phase = Math.max(1, e.maxArmor - e.armor + 1);
        if (e.bossChargeT > 0) {
          const prev = e.bossChargeT;
          e.bossChargeT = Math.max(0, e.bossChargeT - dt);
          e.aiming = true;
          const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          e.angle = a;
          this.steer(e, this.player.x, this.player.y, ENEMY_SPEED * 2.8, dt);
          if (dToPlayer < 70 && e.meleeCd <= 0) {
            this.enemyPunch(e);
            e.bossChargeT = 0;
            e.bossChargeCd = 6;
            e.bossWeakT = 1.1;
          } else if (prev > 0 && e.bossChargeT === 0) {
            e.bossWeakT = 1.2;
          }
          continue;
        }
        if (
          e.bossChargeCd <= 0 &&
          this.bossDef.charge &&
          sees &&
          phase >= 2 &&
          dToPlayer > 90 &&
          dToPlayer < 560
        ) {
          e.bossChargeT = 0.7;
          e.bossChargeCd = 8;
          e.aiming = true;
          this.emit({ type: 'bossCharge', x: e.x, y: e.y, angle: e.angle });
          continue;
        }
      }

      if (this.mission.objective === 'hunt' && e.isTarget && sees) {
        const away = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        const tx = e.x + Math.cos(away) * 240;
        const ty = e.y + Math.sin(away) * 240;
        this.steer(e, tx, ty, ENEMY_SPEED * e.speedMult * 1.25, dt);
        e.angle = turnToward(
          e.angle,
          Math.atan2(this.player.y - e.y, this.player.x - e.x),
          dt * 6,
        );
        if (isGun(e.weapon) && e.ammo > 0) {
          e.aiming = true;
          e.fireCd -= dt;
          if (e.fireCd <= 0) this.enemyShoot(e);
        }
        continue;
      }

      if (e.kind === 'hound' && sees) {
        if (e.leapT > 0) {
          const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
          e.angle = a;
          this.steer(e, this.player.x, this.player.y, ENEMY_SPEED * 3, dt);
          if (dToPlayer < 55 && e.meleeCd <= 0) this.enemyPunch(e);
          continue;
        }
        if (e.leapCd <= 0 && dToPlayer < 220 && this.lineClear(e.x, e.y, this.player.x, this.player.y)) {
          e.leapT = 0.35;
          e.leapCd = 2.2;
          this.emit({ type: 'houndLeap', x: e.x, y: e.y, angle: e.angle });
        }
        if (dToPlayer < 55 && e.meleeCd <= 0) this.enemyPunch(e);
        if (this.lineClear(e.x, e.y, this.player.x, this.player.y)) {
          this.steer(e, this.player.x, this.player.y, ENEMY_SPEED * 1.6, dt);
        } else {
          if (e.pathT <= 0 || e.path.length === 0) {
            const from = worldToTile(e.x, e.y, this.level.h);
            const to = worldToTile(this.player.x, this.player.y, this.level.h);
            e.path = this.pathfinder.find(this.level, from.cx, from.cy, to.cx, to.cy) ?? [];
            e.pathT = 0.35;
          }
          this.followPath(e, dt);
        }
        continue;
      }

      if (e.kind === 'medic' && sees) {
        let patient: Enemy | null = null;
        let lowest = Infinity;
        for (const other of this.enemies) {
          if (!other.alive || other === e || other.kind === 'boss') continue;
          if (dist(e.x, e.y, other.x, other.y) > 280) continue;
          if (other.armor >= Math.max(1, other.maxArmor)) continue;
          if (other.armor < lowest) {
            lowest = other.armor;
            patient = other;
          }
        }
        if (patient && e.medicCharges > 0 && e.healCd <= 0) {
          patient.armor = Math.min(1 + patient.maxArmor, patient.armor + 1);
          patient.maxArmor = Math.max(1, patient.maxArmor);
          e.medicCharges--;
          e.healCd = 7;
          this.emit({ type: 'medicHeal', x: patient.x, y: patient.y, angle: e.angle });
        }
        const away = dToPlayer < 280;
        const toward = dToPlayer > 460;
        const side = e.angle + (Math.PI / 2) * e.strafeSign;
        const tx = toward
          ? this.player.x
          : e.x + Math.cos(away ? e.angle + Math.PI : side) * 160;
        const ty = toward
          ? this.player.y
          : e.y + Math.sin(away ? e.angle + Math.PI : side) * 160;
        this.steer(e, tx, ty, ENEMY_SPEED * e.speedMult * (away ? 0.95 : 0.55), dt);
        if (isGun(e.weapon) && e.ammo > 0 && dToPlayer < 420) {
          e.aiming = true;
          e.fireCd -= dt;
          if (e.fireCd <= 0) this.enemyShoot(e);
        }
        continue;
      }

      if (e.kind === 'operator') {
        if (sees && dToPlayer < 520 && e.deployCd <= 0 && this.turrets.filter((t) => t.alive).length < 6) {
          this.deployTurret(e);
          e.deployCd = 9;
        }
      }

      if (e.kind === 'netrunner' && sees) {
        const away = dToPlayer < 250;
        const toward = dToPlayer > 460;
        const side = e.angle + (Math.PI / 2) * e.strafeSign;
        const tx = toward ? this.player.x : e.x + Math.cos(away ? e.angle + Math.PI : side) * 140;
        const ty = toward ? this.player.y : e.y + Math.sin(away ? e.angle + Math.PI : side) * 140;
        this.steer(e, tx, ty, ENEMY_SPEED * e.speedMult * (away ? 0.95 : 0.55), dt);
        if (e.hackCd <= 0) {
          e.aiming = true;
          e.hackT += dt;
          if (e.hackT >= 1.2) {
            this.player.hackedT = Math.max(
              this.player.hackedT,
              4 * (1 - this.mods.hackResist) * this.hackMultiplier,
            );
            e.hackT = 0;
            e.hackCd = 6;
            e.aiming = false;
            this.emit({ type: 'netrunnerHack', x: e.x, y: e.y, angle: e.angle });
          }
        } else {
          e.hackT = 0;
        }
        continue;
      }

      if (e.kind === 'grenadier') {
        if (sees && dToPlayer < 560 && e.grenadeCd <= 0) {
          const fuse = 0.85;
          const tx = this.player.x + this.player.vx * 0.12;
          const ty = this.player.y + this.player.vy * 0.12;
          const dx = tx - e.x;
          const dy = ty - e.y;
          const speed = Math.min(720, Math.max(160, Math.hypot(dx, dy) / fuse));
          const angle = Math.atan2(dy, dx);
          this.grenades.push({
            id: this.nextId++,
            x: e.x + Math.cos(angle) * 20,
            y: e.y + Math.sin(angle) * 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: fuse,
            owner: 'enemy',
          });
          e.grenadeCd = 2.6 + this.rand() * 2.2;
          e.flashT = 0.12;
          e.angle = angle;
          this.emit({ type: 'fragThrow', x: e.x, y: e.y, angle });
        }
        const away = dToPlayer < 230;
        const toward = dToPlayer > 430;
        const side = e.angle + (Math.PI / 2) * e.strafeSign;
        const tx = toward ? this.player.x : e.x + Math.cos(away ? e.angle + Math.PI : side) * 150;
        const ty = toward ? this.player.y : e.y + Math.sin(away ? e.angle + Math.PI : side) * 150;
        this.steer(e, tx, ty, ENEMY_SPEED * e.speedMult * (away ? 0.9 : 0.5), dt);
        continue;
      }

      const armed = isGun(e.weapon) && e.ammo > 0;
      const precision = e.kind === 'sniper' || e.kind === 'marksman';
      // Keep gunfights inside the visible frame whenever possible.
      // Marksman/sniper retain range but telegraph with a laser; the
      // assault archetypes have to close before they can shoot.
      const engageRange = precision
        ? e.kind === 'sniper'
          ? 520
          : 440
        : e.kind === 'heavy'
          ? 400
          : e.kind === 'gunner'
            ? 380
            : 360;

      if (sees && armed && dToPlayer < engageRange) {
        e.aiming = true;
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          this.enemyShoot(e);
        }
        e.strafeT -= dt;
        if (e.strafeT <= 0) {
          e.strafeSign = this.rand() > 0.5 ? 1 : -1;
          e.strafeT = 0.7 + this.rand() * 1.1;
        }
        if (precision) {
          if (dToPlayer < 320) {
            const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
            this.steer(
              e,
              e.x + Math.cos(a) * 160,
              e.y + Math.sin(a) * 160,
              ENEMY_SPEED * 0.8 * e.speedMult,
              dt,
            );
          } else if (dToPlayer > 560) {
            this.steer(
              e,
              this.player.x,
              this.player.y,
              ENEMY_SPEED * 0.7 * e.speedMult,
              dt,
            );
          } else {
            const side = e.angle + (Math.PI / 2) * e.strafeSign;
            this.steer(
              e,
              e.x + Math.cos(side) * 130,
              e.y + Math.sin(side) * 130,
              ENEMY_SPEED * 0.28 * e.speedMult,
              dt,
            );
          }
        } else if (dToPlayer > 250) {
          this.steer(e, this.player.x, this.player.y, ENEMY_SPEED * 0.9 * e.speedMult, dt);
        } else if (dToPlayer < 105) {
          const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
          this.steer(
            e,
            e.x + Math.cos(a) * 120,
            e.y + Math.sin(a) * 120,
            ENEMY_SPEED * 0.7 * e.speedMult,
            dt,
          );
        } else {
          const side = e.angle + (Math.PI / 2) * e.strafeSign;
          this.steer(
            e,
            e.x + Math.cos(side) * 130,
            e.y + Math.sin(side) * 130,
            ENEMY_SPEED * 0.62 * e.speedMult,
            dt,
          );
        }
      } else if ((e.kind === 'blade' || e.kind === 'stalker') && sees) {
        this.steer(e, this.player.x, this.player.y, ENEMY_SPEED * (e.kind === 'stalker' ? 1.7 : 1.5), dt);
        if (dToPlayer < 62 && e.meleeCd <= 0) this.enemyPunch(e);
      } else {
        // Close the distance, through doors if needed.
        if (e.pathT <= 0 || e.path.length === 0) {
          const from = worldToTile(e.x, e.y, this.level.h);
          const to = worldToTile(targetX, targetY, this.level.h);
          e.path = this.pathfinder.find(this.level, from.cx, from.cy, to.cx, to.cy) ?? [];
          e.pathT = 0.35 + this.rand() * 0.2;
        }
        this.followPath(e, dt);
        if (dToPlayer < (e.kind === 'boss' ? 72 : 56) && e.meleeCd <= 0) {
          this.enemyPunch(e);
        }
        if (!sees) {
          e.searchT -= dt;
          const dToPlayerNow = dist(e.x, e.y, this.player.x, this.player.y);
          if (
            dToPlayerNow < 320 &&
            this.player.camoT <= 0 &&
            this.lineClear(e.x, e.y, this.player.x, this.player.y)
          ) {
            // Keep a committed pusher interested while the player is still
            // close and visible through the sector, even if the enemy's
            // facing cone has slipped off them.
            e.searchT = Math.max(e.searchT, 1.5);
            e.angle = turnToward(
              e.angle,
              Math.atan2(this.player.y - e.y, this.player.x - e.x),
              dt * 6,
            );
            e.markT = Math.max(e.markT, 0.2);
          }
          if (e.searchT <= 0) {
            e.state = 'idle';
            e.baseAngle = e.angle;
            e.scanT = 0.4 + this.rand() * 1.2;
          }
        }
      }

      if (!sees) e.angle = turnToward(e.angle, Math.atan2(e.vy, e.vx) || e.angle, dt * 6);

      this.enemyPickupWeapon(e);
    }

    this.separateEnemies();
  }

  private enemyPickupWeapon(e: Enemy): void {
    if (
      e.kind === 'rusher' ||
      e.kind === 'grenadier' ||
      e.kind === 'blade' ||
      e.kind === 'stalker' ||
      e.kind === 'netrunner'
    ) {
      return;
    }
    if (isGun(e.weapon) && e.ammo > 0) return;
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (p.flying || !isGun(p.weapon)) continue;
      if (dist(e.x, e.y, p.x, p.y) < 34) {
        e.weapon = p.weapon;
        e.ammo = p.ammo;
        this.pickups.splice(i, 1);
        return;
      }
    }
  }

  private noticeCorpse(e: Enemy): void {
    if (e.state === 'chase' || e.state === 'alert') return;
    for (const body of this.enemies) {
      if (body.alive || body.corpseFound) continue;
      const d = dist(e.x, e.y, body.x, body.y);
      if (d > 260 * e.visionMult) continue;
      if (d > 76) {
        const a = Math.atan2(body.y - e.y, body.x - e.x);
        if (Math.abs(angleDelta(e.angle, a)) > 1.05) continue;
      }
      if (!this.lineClear(e.x, e.y, body.x, body.y)) continue;
      if (this.smokeBlocks(e.x, e.y, body.x, body.y)) continue;
      body.corpseFound = true;
      e.state = 'chase';
      e.lastSeenX = body.x;
      e.lastSeenY = body.y;
      e.searchT = 6;
      e.markT = 1;
      this.alertAt(body.x, body.y, 260);
      this.detections++;
      this.emit({ type: 'bodyFound', x: body.x, y: body.y, angle: e.angle });
      return;
    }
  }

  canSee(e: Enemy): boolean {
    const p = this.player;
    if (p.camoT > 0) return false;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d > 500 * this.mods.vision * e.visionMult * this.approachVision * this.modifierVision) {
      return false;
    }
    const committed = e.state === 'chase' || e.state === 'alert';
    const peripheral =
      committed && d < 200 * this.approachVision * this.modifierVision;
    if (
      !peripheral &&
      d > 110 * this.mods.vision * e.visionMult * this.approachVision * this.modifierVision
    ) {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      if (Math.abs(angleDelta(e.angle, a)) > 1.1) return false;
    }
    if (!this.lineClear(e.x, e.y, p.x, p.y)) return false;
    return !this.smokeBlocks(e.x, e.y, p.x, p.y);
  }

  private spot(e: Enemy): void {
    if (e.state === 'chase' || e.state === 'alert') return;
    if (!this.spotted.has(e.id)) {
      this.spotted.add(e.id);
      this.detections++;
    }
    e.state = 'alert';
    e.stateT = 0.2 + this.rand() * 0.1;
    e.markT = 0.9;
    e.fireCd = e.kind === 'sniper' ? 1.0 + this.rand() * 0.4 : 0.4 + this.rand() * 0.35;
    this.emit({ type: 'alert', x: e.x, y: e.y, angle: e.angle });
    for (const other of this.enemies) {
      if (other === e || !other.alive) continue;
      if (other.state !== 'idle') continue;
      if (dist(e.x, e.y, other.x, other.y) > 210) continue;
      other.state = 'chase';
      other.lastSeenX = this.player.x;
      other.lastSeenY = this.player.y;
      other.searchT = 9;
      other.markT = 0.9;
    }
  }

  private alertAt(x: number, y: number, radius: number): void {
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'chase' || e.state === 'alert') continue;
      if (dist(x, y, e.x, e.y) > radius) continue;
      e.state = 'chase';
      e.lastSeenX = x;
      e.lastSeenY = y;
      e.searchT = 6;
      e.markT = 0.8;
    }
  }

  private steer(e: Enemy, tx: number, ty: number, speed: number, dt: number): void {
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) {
      e.vx *= 0.85;
      e.vy *= 0.85;
      return;
    }
    const k = 1 - Math.exp(-16 * dt);
    e.vx += ((dx / d) * speed - e.vx) * k;
    e.vy += ((dy / d) * speed - e.vy) * k;
    e.x += e.vx * dt;
    this.resolveCircle(e);
    e.y += e.vy * dt;
    this.resolveCircle(e);
  }

  private followPath(e: Enemy, dt: number): void {
    if (e.path.length === 0) {
      this.steer(e, e.lastSeenX, e.lastSeenY, ENEMY_SPEED * e.speedMult, dt);
      return;
    }
    let wp = e.path[0];
    if (dist(e.x, e.y, wp.x, wp.y) < 20) {
      e.path.shift();
      if (e.path.length === 0) return;
      wp = e.path[0];
    }
    const { cx, cy } = worldToTile(wp.x, wp.y, this.level.h);
    const door = this.doorMap.get(cy * this.level.w + cx);
    if (door && !door.open && dist(e.x, e.y, door.x, door.y) < 74) {
      this.openDoor(door, false);
    }
    this.steer(e, wp.x, wp.y, ENEMY_SPEED * e.speedMult, dt);
  }

  private separateEnemies(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r + 4;
        if (d > 0.001 && d < min) {
          const push = (min - d) * 0.5;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          this.resolveCircle(a);
          this.resolveCircle(b);
        }
      }
    }
  }

  damageBoss(e: Enemy, angle: number): void {
    if (!e.alive) return;
    if (e.invulnT > 0) {
      this.addSparks(e.x, e.y, angle);
      return;
    }
    const weak = e.bossWeakT > 0;
    e.bossWeakT = 0;
    e.armor -= weak ? 2 : 1;
    e.invulnT = 0.8;
    this.addSparks(e.x, e.y, angle);
    this.shake = Math.min(1, this.shake + (weak ? 0.8 : 0.45));
    this.hitstop = Math.max(this.hitstop, weak ? 0.08 : 0.05);
    this.emit({ type: weak ? 'bossWeakHit' : 'bossHit', x: e.x, y: e.y, angle });
    if (e.armor > 0) {
      e.speedMult = Math.min(1.5, e.speedMult + 0.12);
      this.spawnReinforcements(this.bossDef.adds + Math.min(2, this.ngPlus), this.bossDef.addKind);
      if (this.bossDef.shock) this.bossShock(e);
      this.spawnBossHazards(e);
      e.bossWeakT = 1.4;
      this.emit({ type: 'bossPhase', x: e.x, y: e.y, angle: e.angle });
    } else {
      this.killEnemy(e, 'player');
    }
  }

  private spawnBossHazards(e: Enemy): void {
    if (this.lasers.length >= 8) return;
    const phase = this.time;
    this.lasers.push({
      id: this.nextId++,
      x: e.x,
      y: e.y,
      axis: 'h',
      phase,
      alive: true,
      disabledT: 1.4,
    });
    this.lasers.push({
      id: this.nextId++,
      x: e.x,
      y: e.y,
      axis: 'v',
      phase: phase + 1.3,
      alive: true,
      disabledT: 1.4,
    });
  }

  private bossShock(e: Enemy): void {
    this.explosions.push({ id: this.nextId++, x: e.x, y: e.y, life: 0.35, maxLife: 0.35 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.bullets.push({
        x: e.x + Math.cos(a) * 30,
        y: e.y + Math.sin(a) * 30,
        px: e.x,
        py: e.y,
        vx: Math.cos(a) * 680,
        vy: Math.sin(a) * 680,
        life: 0.95,
        ownerId: e.id,
        ownerKind: 'enemy',
        pierce: 0,
      });
    }
    this.shake = Math.min(1, this.shake + 0.7);
    this.hitstop = Math.max(this.hitstop, 0.06);
    this.emit({ type: 'bossShock', x: e.x, y: e.y, angle: 0 });
  }

  private enemyShoot(e: Enemy): void {
    const p = this.player;
    if (!p.alive || !isGun(e.weapon) || e.ammo <= 0) return;
    const def = WEAPONS[e.weapon];
    const precision = e.kind === 'sniper' || e.kind === 'marksman';
    e.ammo--;
    e.flashT = 0.065;
    const base = Math.atan2(
      p.y + p.vy * 0.05 - e.y,
      p.x + p.vx * 0.05 - e.x,
    );
    const spread = precision ? 0.008 : def.spread + 0.055;
    const speed = precision ? 1600 : def.speed;
    for (let i = 0; i < def.pellets; i++) {
      const a = base + (this.rand() * 2 - 1) * spread;
      this.bullets.push({
        x: e.x + Math.cos(a) * 24,
        y: e.y + Math.sin(a) * 24,
        px: e.x,
        py: e.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 1.2,
        ownerId: e.id,
        ownerKind: 'enemy',
        pierce: 0,
      });
    }
    e.fireCd =
      (precision
        ? 1.7 + this.rand() * 0.9
        : Math.max(0.55, def.cooldown * (2.4 + this.rand() * 1.8))) * this.modifierFire;
    this.addCasing(e.x, e.y, e.angle);
    this.emit({
      type: precision ? 'sniperShot' : e.weapon === 'shotgun' ? 'enemyShotgun' : 'enemyShot',
      x: e.x,
      y: e.y,
      angle: e.angle,
    });
    if (dist(e.x, e.y, p.x, p.y) < 620) this.shake = Math.min(1, this.shake + 0.035);
  }

  private addCasing(x: number, y: number, angle: number): void {
    emitCasing(this.particles, this.rand, x, y, angle);
  }

  private enemyPunch(e: Enemy): void {
    if (!this.player.alive) return;
    e.meleeCd = 0.75;
    e.angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
    this.deathCause = 'MELEE';
    this.emit({ type: 'enemyPunch', x: e.x, y: e.y, angle: e.angle });
    this.killPlayer(e.angle);
  }

  damageHeavy(e: Enemy, angle: number): void {
    if (e.armor <= 0) return;
    e.armor--;
    e.flashT = 0.08;
    e.invulnT = 0.06;
    this.addSparks(e.x + Math.cos(angle) * 16, e.y + Math.sin(angle) * 16, angle + Math.PI);
    this.emit({ type: 'armorHitEnemy', x: e.x, y: e.y, angle });
    if (e.armor <= 0) this.emit({ type: 'armorBreakEnemy', x: e.x, y: e.y, angle });
  }

  killPlayer(angle: number): void {
    const p = this.player;
    if (!p.alive) return;
    if (p.invulnT > 0) return;
    if (p.armor > 0) {
      p.armor--;
      this.combo = 0;
      this.comboT = 0;
      p.invulnT = 0.9;
      p.regenT = 0;
      if (this.mods.kerenzikov > 0 && p.kerenCd <= 0) {
        p.slowT = Math.max(p.slowT, 0.9 + this.mods.kerenzikov * 0.3);
        p.kerenCd = 9;
        this.emit({ type: 'kerenzikov', x: p.x, y: p.y, angle });
      }
      this.hitstop = Math.max(this.hitstop, 0.05);
      this.shake = 1;
      this.addSparks(p.x, p.y, angle);
      this.emit({ type: 'armorHit', x: p.x, y: p.y, angle });
      return;
    }
    if (this.mods.heart > 0 && !p.revived) {
      p.revived = true;
      p.armor = 1;
      p.maxArmor = Math.max(1, p.maxArmor);
      p.invulnT = 2;
      p.regenT = 0;
      this.hitstop = Math.max(this.hitstop, 0.08);
      this.shake = 1;
      this.addSparks(p.x, p.y, angle);
      this.emit({ type: 'secondHeart', x: p.x, y: p.y, angle });
      return;
    }
    p.alive = false;
    this.combo = 0;
    this.comboT = 0;
    p.corpseAngle = angle + Math.PI + (this.rand() - 0.5) * 1.4;
    this.state = 'dead';
    this.hitstop = Math.max(this.hitstop, 0.07);
    this.shake = 1;
    this.addBlood(p.x, p.y, angle, 2.2);
    this.emit({ type: 'playerDeath', x: p.x, y: p.y, angle });
  }

  /* ------------------------------------------------------------------ */
  /* bullets                                                             */
  /* ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ */
  /* pickups                                                             */
  /* ------------------------------------------------------------------ */

  private updatePickups(dt: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (!p.flying) continue;
      const px = p.x;
      const py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      let stopped = false;

      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (segmentHitsCircle(px, py, p.x, p.y, e.x, e.y, e.r + 4)) {
          if (e.kind === 'boss') this.damageBoss(e, Math.atan2(p.vy, p.vx));
          else this.killEnemy(e, 'player');
          stopped = true;
          break;
        }
      }
      if (!stopped) {
        for (const barrel of this.barrels) {
          if (!barrel.alive) continue;
          if (segmentHitsCircle(px, py, p.x, p.y, barrel.x, barrel.y, barrel.r)) {
            this.blowBarrel(barrel);
            stopped = true;
            break;
          }
        }
      }
      if (this.solidAt(p.x, p.y)) {
        p.x = px;
        p.y = py;
        stopped = true;
      }
      if (stopped) {
        p.flying = false;
        p.vx = 0;
        p.vy = 0;
        p.spin = 0;
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* effects                                                             */
  /* ------------------------------------------------------------------ */

  private updateParticles(dt: number): void {
    stepParticles(this.particles, this.decals, dt);
  }

  addSparks(x: number, y: number, angle: number): void {
    emitSparks(this.particles, this.rand, x, y, angle);
  }

  addBlood(x: number, y: number, angle: number, amount = 1): void {
    emitBlood(this.particles, this.decals, this.rand, x, y, angle, amount);
  }

  /* ------------------------------------------------------------------ */
  /* doors / death                                                       */
  /* ------------------------------------------------------------------ */

  private updateDoors(dt: number): void {
    if (this.mission.modifiers?.includes('lockdown')) {
      const p = this.player;
      for (const d of this.doors) {
        if (!d.open || d.locked) continue;
        const dx = d.x - p.x;
        const dy = d.y - p.y;
        if (Math.hypot(dx, dy) > 80 && dx * p.vx + dy * p.vy < 0) {
          d.locked = true;
          d.open = false;
          d.target = 0;
          d.speed = 8;
        }
      }
    }
    updateDoorAngles(this.doors, dt);
  }

  openDoor(d: Door, kicked: boolean): void {
    if (d.locked) {
      if (!kicked) return;
      this.emit({ type: 'doorLocked', x: d.x, y: d.y, angle: d.angle });
      d.locked = false;
    }
    if (d.open) return;
    d.open = true;
    d.target = d.axis === 'h' ? 1.45 : -1.45;
    d.speed = kicked ? 16 : 4.2;
    this.emit({ type: kicked ? 'doorSlam' : 'doorOpen', x: d.x, y: d.y, angle: d.angle });
    if (kicked) this.addHeat(3);
    this.shake = Math.min(1, this.shake + (kicked ? 0.34 : 0.03));
    if (kicked) {
      const radius = 88 + this.mods.gorilla * 26;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (dist(e.x, e.y, d.x, d.y) <= radius) this.killEnemy(e, 'player');
      }
      this.alertAt(d.x, d.y, 300);
      this.hitstop = Math.max(this.hitstop, 0.04);
    }
  }

  killEnemy(e: Enemy, by: 'player' | 'enemy' | 'door', silent = false): void {
    if (!e.alive) return;
    e.alive = false;
    e.state = 'dead';
    const impact = Math.atan2(e.y - this.player.y, e.x - this.player.x);
    e.deathVx = Math.cos(impact) * 150;
    e.deathVy = Math.sin(impact) * 150;
    e.corpseAngle = e.angle + (this.rand() - 0.5) * 3;
    e.flashT = 0;
    e.markT = 0;
    this.kills++;
    if (by === 'player') {
      this.combo++;
      this.comboT = 3 + this.mods.comboWindow;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
    }
    if (by === 'player' && this.mods.killSpeed > 0) {
      this.player.killSpeedT = 4;
    }
    this.addBlood(e.x, e.y, impact, 1);
    if (silent) {
      this.stealthKills++;
      this.emit({ type: 'stealthKill', x: e.x, y: e.y, angle: e.corpseAngle });
      this.hitstop = Math.max(this.hitstop, 0.03);
      this.shake = Math.min(1, this.shake + 0.12);
    } else {
      this.emit({ type: 'kill', x: e.x, y: e.y, angle: e.corpseAngle });
      this.hitstop = Math.max(this.hitstop, by === 'player' ? 0.038 : 0.02);
      this.shake = Math.min(1, this.shake + 0.3);
    }

    if (e.weapon !== 'fists') {
      let variant: NamedWeaponId | null = null;
      if (e.weapon === 'pistol' && this.rand() < 0.12) variant = 'viper';
      else if (e.weapon === 'shotgun' && this.rand() < 0.12) variant = 'widowmaker';
      else if (e.weapon === 'rifle' && this.rand() < 0.08) variant = 'kensei';
      else if (e.weapon === 'lmg' && this.rand() < 0.06) variant = 'brute';
      else if (e.weapon === 'revolver' && this.rand() < 0.1) variant = 'hangman';
      else if (e.weapon === 'dmr' && this.rand() < 0.08) variant = 'longshot';
      else if (e.weapon === 'carbine' && this.rand() < 0.08) variant = 'vesper';
      else if (e.weapon === 'plasma' && this.rand() < 0.06) variant = 'sunlance';
      this.pickups.push({
        id: this.nextId++,
        x: e.x + (this.rand() - 0.5) * 22,
        y: e.y + (this.rand() - 0.5) * 22,
        vx: 0,
        vy: 0,
        weapon: e.weapon,
        ammo: e.ammo,
        flying: false,
        angle: this.rand() * Math.PI * 2,
        spin: 0,
        attachment: null,
        variant,
      });
    }

    this.checkObjective();
  }

  /* ------------------------------------------------------------------ */
  /* collision                                                           */
  /* ------------------------------------------------------------------ */

  private resolveCircle(e: { x: number; y: number; r: number }): void {
    const r = e.r;
    const minCx = Math.floor((e.x - r) / TILE);
    const maxCx = Math.floor((e.x + r) / TILE);
    const minCy = this.level.h - 1 - Math.floor((e.y + r) / TILE);
    const maxCy = this.level.h - 1 - Math.floor((e.y - r) / TILE);

    for (let iter = 0; iter < 2; iter++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          if (!this.isSolidTile(cx, cy)) continue;
          const bx = cx * TILE;
          const by = (this.level.h - 1 - cy) * TILE;
          const closestX = clamp(e.x, bx, bx + TILE);
          const closestY = clamp(e.y, by, by + TILE);
          let dx = e.x - closestX;
          let dy = e.y - closestY;
          let d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          if (d2 < 0.0001) {
            // Center is inside the tile: push out along the shallowest axis.
            const left = e.x - bx;
            const right = bx + TILE - e.x;
            const down = e.y - by;
            const up = by + TILE - e.y;
            const m = Math.min(left, right, down, up);
            if (m === left) e.x = bx - r;
            else if (m === right) e.x = bx + TILE + r;
            else if (m === down) e.y = by - r;
            else e.y = by + TILE + r;
            continue;
          }
          const d = Math.sqrt(d2);
          dx /= d;
          dy /= d;
          const push = r - d;
          e.x += dx * push;
          e.y += dy * push;
        }
      }
    }
  }
}
