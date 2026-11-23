import { LOOT_DEFS, LootKind } from './economy';
import type { WeaponId } from './weapons';
import type { EnemyKind } from './world-types';
import { LAYOUTS, type LayoutId } from './level-layouts';

export const TILE = 64;

/**
 * Level layout chars.
 * # wall   . floor   D door   P player spawn   E enemy spawn
 * g gunner  r marksman  h heavy (typed enemy spawns)
 * X exit   w pistol   s shotgun   b bat   k smg   f rifle   a ak   m lmg
 * B boss spawn
 * G breakable glass wall   S steam vent
 * o explosive barrel   c security camera   t automated turret   l laser grid
 * C contracts  W workbench  A clinic  M market  U supplies  Y archive  T fabricator  O operator  R sanctuary
 * 1 datashard  2 credchip  3 optic (sellable loot)
 */

export type EnemyTag = EnemyKind;

export { LAYOUTS } from './level-layouts';
export type { LayoutDef, LayoutId } from './level-layouts';


export interface DoorSpawn {
  cx: number;
  cy: number;
  /** 'h' = wall runs horizontally, door leaf spans horizontally. */
  axis: 'h' | 'v';
}

export interface WeaponSpawn {
  x: number;
  y: number;
  weapon: Exclude<WeaponId, 'fists'>;
  ammo: number;
}

export type StationKind =
  | 'contracts'
  | 'workbench'
  | 'clinic'
  | 'market'
  | 'supplies'
  | 'archive'
  | 'fabricator'
  | 'operator'
  | 'sanctuary'
  | 'deploy';

export interface Station {
  x: number;
  y: number;
  kind: StationKind;
}

export interface LootSpawn {
  x: number;
  y: number;
  kind: LootKind;
  value: number;
}

export interface BarrelSpawn {
  x: number;
  y: number;
}

export interface CameraSpawn {
  x: number;
  y: number;
}

export interface TurretSpawn {
  x: number;
  y: number;
}

export interface LaserSpawn {
  x: number;
  y: number;
  axis: 'h' | 'v';
}

export interface Level {
  id: LayoutId;
  name: string;
  w: number;
  h: number;
  /** Tile grid: 1 = wall, 0 = floor. Doors are floor tiles plus a DoorSpawn. */
  walls: Uint8Array;
  /** 1 = breakable glass wall tile. Intact glass blocks movement but not sight. */
  glass: Uint8Array;
  /** Steam vents that pulse sight-blocking clouds. */
  steam: { x: number; y: number }[];
  doors: DoorSpawn[];
  spawn: { x: number; y: number };
  enemies: { x: number; y: number; kind?: EnemyKind }[];
  weapons: WeaponSpawn[];
  loot: LootSpawn[];
  barrels: BarrelSpawn[];
  cameras: CameraSpawn[];
  turrets: TurretSpawn[];
  lasers: LaserSpawn[];
  stations: Station[];
  exit: { x: number; y: number };
  boss: { x: number; y: number } | null;
}

/**
 * World space is y-up. Map row 0 is the top row, so row cy sits at
 * world y = (h - 1 - cy + 0.5) * TILE.
 */
export function tileCenter(cx: number, cy: number, h: number): { x: number; y: number } {
  return { x: (cx + 0.5) * TILE, y: (h - 1 - cy + 0.5) * TILE };
}

export function worldToTile(x: number, y: number, h: number): { cx: number; cy: number } {
  return { cx: Math.floor(x / TILE), cy: h - 1 - Math.floor(y / TILE) };
}

export function isWall(level: Level, cx: number, cy: number): boolean {
  if (cx < 0 || cy < 0 || cx >= level.w || cy >= level.h) return true;
  return level.walls[cy * level.w + cx] === 1;
}

/** Number of collectible caches a layout can support. */
export function layoutCacheCount(id: LayoutId): number {
  const layout = LAYOUTS.find((entry) => entry.id === id);
  if (!layout) return 0;
  let count = 0;
  for (const row of layout.rows) {
    for (const ch of row) if (ch === '1' || ch === '2' || ch === '3') count++;
  }
  return count;
}

