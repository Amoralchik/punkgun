import { Input } from '../core/input';
import { angleDelta, clamp, dist, mulberry32, randomSeed, turnToward } from '../core/math';
import { Level, TILE, isWall, tileCenter, worldToTile } from './map';
import { Pathfinder } from './path';
import { baseMods, RunMods } from './progression';
import { CONSUMABLE_MAP, ConsumableId } from './consumables';
import { ATTACHMENT_MAP, AttachmentId } from './attachments';
import { LOOT_DEFS } from './economy';
import { GunId, WEAPONS, WeaponId, isGun, NamedWeaponId, NAMED_MAP } from './weapons';
import { APPROACH_MAP, ApproachId } from './attributes';
import { ModifierId } from './modifiers';
import { ENEMY_TRAITS, pickEnemyKind, rollEnemyLoadout } from './enemy-data';
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
  Particle,
  Pickup,
  Player,
  SmokeCloud,
  WorldEvent,
  WorldState,
} from './world-types';

const PLAYER_SPEED = 252;
const ENEMY_SPEED = 148;
const SWING_DURATION = 0.24;
const SWING_HIT_AT = 0.065;

function segmentHitsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = 0;
  if (l2 > 0.0001) t = clamp(((cx - ax) * dx + (cy - ay) * dy) / l2, 0, 1);
  const px = ax + dx * t;
  const py = ay + dy * t;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey <= r * r;
}

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
  readonly doors: Door[] = [];
  readonly decals: Decal[] = [];
  readonly particles: Particle[] = [];
  readonly smokes: SmokeCloud[] = [];
  readonly grenades: Grenade[] = [];
  readonly explosions: Explosion[] = [];

  state: WorldState = 'playing';
  time = 0;
  kills = 0;
  lootValue = 0;
  exitOpen = false;
  targetId: number | null = null;
  heat = 0;
  peakHeat = 0;
  shotsFired = 0;
  shotsHit = 0;
  stealthKills = 0;
  deathCause = 'UNKNOWN';
  reinforcementWave = 0;
  readonly mission: MissionSpec;
  private readonly mods: RunMods;
  private approachVision = 1;
  hitstop = 0;
  shake = 0;

  private readonly doorMap = new Map<number, Door>();
  private readonly pathfinder: Pathfinder;
  private readonly rand: () => number;
  private nextId = 1;

  constructor(
    readonly level: Level,
    private readonly input: Input,
    private readonly emit: (e: WorldEvent) => void,
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
      });
      laserPhase += 0.85;
    }

    for (const d of level.doors) {
      const center = tileCenter(d.cx, d.cy, level.h);
      const door: Door = {
        ...d,
        open: false,
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
    const clip = isGun(loadWeapon) ? Math.min(totalAmmo, loadDef.mag) : 0;

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
      revived: false,
      regenT: 0,
      hackedT: 0,
    };

    level.enemies.forEach((spawn, i) =>
      this.addEnemy(spawn.x, spawn.y, i % 2 === 0 ? 1 : -1, 'idle', spawn.kind),
    );

        if (mission.objective === 'boss' && level.boss) {
      const boss = this.addEnemy(level.boss.x, level.boss.y, 1, 'idle', 'boss');
      boss.isTarget = true;
      this.targetId = boss.id;
    }

    // Give the player the briefing window before any enemy can act.
    for (const enemy of this.enemies) enemy.stunT = 1.2;
    this.applyApproach(mission.approach ?? 'standard');

    if (mission.objective === 'target' && this.enemies.length > 0) {
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
      this.targetId = best.id;
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
  }

  private applyModifiers(ids: ModifierId[]): void {
    if (ids.length === 0) return;
    if (ids.includes('elite')) {
      for (const e of this.enemies) {
        e.armor++;
        e.maxArmor++;
      }
    }
    if (ids.includes('hotLoot')) {
      for (const item of this.loot) item.value = Math.round(item.value * 1.5);
    }
    if (ids.includes('alarm')) {
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
  }

  get aliveEnemies(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  get boss(): Enemy | null {
    return this.enemies.find((e) => e.kind === 'boss') ?? null;
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

  objectiveText(): string {
    if (this.exitOpen) return 'EXIT OPEN — GET OUT';
    if (this.mission.objective === 'purge') {
      return `PURGE ${this.enemies.length - this.aliveEnemies}/${this.enemies.length}`;
    }
    if (this.mission.objective === 'target') {
      const target = this.enemies.find((e) => e.id === this.targetId);
      return target && target.alive ? 'KILL THE MARKED TARGET' : 'TARGET DOWN — EXIT';
    }
    if (this.mission.objective === 'boss') {
      const boss = this.boss;
      return boss ? `BOSS ARMOR ${boss.armor}/${boss.maxArmor}` : 'KILL THE BOSS';
    }
    return `CACHES ${this.collectedLoot}/${this.mission.requiredLoot}`;
  }

  private checkObjective(): void {
    if (this.exitOpen) return;
    let done = false;
    if (this.mission.objective === 'purge') {
      done = this.aliveEnemies === 0;
    } else if (this.mission.objective === 'target') {
      const target = this.enemies.find((e) => e.id === this.targetId);
      done = !!target && !target.alive;
    } else if (this.mission.objective === 'boss') {
      const boss = this.boss;
      done = !!boss && !boss.alive;
    } else {
      done = this.collectedLoot >= this.mission.requiredLoot;
    }
    if (!done) return;
    this.exitOpen = true;
    this.emit({ type: 'exitOpen', x: this.level.exit.x, y: this.level.exit.y, angle: 0 });
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
    this.updateLasers();
    this.updateEnemies(dt * slow);
    this.updateBullets(dt, slow);
    this.updatePickups(dt);
    this.updateGrenades(dt);
    this.updateSmokes(dt);
    this.updateParticles(dt);
    this.updateDoors(dt);

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
  }

  /* ------------------------------------------------------------------ */
  /* queries                                                             */
  /* ------------------------------------------------------------------ */

  isSolidTile(cx: number, cy: number): boolean {
    if (isWall(this.level, cx, cy)) return true;
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
      if (this.solidAt(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
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

  private spawnReinforcements(count: number): void {
    const p = this.player;
    const points = [...this.level.enemies]
      .map((spawn) => ({ ...spawn, d: dist(spawn.x, spawn.y, p.x, p.y) }))
      .sort((a, b) => b.d - a.d)
      .slice(0, count);
    for (const point of points) {
      this.addEnemy(point.x, point.y, 1, 'chase', point.kind);
    }
    this.emit({ type: 'siren', x: p.x, y: p.y, angle: 0 });
  }

  private addHeat(amount: number): void {
    this.heat = Math.min(100, this.heat + amount);
    this.peakHeat = Math.max(this.peakHeat, this.heat);
    if (this.exitOpen) return;
    if (this.heat >= 55 && this.reinforcementWave < 1) {
      this.reinforcementWave = 1;
      this.spawnReinforcements(2);
    }
    if (this.heat >= 90 && this.reinforcementWave < 2) {
      this.reinforcementWave = 2;
      this.spawnReinforcements(2);
    }
  }

  private nearestBackstab(): Enemy | null {
    const p = this.player;
    let best: Enemy | null = null;
    let bestD = 66;
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
    if (this.nearestBackstab()) return 'E — SILENT TAKEDOWN';
    const loot = this.nearestLoot();
    if (loot) return `E — GRAB ${LOOT_DEFS[loot.kind].name} · $${loot.value}`;
    const p = this.nearestPickup();
    if (p) return `E — TAKE ${WEAPONS[p.weapon].name}`;
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
    const dx = p.aimX - p.x;
    const dy = p.aimY - p.y;
    if (dx * dx + dy * dy > 16) p.angle = Math.atan2(dy, dx);

    p.attackCd = Math.max(0, p.attackCd - dt);
    if (p.reloadT > 0) {
      const prev = p.reloadT;
      p.reloadT = Math.max(0, p.reloadT - dt);
      if (prev > 0 && p.reloadT === 0) this.finishReload();
    }
    p.flashT = Math.max(0, p.flashT - dt);
    p.invulnT = Math.max(0, p.invulnT - dt);
    p.slowT = Math.max(0, p.slowT - dt);
    p.slowCd = Math.max(0, p.slowCd - dt);
    p.camoT = Math.max(0, p.camoT - dt);
    p.camoCloakCd = Math.max(0, p.camoCloakCd - dt);
    p.hackedT = Math.max(0, p.hackedT - dt);
    p.regenT += dt;
    if (
      this.mods.biomonitor > 0 &&
      p.armor < p.maxArmor &&
      p.regenT >= 6 - (this.mods.biomonitor - 1) * 1.5
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
      if (
        p.hackedT <= 0 &&
        (this.input.wasPressed('ShiftLeft') || this.input.wasPressed('ShiftRight')) &&
        this.mods.sandevistan > 0 &&
        p.slowCd <= 0
      ) {
        p.slowT = 2.5 + (this.mods.sandevistan - 1) * 0.8;
        p.slowCd = 14 - (this.mods.sandevistan - 1) * 3;
        this.emit({ type: 'sandevistan', x: p.x, y: p.y, angle: p.angle });
      }
      if (this.input.wasPressed('KeyC') && p.hackedT <= 0 && this.mods.camo > 0 && p.camoCloakCd <= 0) {
        p.camoT = 2.5 + (this.mods.camo - 1) * 0.8;
        p.camoCloakCd = 12 - (this.mods.camo - 1) * 2;
        this.emit({ type: 'camo', x: p.x, y: p.y, angle: p.angle });
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

    let ix = 0;
    let iy = 0;
    if (this.input.held('KeyA') || this.input.held('ArrowLeft')) ix -= 1;
    if (this.input.held('KeyD') || this.input.held('ArrowRight')) ix += 1;
    if (this.input.held('KeyS') || this.input.held('ArrowDown')) iy -= 1;
    if (this.input.held('KeyW') || this.input.held('ArrowUp')) iy += 1;
    const len = Math.hypot(ix, iy) || 1;
    ix /= len;
    iy /= len;

    const speed = PLAYER_SPEED * this.mods.speed;
    const k = 1 - Math.exp(-24 * dt);
    p.vx += (ix * speed - p.vx) * k;
    p.vy += (iy * speed - p.vy) * k;

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
    if (p.clip >= def.mag || p.ammo <= 0) return;
    p.reloadT = def.reload;
    p.attackCd = Math.max(p.attackCd, 0.1);
    this.emit({ type: 'reloadStart', x: p.x, y: p.y, angle: p.angle });
  }

  private finishReload(): void {
    const p = this.player;
    if (!p.alive || !isGun(p.weapon)) return;
    const def = WEAPONS[p.weapon];
    const take = Math.min(def.mag - p.clip, p.ammo);
    if (take <= 0) return;
    p.clip += take;
    p.ammo -= take;
    this.emit({ type: 'reloadEnd', x: p.x, y: p.y, angle: p.angle });
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
    const shotHeat = def.sound === 'lmg' ? 11 : def.sound === 'rifle' ? 9 : def.sound === 'ak' ? 8 : shotgun ? 16 : 7;
    const alertRadius =
      def.sound === 'lmg' ? 1180 : def.sound === 'rifle' ? 980 : def.sound === 'ak' ? 860 : shotgun ? 900 : 760;
    this.addHeat(shotHeat * (suppressed ? 0.4 : 1));
    const spring = p.attachment === 'spring' ? 0.8 : 1;
    p.attackCd = def.cooldown * this.mods.gunCooldown * spring;
    p.flashT = 0.06;
    const variantSpread = p.variant ? NAMED_MAP[p.variant].spreadMult : 1;
    const laser = p.attachment === 'laser' ? 0.65 : 1;
    const muzzleX = p.x + Math.cos(p.angle) * 26;
    const muzzleY = p.y + Math.sin(p.angle) * 26;

    for (let i = 0; i < def.pellets; i++) {
      const a =
        p.angle +
        (this.rand() * 2 - 1) * def.spread * this.mods.spread * variantSpread * laser;
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
        pierce: def.pierce,
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
    this.alertAt(p.x, p.y, alertRadius * (suppressed ? 0.45 : 1));
  }

  private resolveMelee(): void {
    const p = this.player;
    const def = WEAPONS[p.weapon];
    const reach = def.range * this.mods.meleeReach + 16;
    let hitAny = false;
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
      if (e.kind === 'heavy' && e.armor > 0) {
        this.damageHeavy(e, a);
        hitAny = true;
        continue;
      }
      if (e.kind === 'shield' && this.mods.gorilla === 0) {
        const toPlayer = Math.atan2(p.y - e.y, p.x - e.x);
        if (Math.abs(angleDelta(e.angle, toPlayer)) < 1.3) {
          this.addSparks(
            e.x + Math.cos(toPlayer) * 20,
            e.y + Math.sin(toPlayer) * 20,
            toPlayer,
          );
          if (e.shieldT <= 0) {
            e.shieldT = 0.14;
            this.emit({ type: 'shieldHit', x: e.x, y: e.y, angle: toPlayer });
          }
          hitAny = true;
          continue;
        }
      }
      this.killEnemy(e, 'player', this.mods.mantis > 0);
      hitAny = true;
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

  private smokeBlocks(ax: number, ay: number, bx: number, by: number): boolean {
    for (const smoke of this.smokes) {
      if (smoke.life <= 0) continue;
      if (segmentHitsCircle(ax, ay, bx, by, smoke.x, smoke.y, smoke.r)) return true;
    }
    return false;
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
        this.explode(g.x, g.y, g.owner);
        this.grenades.splice(i, 1);
      }
    }
  }

  private explode(x: number, y: number, owner: 'player' | 'enemy' | 'barrel'): void {
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
      if (this.player.alive && dist(x, y, this.player.x, this.player.y) <= 115) {
        this.deathCause = 'EXPLOSION';
        this.killPlayer(Math.atan2(this.player.y - y, this.player.x - x));
      }
    }
    if (owner !== 'enemy') {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (dist(x, y, e.x, e.y) > 115) continue;
        if (e.kind === 'boss') this.damageBoss(e, Math.atan2(e.y - y, e.x - x));
        else this.killEnemy(e, 'player');
      }
    }
    for (const b of this.barrels) {
      if (!b.alive || dist(x, y, b.x, b.y) > 140) continue;
      this.blowBarrel(b);
    }
    for (const t of this.turrets) {
      if (!t.alive || dist(x, y, t.x, t.y) > 130) continue;
      t.alive = false;
      this.emit({ type: 'turretBroken', x: t.x, y: t.y, angle: t.angle });
    }
    for (const l of this.lasers) {
      if (!l.alive || dist(x, y, l.x, l.y) > 130) continue;
      l.alive = false;
      this.emit({ type: 'laserBroken', x: l.x, y: l.y, angle: 0 });
    }
  }

  private blowBarrel(b: Barrel): void {
    if (!b.alive) return;
    b.alive = false;
    this.explode(b.x, b.y, 'barrel');
  }

  private playerInteract(): void {
    const p = this.player;
    const backstab = this.nearestBackstab();
    if (backstab) {
      this.killEnemy(backstab, 'player', true);
      return;
    }
    const loot = this.nearestLoot();
    if (loot) {
      loot.collected = true;
      this.lootValue += loot.value;
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
        this.emit({ type: 'cameraAlert', x: cam.x, y: cam.y, angle: cam.angle });
        this.alertAt(cam.x, cam.y, 330);
        this.addHeat(6);
      }
      cam.alertT = 2.2;
    }
  }

  private updateLasers(): void {
    const p = this.player;
    if (!p.alive || p.invulnT > 0) return;
    for (const l of this.lasers) {
      if (!l.alive) continue;
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
    });
    this.emit({ type: 'operatorDeploy', x, y, angle: e.angle });
  }

  private updateTurrets(dt: number): void {
    const p = this.player;
    for (const t of this.turrets) {
      if (!t.alive) continue;
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
        e.searchT = 7;
      }

      if (e.state === 'idle') {
        e.scanT -= dt;
        if (e.scanT <= 0) {
          e.targetAngle = e.baseAngle + (this.rand() - 0.5) * 1.8;
          e.scanT = 1.4 + this.rand() * 2.4;
        }
        e.angle = turnToward(e.angle, e.targetAngle, dt * 2);
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
        if (e.bossChargeCd <= 0 && sees && phase >= 2 && dToPlayer > 90 && dToPlayer < 560) {
          e.bossChargeT = 0.7;
          e.bossChargeCd = 8;
          e.aiming = true;
          this.emit({ type: 'bossCharge', x: e.x, y: e.y, angle: e.angle });
          continue;
        }
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
            this.player.hackedT = Math.max(this.player.hackedT, 4);
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
      } else if (e.kind === 'blade' && sees) {
        this.steer(e, this.player.x, this.player.y, ENEMY_SPEED * 1.5, dt);
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
      this.emit({ type: 'bodyFound', x: body.x, y: body.y, angle: e.angle });
      return;
    }
  }

  private canSee(e: Enemy): boolean {
    const p = this.player;
    if (p.camoT > 0) return false;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d > 500 * this.mods.vision * e.visionMult * this.approachVision) return false;
    if (d > 110 * this.mods.vision * e.visionMult * this.approachVision) {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      if (Math.abs(angleDelta(e.angle, a)) > 1.1) return false;
    }
    if (!this.lineClear(e.x, e.y, p.x, p.y)) return false;
    return !this.smokeBlocks(e.x, e.y, p.x, p.y);
  }

  private spot(e: Enemy): void {
    if (e.state === 'chase' || e.state === 'alert') return;
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
      other.searchT = 7;
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

  private damageBoss(e: Enemy, angle: number): void {
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
      this.spawnReinforcements(2);
      this.bossShock(e);
      e.bossWeakT = 1.4;
      this.emit({ type: 'bossPhase', x: e.x, y: e.y, angle });
    } else {
      this.killEnemy(e, 'player');
    }
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
    e.fireCd = precision
      ? 1.7 + this.rand() * 0.9
      : Math.max(0.55, def.cooldown * (2.4 + this.rand() * 1.8));
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

  private damageHeavy(e: Enemy, angle: number): void {
    if (e.armor <= 0) return;
    e.armor--;
    e.flashT = 0.08;
    e.invulnT = 0.06;
    this.addSparks(e.x + Math.cos(angle) * 16, e.y + Math.sin(angle) * 16, angle + Math.PI);
    this.emit({ type: 'armorHitEnemy', x: e.x, y: e.y, angle });
    if (e.armor <= 0) this.emit({ type: 'armorBreakEnemy', x: e.x, y: e.y, angle });
  }

  private killPlayer(angle: number): void {
    const p = this.player;
    if (!p.alive) return;
    if (p.invulnT > 0) return;
    if (p.armor > 0) {
      p.armor--;
      p.invulnT = 0.9;
      p.regenT = 0;
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

  private updateBullets(dt: number, enemyScale = 1): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const step = b.ownerKind === 'player' ? dt : dt * enemyScale;
      b.px = b.x;
      b.py = b.y;
      b.x += b.vx * step;
      b.y += b.vy * step;
      b.life -= step;

      if (b.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (this.solidAt(b.x, b.y)) {
        this.addSparks(b.x, b.y, Math.atan2(-b.vy, -b.vx));
        this.bullets.splice(i, 1);
        continue;
      }

      let hit = false;
      for (const barrel of this.barrels) {
        if (!barrel.alive) continue;
        if (
          segmentHitsCircle(b.px, b.py, b.x, b.y, barrel.x, barrel.y, barrel.r)
        ) {
          this.blowBarrel(barrel);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const cam of this.cameras) {
          if (!cam.alive) continue;
          if (segmentHitsCircle(b.px, b.py, b.x, b.y, cam.x, cam.y, 20)) {
            cam.alive = false;
            this.addSparks(cam.x, cam.y, Math.atan2(-b.vy, -b.vx));
            this.emit({ type: 'cameraBroken', x: cam.x, y: cam.y, angle: cam.angle });
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (const t of this.turrets) {
          if (!t.alive) continue;
          if (segmentHitsCircle(b.px, b.py, b.x, b.y, t.x, t.y, 22)) {
            t.alive = false;
            this.addSparks(t.x, t.y, Math.atan2(-b.vy, -b.vx));
            this.emit({ type: 'turretBroken', x: t.x, y: t.y, angle: t.angle });
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (const l of this.lasers) {
          if (!l.alive) continue;
          if (segmentHitsCircle(b.px, b.py, b.x, b.y, l.x, l.y, 20)) {
            l.alive = false;
            this.addSparks(l.x, l.y, Math.atan2(-b.vy, -b.vx));
            this.emit({ type: 'laserBroken', x: l.x, y: l.y, angle: 0 });
            hit = true;
            break;
          }
        }
      }
      if (!hit && b.ownerKind !== 'player' && this.player.alive) {
        if (segmentHitsCircle(b.px, b.py, b.x, b.y, this.player.x, this.player.y, this.player.r)) {
          this.deathCause = 'GUNFIRE';
          this.killPlayer(Math.atan2(b.vy, b.vx));
          hit = true;
        }
      }
      if (!hit) {
        for (const e of this.enemies) {
          if (!e.alive || e.id === b.ownerId) continue;
          if (segmentHitsCircle(b.px, b.py, b.x, b.y, e.x, e.y, e.r)) {
            const from = Math.atan2(-b.vy, -b.vx);
            if (e.kind === 'boss') {
              if (b.ownerKind === 'player') this.shotsHit++;
              this.damageBoss(e, from);
              hit = true;
              break;
            }
            if (e.kind === 'shield' && Math.abs(angleDelta(e.angle, from)) < 1.25) {
              this.addSparks(b.x, b.y, from + Math.PI);
              if (e.shieldT <= 0) {
                e.shieldT = 0.14;
                this.emit({ type: 'shieldHit', x: e.x, y: e.y, angle: from });
              }
              hit = true;
              break;
            }
            if (e.kind === 'heavy' && e.armor > 0) {
              if (b.ownerKind === 'player') this.shotsHit++;
              this.damageHeavy(e, from);
              hit = true;
              break;
            }
            if (b.ownerKind === 'player') this.shotsHit++;
            this.killEnemy(e, b.ownerKind === 'player' ? 'player' : 'enemy');
            if (b.ownerKind === 'player' && b.pierce > 0) {
              b.pierce--;
              continue;
            }
            hit = true;
            break;
          }
        }
      }
      if (hit) this.bullets.splice(i, 1);
    }
  }

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
    for (const d of this.doors) {
      if (Math.abs(d.angle - d.target) < 0.01) {
        d.angle = d.target;
        continue;
      }
      const step = d.speed * dt;
      if (d.angle < d.target) d.angle = Math.min(d.target, d.angle + step);
      else d.angle = Math.max(d.target, d.angle - step);
    }
  }

  openDoor(d: Door, kicked: boolean): void {
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

  private killEnemy(e: Enemy, by: 'player' | 'enemy' | 'door', silent = false): void {
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
