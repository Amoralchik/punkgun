import { dist } from '../core/math';
import { TILE, type Level } from './map';
import { roomAt } from './level-rooms';
import { roomsFor, snapToFloor } from './level-spawns';
import type { Enemy } from './world-types';

/**
 * Lost-contact search. Instead of every chaser walking to the exact spot
 * they last saw the player and standing there, a squad:
 *  1. tracks: heads to where the player was *going* (last position plus a
 *     beat of their last velocity), then
 *  2. sweeps: each searcher claims a different nearby room and checks it,
 *     calling CLEAR as rooms come up empty, until the search window closes.
 */

export interface SearchHost {
  level: Level;
  enemies: Enemy[];
  rand(): number;
  lineClear(ax: number, ay: number, bx: number, by: number): boolean;
}

/** How far ahead along the player's last heading a tracker guesses. */
const LEAD_SECONDS = 0.9;
/** Rooms considered for a sweep, measured from where contact was lost. */
const SWEEP_RADIUS = TILE * 9;

/** Remember the player's heading while they are seen. */
export function recordSighting(e: Enemy, px: number, py: number, pvx: number, pvy: number): void {
  e.lastSeenX = px;
  e.lastSeenY = py;
  e.lostVX = pvx;
  e.lostVY = pvy;
  e.searchOriginX = px;
  e.searchOriginY = py;
  e.searchVisited = [];
  e.searchLeg = 'track';
}

/** On losing sight: aim the first leg where the player was heading. */
export function predictLostPosition(host: SearchHost, e: Enemy): void {
  const vx = e.lostVX ?? 0;
  const vy = e.lostVY ?? 0;
  if (Math.hypot(vx, vy) < 30) return;
  const gx = e.lastSeenX + vx * LEAD_SECONDS;
  const gy = e.lastSeenY + vy * LEAD_SECONDS;
  // Only lead through open space; a guess through a wall is no guess.
  if (!host.lineClear(e.lastSeenX, e.lastSeenY, gx, gy)) return;
  const p = snapToFloor(host.level, gx, gy);
  e.lastSeenX = p.x;
  e.lastSeenY = p.y;
}

/** Rooms other searchers are already heading to. */
function claimedRooms(host: SearchHost, self: Enemy): Set<number> {
  const claimed = new Set<number>();
  for (const other of host.enemies) {
    if (other === self || !other.alive || other.searchLeg !== 'sweep') continue;
    if (other.searchRoom !== undefined) claimed.add(other.searchRoom);
  }
  return claimed;
}

/**
 * Next sweep point for a searcher who reached their current target and
 * found nothing. Returns null when there is nothing left worth checking.
 */
export function nextSearchPoint(host: SearchHost, e: Enemy): { x: number; y: number; room: number } | null {
  const { level } = host;
  const rooms = roomsFor(level);
  const ox = e.searchOriginX ?? e.lastSeenX;
  const oy = e.searchOriginY ?? e.lastSeenY;
  const here = roomAt(rooms, level, e.x, e.y);
  const visited = new Set(e.searchVisited ?? []);
  if (here !== -1) visited.add(here);
  const claimed = claimedRooms(host, e);

  let best: { x: number; y: number; room: number } | null = null;
  let bestScore = -Infinity;
  for (const room of rooms.rooms) {
    if (room.tiles < 4 || visited.has(room.id)) continue;
    const d = dist(room.ax, room.ay, ox, oy);
    if (d > SWEEP_RADIUS) continue;
    let score = -d + host.rand() * TILE;
    if (claimed.has(room.id)) score -= TILE * 6;
    if (score > bestScore) {
      bestScore = score;
      best = { x: room.ax, y: room.ay, room: room.id };
    }
  }
  if (best) return best;

  // No unvisited rooms nearby: probe a corner of the current room.
  for (let i = 0; i < 6; i++) {
    const a = host.rand() * Math.PI * 2;
    const r = TILE * (1.5 + host.rand() * 2.5);
    const p = snapToFloor(level, ox + Math.cos(a) * r, oy + Math.sin(a) * r);
    if (dist(p.x, p.y, e.x, e.y) > TILE) return { ...p, room: here };
  }
  return null;
}

/** Mark the current room swept and move on. Returns the new target or null. */
export function advanceSearch(host: SearchHost, e: Enemy): { x: number; y: number } | null {
  const rooms = roomsFor(host.level);
  const here = roomAt(rooms, host.level, e.x, e.y);
  e.searchVisited = [...(e.searchVisited ?? []), ...(here !== -1 ? [here] : [])];
  const next = nextSearchPoint(host, e);
  if (!next) return null;
  e.searchLeg = 'sweep';
  e.searchRoom = next.room;
  e.lastSeenX = next.x;
  e.lastSeenY = next.y;
  return next;
}
