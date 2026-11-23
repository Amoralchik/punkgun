import { clamp, dist } from '../core/math';
import { TILE, type Level } from './map';
import {
  ENEMY_SPEED,
  findCoverPoint,
  flankPoint,
  grenadeThreat,
  isFlanker,
  meleeKind,
  squadLeader,
} from './world-ai';
import type { Enemy, Grenade, Player } from './world-types';

/** World surface used by squad/cover/flank movement. */
export interface SquadHost {
  player: Player;
  enemies: Enemy[];
  grenades: Grenade[];
  level: Level;
  steer(e: Enemy, tx: number, ty: number, speed: number, dt: number): void;
  lineClear(ax: number, ay: number, bx: number, by: number): boolean;
  solidAt(x: number, y: number): boolean;
}

/**
 * Grenade sidestep, suppressed cover run, or flank route.
 * Returns true when the branch consumed the turn.
 */
export function runSquadMovement(
  host: SquadHost,
  e: Enemy,
  dt: number,
): boolean {
  if (e.kind === 'boss') return false;
  const threat = grenadeThreat(e, host.grenades);
  if (threat) {
    host.steer(e, threat.x, threat.y, ENEMY_SPEED * 1.15 * e.speedMult, dt);
    return true;
  }
  if (e.suppressT > 0 && e.coverT <= 0 && !meleeKind(e.kind)) {
    const cover = findCoverPoint(
      host.level,
      e,
      host.player,
      (x, y) => !host.solidAt(x, y),
      (ax, ay, bx, by) => host.lineClear(ax, ay, bx, by),
    );
    if (cover) {
      e.coverX = cover.x;
      e.coverY = cover.y;
      e.coverT = 1.4;
      e.path = [];
    }
  }
  if (e.coverT > 0) {
    host.steer(e, e.coverX, e.coverY, ENEMY_SPEED * 1.1 * e.speedMult, dt);
    return true;
  }
  const leader = squadLeader(host.enemies, e);
  if (leader && isFlanker(host.enemies, e)) {
    if (e.flankT <= 0) {
      let point = flankPoint(leader, host.player, e.id % 2 === 0 ? 1 : -1);
      point.x = clamp(point.x, TILE, (host.level.w - 1) * TILE);
      point.y = clamp(point.y, TILE, (host.level.h - 1) * TILE);
      if (host.solidAt(point.x, point.y)) {
        point = flankPoint(leader, host.player, e.id % 2 === 0 ? -1 : 1);
        point.x = clamp(point.x, TILE, (host.level.w - 1) * TILE);
        point.y = clamp(point.y, TILE, (host.level.h - 1) * TILE);
      }
      e.flankX = point.x;
      e.flankY = point.y;
      e.flankT = 1.6;
    }
    if (e.flankT > 0) {
      host.steer(e, e.flankX, e.flankY, ENEMY_SPEED * 1.05 * e.speedMult, dt);
      if (dist(e.x, e.y, e.flankX, e.flankY) < 70) e.flankT = 0;
      return true;
    }
  }
  return false;
}
