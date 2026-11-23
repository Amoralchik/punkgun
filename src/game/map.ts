import { LOOT_DEFS, LootKind } from './economy';
import type { WeaponId } from './weapons';

export const TILE = 64;

/**
 * Level layout chars.
 * # wall   . floor   D door   P player spawn   E enemy spawn
 * g gunner  r marksman  h heavy (typed enemy spawns)
 * X exit   w pistol   s shotgun   b bat   k smg   f rifle   a ak   m lmg
 * B boss spawn
 * o explosive barrel   c security camera   t automated turret   l laser grid
 * C contracts  W workbench  A clinic  M market  U supplies  Y archive  T fabricator  O operator
 * 1 datashard  2 credchip  3 optic (sellable loot)
 */

export type EnemyTag =
  | 'grunt'
  | 'shield'
  | 'sniper'
  | 'rusher'
  | 'gunner'
  | 'marksman'
  | 'heavy';

export type LayoutId =
  | 'sector07'
  | 'tenements'
  | 'nightmarket'
  | 'docks'
  | 'spire'
  | 'sublevel'
  | 'transit'
  | 'arcology'
  | 'safehouse';

export interface LayoutDef {
  id: LayoutId;
  name: string;
  tagline: string;
  rows: string[];
}

export const LAYOUTS: LayoutDef[] = [
  {
    id: 'sector07',
    name: 'SECTOR 07',
    tagline: 'Stacked hab blocks. Long corridors. Nowhere to hide.',
    rows: [
      '##################################',
      '#.b......#.....#.................#',
      '#..P.....#..E..#.......E.........#',
      '#........#.....#......t.......1..#',
      '#........D.....#.....#####.......#',
      '#....c...#.....#.....#...#.......#',
      '#####.####.....#.....#.E.#.......#',
      '#........#.....#.....#...#.......#',
      '#...E....#.....#.....###D###.....#',
      '#....2...#.....#.........#.......#',
      '#....l...#.....D.........#...E...#',
      '#####.####.....#.........#.......#',
      '#....b...#.....#....w....#.......#',
      '#........#.....#.........#.......#',
      '#........#####.#########.#########',
      '#........#.......#..............X#',
      '#...E....#...E...#.......E.....3.#',
      '#...o....#.......#...............#',
      '####D#####...s...#......#####....#',
      '#.........................#.E....#',
      '#....w....................#......#',
      '##################################',
    ],
  },
  {
    id: 'tenements',
    name: 'THE TENEMENTS',
    tagline: 'Every room has a door. Every door opens both ways.',
    rows: [
      '##############################',
      '#....#....#........#.........#',
      '#.P..#..E.#........#....E....#',
      '#....D....#........D.........#',
      '#....#....#........#.........#',
      '####D####D####D#####D#########',
      '#....#....#........#.........#',
      '#..E.#.b..#..o.w...#....E....#',
      '#....#....#........#.........#',
      '#....D....D........D.........#',
      '####D####D####D#####D#########',
      '#....#....#........#.........#',
      '#.2..#....#....E...#....1....#',
      '#....#....#........#.........#',
      '#....D....D........D.........#',
      '####D####D####D#####D#########',
      '#....#....#........#........X#',
      '#..E.#..3.#........#....E....#',
      '#....#....#........#.........#',
      '##############################',
    ],
  },
  {
    id: 'nightmarket',
    name: 'NIGHT MARKET',
    tagline: 'Open plaza, long sightlines, neon cover.',
    rows: [
      '####################################',
      '#........#.................#.......#',
      '#..P.....#.................#...E...#',
      '#........#....##....##.....#.......#',
      '#...w....#....##....##.....#...1...#',
      '#........D.................D.......#',
      '#........#.................#.......#',
      '#...E....#..o.......E......#...E...#',
      '#........#.................#.......#',
      '#........#.................#.......#',
      '#........D.................D.......#',
      '#........#.................#.......#',
      '#...2....#....w.......E....#.......#',
      '#........#.................#...3...#',
      '#........#....##....##.....#.......#',
      '#........D.................D.......#',
      '#........#.................#.......#',
      '#...E....#.................#...E...#',
      '#........#.................#.....X.#',
      '####################################',
    ],
  },
  {
    id: 'docks',
    name: 'THE DOCKS',
    tagline: 'Salt, containers, and a clean line of fire.',
    rows: [
      '##################################',
      '#....#........#........#.........#',
      '#.P..#..E.....#...g....#....E....#',
      '#....#........#........#.........#',
      '#....D........#....t...D.........#',
      '#....#........#........#.........#',
      '####D#####D####........####D######',
      '#....c...#....#........#.........#',
      '#...h....#....#...1....#....r....#',
      '#........#....D........#.........#',
      '#....k...#....#...2....#....E....#',
      '#........#....#........#.........#',
      '####D#####....#..####..#....D#####',
      '#........#....#..#..#..#.........#',
      '#...E....#....#..#..#..#....a....#',
      '#........#....#..#..#..#.........#',
      '#...of...#....D..#..#..D.........#',
      '#........#....#..#..#..#....E....#',
      '#....l...#....#..#..#..#......X..#',
      '##################################',
    ],
  },
  {
    id: 'spire',
    name: 'HELIX SPIRE',
    tagline: 'Executive floors. Glass walls. Corporate security.',
    rows: [
      '##############################',
      '#........#........#..........#',
      '#..P.....#...E....#....g.....#',
      '#........#........#..........#',
      '#....##..#........#..##......#',
      '#....##..#...r....#..##......#',
      '#........D........D..........#',
      '#....c...#........#..........#',
      '#...1....#........#..2.a.....#',
      '#........#..####..#..........#',
      '#........#..#..#..#..........#',
      '#........D..#..#..D..........#',
      '#........#..#..#..#..........#',
      '#...E....#..####..#....h.....#',
      '#........#........#..........#',
      '#........D........D..........#',
      '#........#........#..........#',
      '#...of...#...E....#..........#',
      '#........#........#......X...#',
      '##############################',
    ],
  },
  {
    id: 'sublevel',
    name: 'THE SUBLEVEL',
    tagline: 'One arena. Three plates. An augmented psycho.',
    rows: [
      '##############################',
      '#...o....#........#..........#',
      '#..P.....#...E....#....w.....#',
      '#........#........#..........#',
      '#....##..#........#..##......#',
      '#....##..#...B....#..##......#',
      '#........#........#..........#',
      '#........D........D..........#',
      '#....1...#........#....2.....#',
      '#........#........#..........#',
      '#....##..#...E....#..##......#',
      '#....##..#........#..##......#',
      '#........#........#..........#',
      '#........D........D..........#',
      '#..E.....#........#.....3....#',
      '#........#........#..........#',
      '#.....w..#........#........X.#',
      '##############################',
    ],
  },
  {
    id: 'transit',
    name: 'TRANSIT LINE',
    tagline: 'Last train. Long carriages. No scheduled stop.',
    rows: [
      '##############################',
      '#............................#',
      '#..#####1..########..2#####X.#',
      '#..#E...#..#E.....#..#E...#..#',
      '#..#...E#..#.....E#..#...E#..#',
      '#..#..g.#..#....r.#..#.h..#..#',
      '#..##D###..####D###..###D##..#',
      '#............................#',
      '#.c...........l..............#',
      '#.........w........a......3t.#',
      '#............................#',
      '#..##D###..####D###..###D##..#',
      '#..#....#..#......#..#....#..#',
      '#..#E...#..#E.....#..#E...#..#',
      '#..#o..E#..#.....E#..#...o#..#',
      '#.P######..########..######..#',
      '#............................#',
      '#............................#',
      '##############################',
    ],
  },
  {
    id: 'arcology',
    name: 'ARCOLOGY ATRIUM',
    tagline: 'Glass, chrome, and sightlines in every direction.',
    rows: [
      '################################',
      '#..............................#',
      '#.#####1#..............#2#####.#',
      '#.#.E..E#..............#.E..E#.#',
      '#.#.....#....g.....r...#.....#.#',
      '#.###D###..............###D###.#',
      '#..........##########..........#',
      '#.........#..........#.........#',
      '#.........#..........#.........#',
      '#.P..c....#....l.....#....t..X.#',
      '#.........#.....o....#.........#',
      '#.........#..........#.........#',
      '#.........#..........#.........#',
      '#..........##########..........#',
      '#.#######..............#######.#',
      '#.#.....#..............#.....#.#',
      '#.#.E..E#.....h...s....#.E..E#.#',
      '#.###D#3#...a..........#w#D###.#',
      '#..............................#',
      '################################',
    ],
  },
  {
    id: 'safehouse',
    name: 'SAFEHOUSE',
    tagline: 'Your room. Your gear. Your contracts.',
    rows: [
      '##################',
      '#................#',
      '#.C....W....A....#',
      '#................#',
      '#.M.Y.OP..T.U....#',
      '#................#',
      '#........X.......#',
      '##################',
    ],
  },
];

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
  doors: DoorSpawn[];
  spawn: { x: number; y: number };
  enemies: { x: number; y: number; kind?: EnemyTag }[];
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
  const doors: DoorSpawn[] = [];
  const enemies: { x: number; y: number; kind?: EnemyTag }[] = [];
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
