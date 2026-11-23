import { dist } from '../core/math';
import { tileCenter, type Level } from './map';
import type { Enemy, Grenade } from './world-types';

/** Assign nearby enemies to the same squad without any module-global state. */
export function assignSquads(enemies: Enemy[]): void {
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.squad >= 0) continue;
    const nearby = enemies.filter(
      (other) =>
        other !== enemy && other.alive && dist(enemy.x, enemy.y, other.x, other.y) <= 260,
    );
    const assigned = nearby.filter((other) => other.squad >= 0).map((other) => other.squad);
    let squad: number;
    if (assigned.length > 0) {
      squad = Math.min(...assigned);
    } else {
      let max = -1;
      for (const other of enemies) {
        if (other.alive && other.squad > max) max = other.squad;
      }
      squad = max + 1;
    }
    enemy.squad = squad;
    for (const other of nearby) {
      if (other.squad < 0) other.squad = squad;
    }
  }
}

/** Lowest living id in the squad, or null when the enemy has no squad. */
export function squadLeader(enemies: Enemy[], e: Enemy): Enemy | null {
  if (e.squad < 0) return null;
  let leader: Enemy | null = null;
  for (const other of enemies) {
    if (!other.alive || other.squad !== e.squad) continue;
    if (!leader || other.id < leader.id) leader = other;
  }
  return leader;
}

/** Only the second-lowest living member of a close squad flanks. */
export function isFlanker(enemies: Enemy[], e: Enemy): boolean {
  if (e.kind === 'boss' || e.kind === 'shield' || e.kind === 'heavy') return false;
  const leader = squadLeader(enemies, e);
  if (!leader || leader === e || dist(leader.x, leader.y, e.x, e.y) > 420) return false;
  const members = enemies
    .filter((other) => other.alive && other.squad === e.squad)
    .sort((a, b) => a.id - b.id);
  return members[1] === e;
}

/** A point on the opposite side of the player from the squad leader. */
export function flankPoint(
  leader: Enemy,
  player: { x: number; y: number },
  sign: 1 | -1,
): { x: number; y: number } {
  const dx = player.x - leader.x;
  const dy = player.y - leader.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: player.x + (-dy / length) * 160 * sign,
    y: player.y + (dx / length) * 160 * sign,
  };
}

/** Nearest reachable tile center that breaks line of sight to the player. */
export function findCoverPoint(
  level: Level,
  from: { x: number; y: number },
  player: { x: number; y: number },
  isOpen: (x: number, y: number) => boolean,
  lineOfSight: (ax: number, ay: number, bx: number, by: number) => boolean,
): { x: number; y: number } | null {
  const origin = { cx: Math.floor(from.x / 64), cy: level.h - 1 - Math.floor(from.y / 64) };
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      if (dx === 0 && dy === 0) continue;
      const cx = origin.cx + dx;
      const cy = origin.cy + dy;
      if (cx < 0 || cy < 0 || cx >= level.w || cy >= level.h) continue;
      const center = tileCenter(cx, cy, level.h);
      if (!isOpen(center.x, center.y)) continue;
      if (!lineOfSight(from.x, from.y, center.x, center.y)) continue;
      if (lineOfSight(center.x, center.y, player.x, player.y)) continue;
      const distance = dist(from.x, from.y, center.x, center.y);
      if (distance < bestD) {
        bestD = distance;
        best = center;
      }
    }
  }
  return best;
}

/** A deterministic sidestep away from the nearest live grenade. */
export function grenadeThreat(
  e: Enemy,
  grenades: Grenade[],
): { x: number; y: number } | null {
  let nearest: Grenade | null = null;
  let best = 120;
  for (const grenade of grenades) {
    if (grenade.life <= 0) continue;
    const d = dist(e.x, e.y, grenade.x, grenade.y);
    if (d < best) {
      best = d;
      nearest = grenade;
    }
  }
  if (!nearest) return null;
  const dx = e.x - nearest.x;
  const dy = e.y - nearest.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: e.x + (dx / length) * 120, y: e.y + (dy / length) * 120 };
}

export function meleeKind(kind: Enemy['kind']): boolean {
  return kind === 'blade' || kind === 'stalker' || kind === 'hound';
}