export function loadLevel(id: LayoutId = 'sector07'): Level {
  const layout = LAYOUTS.find((entry) => entry.id === id) ?? LAYOUTS[0];
  const rows = layout.rows;
  const h = rows.length;
  const w = rows[0].length;
  const walls = new Uint8Array(w * h);
  const glass = new Uint8Array(w * h);
  const steam: { x: number; y: number }[] = [];
  const doors: DoorSpawn[] = [];
  const enemies: { x: number; y: number; kind?: EnemyKind }[] = [];
  const weapons: WeaponSpawn[] = [];
  const loot: LootSpawn[] = [];
  const barrels: BarrelSpawn[] = [];
  const cameras: CameraSpawn[] = [];
  const turrets: TurretSpawn[] = [];
  const lasers: LaserSpawn[] = [];
  const stations: Station[] = [];
  let spawn = { x: 0, y: 0 };
  let exit = { x: 0, y: 0 };
  let boss: { x: number; y: number } | null = null;

  for (let cy = 0; cy < h; cy++) {
    const row = rows[cy];
    if (row.length !== w) throw new Error(`Map ${id} row ${cy} has width ${row.length}, expected ${w}`);
    for (let cx = 0; cx < w; cx++) {
      const ch = row[cx];
      const pos = tileCenter(cx, cy, h);
      if (ch === '#') walls[cy * w + cx] = 1;
      if (ch === 'G') {
        walls[cy * w + cx] = 1;
        glass[cy * w + cx] = 1;
      }
      if (ch === 'S') steam.push(pos);
      if (ch === 'D') doors.push({ cx, cy, axis: 'h' });
      if (ch === 'P') spawn = pos;
      if (ch === 'E') enemies.push(pos);
      if (ch === 'g') enemies.push({ ...pos, kind: 'gunner' });
      if (ch === 'r') enemies.push({ ...pos, kind: 'marksman' });
      if (ch === 'h') enemies.push({ ...pos, kind: 'heavy' });
      if (ch === 'X') exit = pos;
      if (ch === 'B') boss = pos;
      if (ch === 'o') barrels.push(pos);
      if (ch === 'c') cameras.push(pos);
      if (ch === 't') turrets.push(pos);
      if (ch === 'l') lasers.push({ ...pos, axis: 'h' });
      const stationKind: StationKind | null =
        ch === 'C'
          ? 'contracts'
          : ch === 'W'
            ? 'workbench'
            : ch === 'A'
              ? 'clinic'
              : ch === 'M'
                ? 'market'
                : ch === 'U'
                  ? 'supplies'
                  : ch === 'Y'
                    ? 'archive'
                    : ch === 'T'
                      ? 'fabricator'
                      : ch === 'O'
                        ? 'operator'
                        : ch === 'R'
                          ? 'sanctuary'
                          : ch === 'X'
                            ? 'deploy'
                            : null;
      if (stationKind) {
        stations.push({ ...pos, kind: stationKind });
        walls[cy * w + cx] = 1;
      }
      if (ch === 'w') weapons.push({ ...pos, weapon: 'pistol', ammo: 8 });
      if (ch === 's') weapons.push({ ...pos, weapon: 'shotgun', ammo: 6 });
      if (ch === 'b') weapons.push({ ...pos, weapon: 'bat', ammo: 0 });
      if (ch === 'k') weapons.push({ ...pos, weapon: 'smg', ammo: 24 });
      if (ch === 'f') weapons.push({ ...pos, weapon: 'rifle', ammo: 10 });
      if (ch === 'a') weapons.push({ ...pos, weapon: 'ak', ammo: 30 });
      if (ch === 'm') weapons.push({ ...pos, weapon: 'lmg', ammo: 60 });
      const lootKind: LootKind | null =
        ch === '1' ? 'shard' : ch === '2' ? 'chip' : ch === '3' ? 'optic' : null;
      if (lootKind) loot.push({ ...pos, kind: lootKind, value: LOOT_DEFS[lootKind].value });
    }
  }

  const level: Level = {
    id: layout.id,
    name: layout.name,
    w,
    h,
    walls,
    glass,
    steam,
    doors,
    spawn,
    enemies,
    weapons,
    loot,
    barrels,
    cameras,
    turrets,
    lasers,
    stations,
    exit,
    boss,
  };

  // Derive door orientation from surrounding walls.
  for (const l of lasers) {
    const cx = Math.floor(l.x / TILE);
    const cy = level.h - 1 - Math.floor(l.y / TILE);
    const left = isWall(level, cx - 1, cy);
    const right = isWall(level, cx + 1, cy);
    const up = isWall(level, cx, cy - 1);
    const down = isWall(level, cx, cy + 1);
    if (left && right) l.axis = 'h';
    else if (up && down) l.axis = 'v';
    else if (left || right) l.axis = 'v';
    else l.axis = 'h';
  }

  for (const d of doors) {
    const left = isWall(level, d.cx - 1, d.cy);
    const right = isWall(level, d.cx + 1, d.cy);
    const up = isWall(level, d.cx, d.cy - 1);
    const down = isWall(level, d.cx, d.cy + 1);
    if (left && right) d.axis = 'h';
    else if (up && down) d.axis = 'v';
    else if (left || right) d.axis = 'h';
    else d.axis = 'v';
  }

  return level;
}
