import type { WorldEvent } from './world-types';
import type { Barrel, Bullet, Camera, Enemy, Laser, Player, Turret } from './world-types';
import type { DamageSource } from './damage-report';
import { angleDelta } from '../core/math';
import { segmentHitsCircle } from './world-geometry';
import type { Civilian } from './world-civilians';

export interface BulletHost {
  bullets: Bullet[];
  barrels: Barrel[];
  cameras: Camera[];
  turrets: Turret[];
  lasers: Laser[];
  enemies: Enemy[];
  /** Market bystanders; any round that meets one stops there. */
  civilians?: Civilian[];
  killCivilian?(c: Civilian, by: 'player' | 'enemy', angle: number): void;
  player: Player;
  shotsHit: number;
  deathCause: string;
  solidAt(x: number, y: number): boolean;
  breakGlassAt(x: number, y: number): boolean;
  addSparks(x: number, y: number, angle: number): void;
  emit(event: WorldEvent): void;
  blowBarrel(barrel: Barrel): void;
  damageBoss(enemy: Enemy, angle: number): void;
  damageHeavy(enemy: Enemy, angle: number): void;
  killEnemy(enemy: Enemy, by: 'player' | 'enemy' | 'door', silent?: boolean): void;
  killPlayer(angle: number, source?: DamageSource | null): void;
  stagger?(enemy: Enemy, seconds: number): void;
  damageSourceFor(
    ownerId: number,
    x: number,
    y: number,
    attack?: string,
  ): DamageSource;
}

export function updateBullets(host: BulletHost, dt: number, enemyScale = 1): void {
      for (let i = host.bullets.length - 1; i >= 0; i--) {
        const b = host.bullets[i];
        const step = b.ownerKind === 'player' ? dt : dt * enemyScale;
        b.px = b.x;
        b.py = b.y;
        b.x += b.vx * step;
        b.y += b.vy * step;
        b.life -= step;

        if (b.life <= 0) {
          host.bullets.splice(i, 1);
          continue;
        }

        if (host.solidAt(b.x, b.y)) {
          if (!host.breakGlassAt(b.x, b.y)) {
            host.addSparks(b.x, b.y, Math.atan2(-b.vy, -b.vx));
          }
          host.bullets.splice(i, 1);
          continue;
        }

        let hit = false;
        for (const barrel of host.barrels) {
          if (!barrel.alive) continue;
          if (
            segmentHitsCircle(b.px, b.py, b.x, b.y, barrel.x, barrel.y, barrel.r)
          ) {
            host.blowBarrel(barrel);
            hit = true;
            break;
          }
        }
        if (!hit) {
          for (const cam of host.cameras) {
            if (!cam.alive) continue;
            if (segmentHitsCircle(b.px, b.py, b.x, b.y, cam.x, cam.y, 20)) {
              cam.alive = false;
              host.addSparks(cam.x, cam.y, Math.atan2(-b.vy, -b.vx));
              host.emit({ type: 'cameraBroken', x: cam.x, y: cam.y, angle: cam.angle });
              hit = true;
              break;
            }
          }
        }
        if (!hit) {
          for (const t of host.turrets) {
            if (!t.alive) continue;
            if (segmentHitsCircle(b.px, b.py, b.x, b.y, t.x, t.y, 22)) {
              t.alive = false;
              host.addSparks(t.x, t.y, Math.atan2(-b.vy, -b.vx));
              host.emit({ type: 'turretBroken', x: t.x, y: t.y, angle: t.angle });
              hit = true;
              break;
            }
          }
        }
        if (!hit) {
          for (const l of host.lasers) {
            if (!l.alive) continue;
            if (segmentHitsCircle(b.px, b.py, b.x, b.y, l.x, l.y, 20)) {
              l.alive = false;
              host.addSparks(l.x, l.y, Math.atan2(-b.vy, -b.vx));
              host.emit({ type: 'laserBroken', x: l.x, y: l.y, angle: 0 });
              hit = true;
              break;
            }
          }
        }
        if (!hit && host.civilians && host.killCivilian) {
          for (const c of host.civilians) {
            if (!c.alive) continue;
            if (segmentHitsCircle(b.px, b.py, b.x, b.y, c.x, c.y, c.r)) {
              host.killCivilian(
                c,
                b.ownerKind === 'player' ? 'player' : 'enemy',
                Math.atan2(b.vy, b.vx),
              );
              hit = true;
              break;
            }
          }
        }
        if (!hit && b.ownerKind !== 'player' && host.player.alive) {
          if (segmentHitsCircle(b.px, b.py, b.x, b.y, host.player.x, host.player.y, host.player.r)) {
            host.deathCause = 'GUNFIRE';
            host.killPlayer(
              Math.atan2(b.vy, b.vx),
              host.damageSourceFor(b.ownerId, b.x, b.y, b.attack),
            );
            hit = true;
          }
        }
        if (!hit && b.ownerKind === 'player') {
          for (const e of host.enemies) {
            if (!e.alive || e.id === b.ownerId) continue;
            if (segmentHitsCircle(b.px, b.py, b.x, b.y, e.x, e.y, e.r + 44)) {
              e.suppressT = Math.max(e.suppressT, 1.2);
            }
            if (segmentHitsCircle(b.px, b.py, b.x, b.y, e.x, e.y, e.r)) {
              const from = Math.atan2(-b.vy, -b.vx);
              if (e.kind === 'boss') {
                if (b.ownerKind === 'player') host.shotsHit++;
                host.damageBoss(e, from);
                hit = true;
                break;
              }
              if (
                e.kind === 'shield' &&
                e.shieldT <= 0 &&
                Math.abs(angleDelta(e.angle, from)) < 1.25
              ) {
                host.addSparks(b.x, b.y, from + Math.PI);
                e.shieldT = 0.42;
                host.stagger?.(e, 0.4);
                host.emit({ type: 'shieldHit', x: e.x, y: e.y, angle: from });
                hit = true;
                break;
              }
              if ((e.kind === 'heavy' || e.kind === 'breacher') && e.armor > 0) {
                if (b.ownerKind === 'player') host.shotsHit++;
                host.damageHeavy(e, from);
                // Steadied shot finds the seam: a second plate goes.
                if (b.precise && e.armor > 0) host.damageHeavy(e, from);
                hit = true;
                break;
              }
              if (b.ownerKind === 'player') host.shotsHit++;
              host.killEnemy(e, b.ownerKind === 'player' ? 'player' : 'enemy');
              if (b.ownerKind === 'player' && b.pierce > 0) {
                b.pierce--;
                continue;
              }
              hit = true;
              break;
            }
          }
        }
        if (hit) host.bullets.splice(i, 1);
      }
  
}
