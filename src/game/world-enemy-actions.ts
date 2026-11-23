import { dist } from '../core/math';
import { isEnemyAiming } from './enemy-data';
import { worldToTile } from './map';
import { ENEMY_SPEED } from './world-ai';
import { isGun } from './weapons';
import type { Level } from './map';
import type { Pathfinder } from './path';
import type { RunMods } from './progression';
import type {
  Enemy,
  Grenade,
  Player,
  Turret,
  WorldEvent,
} from './world-types';

/** World surface used by archetype-specific chase behavior. */
export interface EnemyActionHost {
  player: Player;
  enemies: Enemy[];
  turrets: Turret[];
  grenades: Grenade[];
  level: Level;
  pathfinder: Pathfinder;
  mods: RunMods;
  hackMultiplier: number;
  rand(): number;
  nextId(): number;
  emit(event: WorldEvent): void;
  steer(e: Enemy, tx: number, ty: number, speed: number, dt: number): void;
  followPath(e: Enemy, dt: number): void;
  lineClear(ax: number, ay: number, bx: number, by: number): boolean;
  deployTurret(e: Enemy): void;
  enemyPunch(e: Enemy): void;
  enemyShoot(e: Enemy): void;
}

/**
 * Run the hound/medic/operator/netrunner/grenadier branch for one enemy.
 * Returns true when the branch consumed the turn (the caller should `continue`).
 */
export function runEnemyArchetype(
  host: EnemyActionHost,
  e: Enemy,
  dt: number,
  sees: boolean,
  dToPlayer: number,
): boolean {
  if (e.kind === 'hound' && sees) {
    if (e.leapT > 0) {
      const a = Math.atan2(host.player.y - e.y, host.player.x - e.x);
      e.angle = a;
      host.steer(e, host.player.x, host.player.y, ENEMY_SPEED * 3, dt);
      if (dToPlayer < 55 && e.meleeCd <= 0) host.enemyPunch(e);
      return true;
    }
    if (
      e.leapCd <= 0 &&
      dToPlayer < 220 &&
      host.lineClear(e.x, e.y, host.player.x, host.player.y)
    ) {
      e.leapT = 0.35;
      e.leapCd = 2.2;
      e.markT = Math.max(e.markT, 0.35);
      host.emit({ type: 'houndLeap', x: e.x, y: e.y, angle: e.angle });
    }
    if (dToPlayer < 55 && e.meleeCd <= 0) host.enemyPunch(e);
    if (host.lineClear(e.x, e.y, host.player.x, host.player.y)) {
      host.steer(e, host.player.x, host.player.y, ENEMY_SPEED * 1.6, dt);
    } else {
      if (e.pathT <= 0 || e.path.length === 0) {
        const from = worldToTile(e.x, e.y, host.level.h);
        const to = worldToTile(host.player.x, host.player.y, host.level.h);
        e.path = host.pathfinder.find(host.level, from.cx, from.cy, to.cx, to.cy) ?? [];
        e.pathT = 0.35;
      }
      host.followPath(e, dt);
    }
    return true;
  }

  if (e.kind === 'medic' && sees) {
    let patient: Enemy | null = null;
    let lowest = Infinity;
    for (const other of host.enemies) {
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
      host.emit({ type: 'medicHeal', x: patient.x, y: patient.y, angle: e.angle });
    }
    const away = dToPlayer < 280;
    const toward = dToPlayer > 460;
    const side = e.angle + (Math.PI / 2) * e.strafeSign;
    const tx = toward
      ? host.player.x
      : e.x + Math.cos(away ? e.angle + Math.PI : side) * 160;
    const ty = toward
      ? host.player.y
      : e.y + Math.sin(away ? e.angle + Math.PI : side) * 160;
    host.steer(e, tx, ty, ENEMY_SPEED * e.speedMult * (away ? 0.95 : 0.55), dt);
    if (isGun(e.weapon) && e.ammo > 0 && dToPlayer < 420) {
      e.aiming = isEnemyAiming(e.kind, e.fireCd);
      e.fireCd -= dt;
      if (e.fireCd <= 0) host.enemyShoot(e);
    }
    return true;
  }

  if (e.kind === 'operator') {
    if (
      sees &&
      dToPlayer < 520 &&
      e.deployCd <= 0 &&
      host.turrets.filter((t) => t.alive).length < 6
    ) {
      host.deployTurret(e);
      e.deployCd = 9;
    }
  }

  if (e.kind === 'netrunner' && sees) {
    const away = dToPlayer < 250;
    const toward = dToPlayer > 460;
    const side = e.angle + (Math.PI / 2) * e.strafeSign;
    const tx = toward
      ? host.player.x
      : e.x + Math.cos(away ? e.angle + Math.PI : side) * 140;
    const ty = toward
      ? host.player.y
      : e.y + Math.sin(away ? e.angle + Math.PI : side) * 140;
    host.steer(e, tx, ty, ENEMY_SPEED * e.speedMult * (away ? 0.95 : 0.55), dt);
    if (e.hackCd <= 0) {
      if (e.hackT <= 0) {
        host.emit({ type: 'netrunnerChannel', x: e.x, y: e.y, angle: e.angle });
      }
      e.aiming = true;
      e.markT = Math.max(e.markT, 0.2);
      e.hackT += dt;
      if (e.hackT >= 1.2) {
        host.player.hackedT = Math.max(
          host.player.hackedT,
          4 * (1 - host.mods.hackResist) * host.hackMultiplier,
        );
        e.hackT = 0;
        e.hackCd = 6;
        e.aiming = false;
        host.emit({ type: 'netrunnerHack', x: e.x, y: e.y, angle: e.angle });
      }
    } else {
      e.hackT = 0;
    }
    return true;
  }

  if (e.kind === 'grenadier') {
    if (sees && dToPlayer < 560 && e.grenadeCd <= 0) {
      const fuse = 0.85;
      const tx = host.player.x + host.player.vx * 0.12;
      const ty = host.player.y + host.player.vy * 0.12;
      const dx = tx - e.x;
      const dy = ty - e.y;
      const speed = Math.min(720, Math.max(160, Math.hypot(dx, dy) / fuse));
      const angle = Math.atan2(dy, dx);
      host.grenades.push({
        id: host.nextId(),
        x: e.x + Math.cos(angle) * 20,
        y: e.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: fuse,
        owner: 'enemy',
      });
      e.grenadeCd = 2.6 + host.rand() * 2.2;
      e.flashT = 0.12;
      e.angle = angle;
      host.emit({ type: 'fragThrow', x: e.x, y: e.y, angle });
    }
    const away = dToPlayer < 230;
    const toward = dToPlayer > 430;
    const side = e.angle + (Math.PI / 2) * e.strafeSign;
    const tx = toward
      ? host.player.x
      : e.x + Math.cos(away ? e.angle + Math.PI : side) * 150;
    const ty = toward
      ? host.player.y
      : e.y + Math.sin(away ? e.angle + Math.PI : side) * 150;
    host.steer(e, tx, ty, ENEMY_SPEED * e.speedMult * (away ? 0.9 : 0.5), dt);
    return true;
  }

  return false;
}
