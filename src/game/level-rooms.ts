import { tileCenter, worldToTile, type Level } from './map';
import { dist } from '../core/math';

/**
 * A room is a connected component of floor tiles, with door tiles acting as
 * boundaries (a door tile belongs to no room). Anchors are always floor tile
 * centers, so objective nodes placed on anchors are standable.
 */
export interface Room {
  id: number;
  tiles: number;
  /** Centroid in world coords (may sit in a wall for concave rooms). */
  x: number;
  y: number;
  /** Floor tile center closest to the centroid — always standable. */
  ax: number;
  ay: number;
  doors: number;
}

export interface RoomMap {
  rooms: Room[];
  /** Per-tile room id; -1 for walls and door tiles. */
  tileRoom: Int16Array;
}

const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

export function findRooms(level: Level): RoomMap {
  const { w, h, walls } = level;
  const tileRoom = new Int16Array(w * h).fill(-1);
  const doorTile = new Set(level.doors.map((d) => d.cy * w + d.cx));
  const rooms: Room[] = [];
  const stack: number[] = [];

  for (let start = 0; start < w * h; start++) {
    if (walls[start] === 1 || doorTile.has(start) || tileRoom[start] !== -1) continue;
    const id = rooms.length;
    let head = 0;
    let sumX = 0;
    let sumY = 0;
    const cells: number[] = [];
    const doorAdj = new Set<number>();
    stack.length = 0;
    stack.push(start);
    tileRoom[start] = id;
    while (head < stack.length) {
      const cur = stack[head++];
      cells.push(cur);
      const cx = cur % w;
      const cy = (cur / w) | 0;
      const c = tileCenter(cx, cy, h);
      sumX += c.x;
      sumY += c.y;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DX[d];
        const ny = cy + DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (doorTile.has(ni)) {
          doorAdj.add(ni);
          continue;
        }
        if (walls[ni] === 1 || tileRoom[ni] !== -1) continue;
        tileRoom[ni] = id;
        stack.push(ni);
      }
    }
    const cx = sumX / cells.length;
    const cy = sumY / cells.length;
    let ax = cx;
    let ay = cy;
    let best = Infinity;
    for (const cell of cells) {
      const c = tileCenter(cell % w, (cell / w) | 0, h);
      const d = dist(c.x, c.y, cx, cy);
      if (d < best) {
        best = d;
        ax = c.x;
        ay = c.y;
      }
    }
    rooms.push({ id, tiles: cells.length, x: cx, y: cy, ax, ay, doors: doorAdj.size });
  }
  return { rooms, tileRoom };
}

export function roomAt(map: RoomMap, level: Level, x: number, y: number): number {
  const { cx, cy } = worldToTile(x, y, level.h);
  if (cx < 0 || cy < 0 || cx >= level.w || cy >= level.h) return -1;
  return map.tileRoom[cy * level.w + cx];
}

/** Distance from a room to the nearest security hazard (camera/turret/laser/barrel). */
export function hazardDistance(level: Level, room: Room): number {
  const hazards = [...level.cameras, ...level.turrets, ...level.lasers, ...level.barrels];
  let best = Infinity;
  for (const hz of hazards) best = Math.min(best, dist(room.ax, room.ay, hz.x, hz.y));
  return best;
}

/** Case tile: as far from the spawn as the map allows, off the exit when rooms allow. */
export function pickCaseTile(level: Level, map: RoomMap): { x: number; y: number } {
  const exitRoom = roomAt(map, level, level.exit.x, level.exit.y);
  let best: { x: number; y: number } | null = null;
  let bestScore = -1;
  for (let i = 0; i < level.w * level.h; i++) {
    if (level.walls[i] === 1) continue;
    const room = map.tileRoom[i];
    if (room === -1) continue;
    if (map.rooms.length > 1 && room === exitRoom) continue;
    const c = tileCenter(i % level.w, (i / level.w) | 0, level.h);
    const score =
      dist(c.x, c.y, level.spawn.x, level.spawn.y) +
      Math.min(dist(c.x, c.y, level.exit.x, level.exit.y), 600) * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best ?? { x: level.exit.x, y: level.exit.y };
}

/** Defense tile: anchor of the largest room (the arena), exit as fallback. */
export function pickZoneTile(level: Level, map: RoomMap): { x: number; y: number } {
  let best: Room | null = null;
  for (const room of map.rooms) {
    if (!best || room.tiles > best.tiles) best = room;
  }
  return best ? { x: best.ax, y: best.ay } : { x: level.exit.x, y: level.exit.y };
}

/**
 * Terminal tiles: spread across distinct guarded rooms (greedy max-min
 * spread, seeded at the most closely watched room). Falls back to the plain
 * spread when the map has too few rooms.
 */
export function pickTerminalTiles(
  level: Level,
  map: RoomMap,
  count: number,
  fallback: { x: number; y: number }[],
): { x: number; y: number }[] {
  const candidates = map.rooms.filter((room) => room.tiles >= 6);
  if (map.rooms.length < 2 || candidates.length < count) return fallback;
  const byGuard = [...candidates].sort(
    (a, b) => hazardDistance(level, a) - hazardDistance(level, b) || b.tiles - a.tiles,
  );
  const chosen: Room[] = [byGuard[0]];
  while (chosen.length < count) {
    let pick: Room | null = null;
    let pickScore = -Infinity;
    for (const room of candidates) {
      if (chosen.includes(room)) continue;
      const minD = Math.min(...chosen.map((c) => dist(c.ax, c.ay, room.ax, room.ay)));
      const score = minD - hazardDistance(level, room) * 0.05;
      if (score > pickScore) {
        pickScore = score;
        pick = room;
      }
    }
    if (!pick) break;
    chosen.push(pick);
  }
  return chosen.slice(0, count).map((room) => ({ x: room.ax, y: room.ay }));
}
