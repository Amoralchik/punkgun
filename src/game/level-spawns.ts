import { dist } from '../core/math';
import { TILE, tileCenter, worldToTile, type Level } from './map';
import { findRooms, roomAt, type RoomMap } from './level-rooms';
import type { EnemyKind } from './world-types';

/**
 * Spawn-point selection, split from level geometry and world flow.
 *
 * Reinforcements should feel like they came from somewhere: out of the
 * player's sightline, outside the room they are standing in, far enough to
 * give a beat of warning but close enough to matter, and never stacked on
 * one tile or embedded in a wall.
 */

export interface SpawnPoint {
  x: number;
  y: number;
  kind?: EnemyKind;
}

export interface SpawnQuery {
  /** Threat source the spawn should be hidden from (usually the player). */
  from: { x: number; y: number };
  count: number;
  /** Hard minimum distance from `from` (default 5 tiles). */
  minDist?: number;
  /** Preferred distance from `from` (default 11 tiles). */
  idealDist?: number;
  /** Optional focus the wave should converge on (exit, defense zone). */
  anchor?: { x: number; y: number } | null;
  /**
   * Hold position around the anchor: candidates become floor tiles within
   * this radius of it (a defensive ring) instead of authored spawns/rooms.
   */
  anchorRadius?: number;
  /** Sight test; when given, points the player can see are penalised. */
  lineClear?: (ax: number, ay: number, bx: number, by: number) => boolean;
}

const roomCache = new WeakMap<Level, RoomMap>();

/** Rooms for a level, computed once per Level object. */
export function roomsFor(level: Level): RoomMap {
  let rooms = roomCache.get(level);
  if (!rooms) {
    rooms = findRooms(level);
    roomCache.set(level, rooms);
  }
  return rooms;
}

/** Floor tile that is not a wall, glass, door or station footprint. */
export function isStandable(level: Level, cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= level.w || cy >= level.h) return false;
  const i = cy * level.w + cx;
  if (level.walls[i] === 1 || level.glass[i] === 1) return false;
  return !level.doors.some((d) => d.cx === cx && d.cy === cy);
}

/**
 * Nearest standable position to (x, y). Keeps the exact point when it is
 * already on a standable tile; otherwise snaps to the closest standable tile
 * center within `maxRing` tiles. Falls back to the level spawn.
 */
export function snapToFloor(
  level: Level,
  x: number,
  y: number,
  maxRing = 6,
): { x: number; y: number } {
  const { cx, cy } = worldToTile(x, y, level.h);
  if (isStandable(level, cx, cy)) return { x, y };
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let ring = 1; ring <= maxRing && !best; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        if (!isStandable(level, cx + dx, cy + dy)) continue;
        const c = tileCenter(cx + dx, cy + dy, level.h);
        const d = dist(c.x, c.y, x, y);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
    }
  }
  return best ?? { x: level.spawn.x, y: level.spawn.y };
}

interface Candidate extends SpawnPoint {
  room: number;
}

function ringCandidates(
  level: Level,
  rooms: RoomMap,
  anchor: { x: number; y: number },
  radius: number,
): Candidate[] {
  const out: Candidate[] = [];
  for (let cy = 0; cy < level.h; cy++) {
    for (let cx = 0; cx < level.w; cx++) {
      if (!isStandable(level, cx, cy)) continue;
      const c = tileCenter(cx, cy, level.h);
      const d = dist(c.x, c.y, anchor.x, anchor.y);
      if (d > radius || d < TILE * 1.2) continue;
      out.push({ ...c, room: rooms.tileRoom[cy * level.w + cx] });
    }
  }
  return out;
}

function candidates(level: Level, rooms: RoomMap): Candidate[] {
  const out: Candidate[] = [];
  for (const spawn of level.enemies) {
    const p = snapToFloor(level, spawn.x, spawn.y);
    out.push({ ...p, kind: spawn.kind, room: roomAt(rooms, level, p.x, p.y) });
  }
  for (const room of rooms.rooms) {
    if (room.tiles < 6) continue;
    out.push({ x: room.ax, y: room.ay, room: room.id });
  }
  return out;
}

/**
 * Pick `count` distinct spawn points for a wave. Deterministic for a given
 * level and query, so the gym and tests can reason about it.
 */
export function pickSpawnPoints(level: Level, query: SpawnQuery): SpawnPoint[] {
  const rooms = roomsFor(level);
  const minDist = query.minDist ?? TILE * 5;
  const ideal = query.idealDist ?? TILE * 11;
  const from = query.from;
  // No authored spawns (the safehouse): this level does not host waves.
  if (level.enemies.length === 0) return [];
  const fromRoom = roomAt(rooms, level, from.x, from.y);
  const ring = query.anchor && query.anchorRadius
    ? ringCandidates(level, rooms, query.anchor, query.anchorRadius)
    : [];
  const holding = ring.length >= query.count;
  const pool = holding ? ring : candidates(level, rooms);

  const scoreOf = (c: Candidate): number => {
    const d = dist(c.x, c.y, from.x, from.y);
    if (d < minDist) return -Infinity;
    if (holding) {
      // Defensive ring: stay on the anchor, prefer spots out of the player's
      // sightline (behind cover) but never trade the position for it.
      let score = -dist(c.x, c.y, query.anchor!.x, query.anchor!.y);
      if (query.lineClear && query.lineClear(from.x, from.y, c.x, c.y)) score -= TILE * 1.5;
      return score;
    }
    let score = -Math.abs(d - ideal);
    if (rooms.rooms.length > 1 && c.room === fromRoom && c.room !== -1) score -= TILE * 6;
    if (query.lineClear && query.lineClear(from.x, from.y, c.x, c.y)) score -= TILE * 5;
    if (query.anchor) score -= dist(c.x, c.y, query.anchor.x, query.anchor.y) * 0.6;
    return score;
  };

  let viable = pool.map((c) => ({ c, s: scoreOf(c) })).filter((e) => e.s > -Infinity);
  if (viable.length === 0) {
    // Tiny map or player standing on every spawn: fall back to farthest points.
    viable = pool
      .map((c) => ({ c, s: dist(c.x, c.y, from.x, from.y) }))
      .sort((a, b) => b.s - a.s);
  }
  if (viable.length === 0) return [];

  const chosen: SpawnPoint[] = [];
  const used = new Set<Candidate>();
  while (chosen.length < query.count) {
    let pick: { c: Candidate; s: number } | null = null;
    let pickScore = -Infinity;
    for (const entry of viable) {
      if (used.has(entry.c)) continue;
      // Spread the wave: penalise points close to already chosen ones.
      let spread = 0;
      for (const prev of chosen) {
        const d = dist(prev.x, prev.y, entry.c.x, entry.c.y);
        if (d < TILE * 3) spread -= (TILE * 3 - d) * 1.5;
      }
      const s = entry.s + spread;
      if (s > pickScore) {
        pickScore = s;
        pick = entry;
      }
    }
    if (!pick) break;
    used.add(pick.c);
    chosen.push({ x: pick.c.x, y: pick.c.y, kind: pick.c.kind });
  }

  // More bodies than distinct points: fan the extras out around the best
  // ones, each snapped back onto standable floor.
  for (let i = 0; chosen.length < query.count; i++) {
    const base = chosen[i % chosen.length];
    const a = (i + 1) * 2.399963;
    const p = snapToFloor(level, base.x + Math.cos(a) * TILE * 0.6, base.y + Math.sin(a) * TILE * 0.6);
    chosen.push({ ...p, kind: base.kind });
  }
  return chosen;
}

/**
 * Offset a risk-scaled extra hostile from an authored spawn without ever
 * dropping it inside geometry.
 */
export function offsetSpawn(level: Level, base: { x: number; y: number }, index: number): { x: number; y: number } {
  const offset = (index + 1) * 26;
  return snapToFloor(level, base.x + offset, base.y - offset);
}
