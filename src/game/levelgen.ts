import { mulberry32 } from '../core/math';

/**
 * Procedural level generation. Every generated contract builds a fresh map
 * from its seed: rooms, doors, cover furniture, squads, loot, weapons and
 * hazards. Output uses the existing layout legend (see map.ts) so the
 * loader, collision, AI and renderer need no special cases, plus two
 * per-tile channels the art pass reads: floor material and prop kind.
 *
 * Extra legend char: `n` = low prop (furniture/cover). It blocks movement
 * and bullets but not sight.
 */

export type Biome = 'motel' | 'street' | 'megatower' | 'desert';

export const BIOMES: Biome[] = ['motel', 'street', 'megatower', 'desert'];

export function isBiome(id: string): id is Biome {
  return (BIOMES as string[]).includes(id);
}

/** Floor materials, read by the map bake. */
export enum Floor {
  Concrete = 0,
  Carpet = 1,
  Checker = 2,
  Wood = 3,
  Office = 4,
  Asphalt = 5,
  RoadLineH = 6,
  RoadLineV = 7,
  Sidewalk = 8,
  Sand = 9,
  Parking = 10,
  Grate = 11,
  Lobby = 12,
  Pool = 13,
}

/** Prop kinds, read by the map bake. */
export enum Prop {
  None = 0,
  Bed = 1,
  Nightstand = 2,
  Sofa = 3,
  Desk = 4,
  Table = 5,
  Rack = 6,
  Plant = 7,
  CarL = 8,
  CarR = 9,
  Dumpster = 10,
  Crate = 11,
  Rock = 12,
  Cactus = 13,
  Counter = 14,
  Vending = 15,
  Tv = 16,
  Booth = 17,
}

export interface GeneratedLayout {
  rows: string[];
  floor: Uint8Array;
  props: Uint8Array;
  daylight: boolean;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type RoomRole =
  | 'start'
  | 'motelRoom'
  | 'bath'
  | 'lobby'
  | 'office'
  | 'server'
  | 'meeting'
  | 'diner'
  | 'shop'
  | 'shack'
  | 'outdoor'
  | 'hall';

interface Room extends Rect {
  role: RoomRole;
  outdoor: boolean;
}

class Grid {
  readonly ch: string[][];
  readonly floor: Uint8Array;
  readonly props: Uint8Array;
  readonly rooms: Room[] = [];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.ch = Array.from({ length: h }, () => Array.from({ length: w }, () => '#'));
    this.floor = new Uint8Array(w * h);
    this.props = new Uint8Array(w * h);
  }
  in(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): string {
    return this.in(x, y) ? this.ch[y][x] : '#';
  }
  set(x: number, y: number, c: string): void {
    if (this.in(x, y)) this.ch[y][x] = c;
  }
  carve(r: Rect, floor: Floor): void {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (x <= 0 || y <= 0 || x >= this.w - 1 || y >= this.h - 1) continue;
        this.ch[y][x] = '.';
        this.floor[y * this.w + x] = floor;
      }
    }
  }
  fill(r: Rect, c: string): void {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) this.set(x, y, c);
  }
  walkable(x: number, y: number): boolean {
    const c = this.get(x, y);
    return c === '.' || c === 'D' || c === 'P' || 'EghrSwsbkfam123l'.includes(c);
  }
  isFloor(x: number, y: number): boolean {
    return this.get(x, y) === '.';
  }
  prop(x: number, y: number, kind: Prop): void {
    this.ch[y][x] = 'n';
    this.props[y * this.w + x] = kind;
  }
  rows(): string[] {
    return this.ch.map((row) => row.join(''));
  }
}

/* ------------------------------------------------------------------ */
/* building blocks                                                     */
/* ------------------------------------------------------------------ */

/** Binary space partition of `r` (walls on rect edges, shared by siblings). */
function bsp(
  g: Grid,
  r: Rect,
  rand: () => number,
  minW: number,
  minH: number,
  out: Rect[],
  doors: { x: number; y: number; vertical: boolean; span: Rect }[],
  depth = 0,
): void {
  const canV = r.w >= minW * 2 - 1;
  const canH = r.h >= minH * 2 - 1;
  const stop = depth > 1 && rand() < 0.18;
  if ((!canV && !canH) || stop) {
    out.push(r);
    return;
  }
  const vertical = canV && (!canH || r.w > r.h * 1.2 || (r.w * 1.2 >= r.h && rand() < 0.5));
  if (vertical) {
    const sx = r.x + minW - 1 + Math.floor(rand() * (r.w - minW * 2 + 2));
    bsp(g, { x: r.x, y: r.y, w: sx - r.x + 1, h: r.h }, rand, minW, minH, out, doors, depth + 1);
    bsp(g, { x: sx, y: r.y, w: r.x + r.w - sx, h: r.h }, rand, minW, minH, out, doors, depth + 1);
    doors.push({ x: sx, y: 0, vertical: true, span: r });
  } else {
    const sy = r.y + minH - 1 + Math.floor(rand() * (r.h - minH * 2 + 2));
    bsp(g, { x: r.x, y: r.y, w: r.w, h: sy - r.y + 1 }, rand, minW, minH, out, doors, depth + 1);
    bsp(g, { x: r.x, y: sy, w: r.w, h: r.y + r.h - sy }, rand, minW, minH, out, doors, depth + 1);
    doors.push({ x: 0, y: sy, vertical: false, span: r });
  }
}

/** Punch a door through a BSP split wall; sometimes a second open gap. */
function connectSplit(
  g: Grid,
  split: { x: number; y: number; vertical: boolean; span: Rect },
  rand: () => number,
  extraGap: number,
): void {
  const candidates: { x: number; y: number }[] = [];
  if (split.vertical) {
    for (let y = split.span.y + 1; y < split.span.y + split.span.h - 1; y++) {
      if (g.isFloor(split.x - 1, y) && g.isFloor(split.x + 1, y) && g.get(split.x, y) === '#') {
        candidates.push({ x: split.x, y });
      }
    }
  } else {
    for (let x = split.span.x + 1; x < split.span.x + split.span.w - 1; x++) {
      if (g.isFloor(x, split.y - 1) && g.isFloor(x, split.y + 1) && g.get(x, split.y) === '#') {
        candidates.push({ x, y: split.y });
      }
    }
  }
  if (candidates.length === 0) return;
  const pick = candidates[Math.floor(rand() * candidates.length)];
  g.set(pick.x, pick.y, 'D');
  if (rand() < extraGap && candidates.length > 3) {
    const far = candidates.filter((c) => Math.abs(c.x - pick.x) + Math.abs(c.y - pick.y) > 2);
    if (far.length > 0) {
      const gap = far[Math.floor(rand() * far.length)];
      g.set(gap.x, gap.y, '.');
      g.floor[gap.y * g.w + gap.x] = Floor.Concrete;
    }
  }
}

/** Build a BSP building inside `area` with walls on its edges. */
function building(
  g: Grid,
  area: Rect,
  rand: () => number,
  minW: number,
  minH: number,
  roleFor: (r: Rect, i: number) => { role: RoomRole; floor: Floor },
  extraGap = 0.3,
): Room[] {
  g.fill(area, '#');
  const leaves: Rect[] = [];
  const splits: { x: number; y: number; vertical: boolean; span: Rect }[] = [];
  bsp(g, area, rand, minW, minH, leaves, splits);
  const rooms: Room[] = [];
  leaves.forEach((leaf, i) => {
    const inner = { x: leaf.x + 1, y: leaf.y + 1, w: leaf.w - 2, h: leaf.h - 2 };
    if (inner.w < 2 || inner.h < 2) return;
    const { role, floor } = roleFor(inner, i);
    g.carve(inner, floor);
    rooms.push({ ...inner, role, outdoor: false });
  });
  for (const split of splits) connectSplit(g, split, rand, extraGap);
  return rooms;
}

/** Open a door from a room's outer wall onto adjacent walkable ground. */
function doorOut(g: Grid, room: Rect, rand: () => number, prefer?: 'n' | 's' | 'e' | 'w'): boolean {
  const options: { x: number; y: number; side: string }[] = [];
  for (let x = room.x; x < room.x + room.w; x++) {
    if (g.get(x, room.y - 1) === '#' && g.isFloor(x, room.y - 2)) options.push({ x, y: room.y - 1, side: 'n' });
    if (g.get(x, room.y + room.h) === '#' && g.isFloor(x, room.y + room.h + 1)) options.push({ x, y: room.y + room.h, side: 's' });
  }
  for (let y = room.y; y < room.y + room.h; y++) {
    if (g.get(room.x - 1, y) === '#' && g.isFloor(room.x - 2, y)) options.push({ x: room.x - 1, y, side: 'w' });
    if (g.get(room.x + room.w, y) === '#' && g.isFloor(room.x + room.w + 1, y)) options.push({ x: room.x + room.w, y, side: 'e' });
  }
  const preferred = prefer ? options.filter((o) => o.side === prefer) : options;
  const pool = preferred.length > 0 ? preferred : options;
  if (pool.length === 0) return false;
  const pick = pool[Math.floor(rand() * pool.length)];
  g.set(pick.x, pick.y, 'D');
  return true;
}

function nearDoor(g: Grid, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) if (g.get(x + dx, y + dy) === 'D') return true;
  }
  return false;
}

/** Floor tiles of a room hugging a wall (for furniture), away from doors. */
function wallHuggers(g: Grid, r: Rect): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (!g.isFloor(x, y) || nearDoor(g, x, y)) continue;
      const touches = g.get(x - 1, y) === '#' || g.get(x + 1, y) === '#' || g.get(x, y - 1) === '#' || g.get(x, y + 1) === '#';
      if (touches) out.push({ x, y });
    }
  }
  return out;
}

/** Place `count` props of `kinds` against walls of a room. */
function furnish(g: Grid, r: Rect, kinds: Prop[], count: number, rand: () => number): void {
  const spots = wallHuggers(g, r);
  for (let i = 0; i < count && spots.length > 0; i++) {
    const idx = Math.floor(rand() * spots.length);
    const s = spots.splice(idx, 1)[0];
    if (!g.isFloor(s.x, s.y)) continue;
    g.prop(s.x, s.y, kinds[Math.floor(rand() * kinds.length)]);
  }
}

/** A centre island (table/booths) when the room leaves a walkable ring. */
function island(g: Grid, r: Rect, kind: Prop, rand: () => number): void {
  if (r.w < 5 || r.h < 5) return;
  const iw = Math.max(1, Math.min(3, r.w - 4));
  const ih = Math.max(1, Math.min(2, r.h - 4));
  const ix = r.x + 2 + Math.floor(rand() * (r.w - 4 - iw + 1));
  const iy = r.y + 2 + Math.floor(rand() * (r.h - 4 - ih + 1));
  for (let y = iy; y < iy + ih; y++) {
    for (let x = ix; x < ix + iw; x++) if (g.isFloor(x, y) && !nearDoor(g, x, y)) g.prop(x, y, kind);
  }
}

function car(g: Grid, x: number, y: number): boolean {
  if (!g.isFloor(x, y) || !g.isFloor(x + 1, y)) return false;
  if (nearDoor(g, x, y) || nearDoor(g, x + 1, y)) return false;
  g.prop(x, y, Prop.CarL);
  g.prop(x + 1, y, Prop.CarR);
  return true;
}

/* ------------------------------------------------------------------ */
/* biomes                                                              */
/* ------------------------------------------------------------------ */

/**
 * Roadside motel at night. Row plan: sand verge (1), units + office (2-9),
 * walkway (10-11), parking lot (12-16), highway (17-19), sand verge (20).
 */
function genMotel(rand: () => number): Grid {
  const W = 38;
  const H = 22;
  const g = new Grid(W, H);
  g.carve({ x: 1, y: 1, w: W - 2, h: H - 2 }, Floor.Sand);
  g.carve({ x: 1, y: 17, w: W - 2, h: 3 }, Floor.Asphalt);
  for (let x = 2; x < W - 2; x += 3) g.floor[18 * W + x] = Floor.RoadLineH;
  g.carve({ x: 2, y: 12, w: W - 4, h: 5 }, Floor.Parking);
  g.carve({ x: 2, y: 10, w: W - 4, h: 2 }, Floor.Concrete);

  // Office / lobby on the left.
  const lobbyW = 7;
  const lobby = building(g, { x: 2, y: 2, w: lobbyW + 2, h: 8 }, rand, 9, 8, () => ({ role: 'lobby', floor: Floor.Checker }));
  for (const r of lobby) {
    doorOut(g, r, rand, 's');
    furnish(g, r, [Prop.Vending, Prop.Plant, Prop.Sofa], 3, rand);
    island(g, r, Prop.Counter, rand);
    g.rooms.push(r);
  }

  // A row of units, each: carpet bedroom, bathroom alcove, door to walkway.
  let x = 2 + lobbyW + 1;
  while (x + 6 < W - 2) {
    const uw = 5 + Math.floor(rand() * 2);
    g.fill({ x, y: 2, w: uw + 1, h: 8 }, '#');
    const room = { x: x + 1, y: 3, w: uw - 1, h: 6 };
    g.carve(room, Floor.Carpet);
    // Bathroom alcove in the back corner.
    const bathW = 2;
    g.carve({ x: x + 1, y: 3, w: bathW, h: 2 }, Floor.Checker);
    g.set(x + 1 + bathW, 3, '#');
    // Door onto the walkway (bottom wall is row 9).
    const doorX = x + 1 + bathW + Math.floor(rand() * Math.max(1, uw - 1 - bathW));
    g.set(Math.min(doorX, x + uw - 1), 9, 'D');
    // Bed against the side wall, nightstand, maybe a TV.
    const bedY = 5 + Math.floor(rand() * 2);
    g.prop(x + uw - 1, bedY, Prop.Bed);
    g.prop(x + uw - 1, bedY + 1 <= 8 ? bedY + 1 : bedY - 1, Prop.Bed);
    if (rand() < 0.7 && g.isFloor(x + uw - 1, 3 + 1)) g.prop(x + uw - 1, 4, Prop.Nightstand);
    if (rand() < 0.5 && g.isFloor(x + 1, 6)) g.prop(x + 1, 6, Prop.Tv);
    g.rooms.push({ ...room, role: 'motelRoom', outdoor: false });
    x += uw; // neighbours share a wall
  }

  // Parked cars, dumpsters behind the units, desert scrub.
  for (let px = 3; px < W - 5; px += 4) if (rand() < 0.6) car(g, px, 12 + Math.floor(rand() * 4));
  for (let i = 0; i < 6; i++) {
    const cx = 2 + Math.floor(rand() * (W - 4));
    const cy = rand() < 0.5 ? 20 : 1;
    if (g.isFloor(cx, cy)) g.prop(cx, cy, rand() < 0.5 ? Prop.Cactus : Prop.Rock);
  }
  if (g.isFloor(W - 3, 11)) g.prop(W - 3, 11, Prop.Dumpster);
  g.rooms.push({ x: 2, y: 12, w: W - 4, h: 5, role: 'outdoor', outdoor: true });
  g.rooms.push({ x: 1, y: 17, w: W - 2, h: 3, role: 'start', outdoor: true });
  return g;
}

/** City block at night: crossing roads, sidewalks, shops you can enter. */
function genStreet(rand: () => number): Grid {
  const W = 40;
  const H = 24;
  const g = new Grid(W, H);
  const roadY = 9 + Math.floor(rand() * 4);
  const roadX = 15 + Math.floor(rand() * 8);
  // Roads (3 wide) with lane markings, sidewalks around them.
  g.carve({ x: 1, y: roadY - 1, w: W - 2, h: 5 }, Floor.Sidewalk);
  g.carve({ x: roadX - 1, y: 1, w: 5, h: H - 2 }, Floor.Sidewalk);
  g.carve({ x: 1, y: roadY, w: W - 2, h: 3 }, Floor.Asphalt);
  g.carve({ x: roadX, y: 1, w: 3, h: H - 2 }, Floor.Asphalt);
  for (let x = 2; x < W - 2; x += 2) if (x < roadX || x > roadX + 2) g.floor[(roadY + 1) * W + x] = Floor.RoadLineH;
  for (let y = 2; y < H - 2; y += 2) if (y < roadY || y > roadY + 2) g.floor[y * W + roadX + 1] = Floor.RoadLineV;
  // Four blocks of buildings; each gets 1-3 enterable shops.
  const blocks: Rect[] = [
    { x: 1, y: 1, w: roadX - 2, h: roadY - 2 },
    { x: roadX + 4, y: 1, w: W - roadX - 5, h: roadY - 2 },
    { x: 1, y: roadY + 4, w: roadX - 2, h: H - roadY - 5 },
    { x: roadX + 4, y: roadY + 4, w: W - roadX - 5, h: H - roadY - 5 },
  ];
  const roles: { role: RoomRole; floor: Floor; props: Prop[]; island?: Prop }[] = [
    { role: 'diner', floor: Floor.Checker, props: [Prop.Booth, Prop.Counter], island: Prop.Booth },
    { role: 'shop', floor: Floor.Wood, props: [Prop.Crate, Prop.Counter, Prop.Plant] },
    { role: 'shop', floor: Floor.Concrete, props: [Prop.Rack, Prop.Crate] },
    { role: 'hall', floor: Floor.Carpet, props: [Prop.Sofa, Prop.Tv, Prop.Table] },
  ];
  for (const block of blocks) {
    if (block.w < 5 || block.h < 5) continue;
    // Alley: sometimes split the block with a 2-wide walkable gap.
    const rooms = building(g, block, rand, 6, 5, (r, i) => {
      const def = roles[(i + Math.floor(rand() * roles.length)) % roles.length];
      return { role: def.role, floor: def.floor };
    }, 0.15);
    for (const room of rooms) {
      // Interior rooms without street frontage still connect via BSP doors;
      // rooms on the block edge get a street door.
      if (rand() < 0.75) doorOut(g, room, rand);
      const def = roles.find((d) => d.role === room.role) ?? roles[1];
      furnish(g, room, def.props, 2 + Math.floor(rand() * 3), rand);
      if (def.island) island(g, room, def.island, rand);
      g.rooms.push(room);
    }
    // Guarantee at least one street entrance per block.
    if (rooms.length > 0) doorOut(g, rooms[0], rand);
  }
  // Cars on the road, clutter on the sidewalks.
  for (let i = 0; i < 6; i++) {
    if (rand() < 0.5) car(g, 2 + Math.floor(rand() * (W - 5)), roadY + Math.floor(rand() * 3));
  }
  for (let i = 0; i < 6; i++) {
    const sx = 2 + Math.floor(rand() * (W - 4));
    const sy = rand() < 0.5 ? roadY - 1 : roadY + 3;
    if (g.isFloor(sx, sy) && !nearDoor(g, sx, sy)) g.prop(sx, sy, rand() < 0.5 ? Prop.Dumpster : Prop.Crate);
  }
  for (let i = 0; i < 3; i++) {
    const sx = 2 + Math.floor(rand() * (W - 4));
    const sy = roadY - 1;
    if (g.isFloor(sx, sy) && !nearDoor(g, sx, sy)) g.set(sx, sy, 'S');
  }
  g.rooms.push({ x: 1, y: roadY - 1, w: W - 2, h: 5, role: 'start', outdoor: true });
  g.rooms.push({ x: roadX - 1, y: 1, w: 5, h: H - 2, role: 'outdoor', outdoor: true });
  return g;
}

/** Corporate megatower floor: lobby, offices, server rooms, glass. */
function genMegatower(rand: () => number): Grid {
  const W = 34;
  const H = 22;
  const g = new Grid(W, H);
  const roles: { role: RoomRole; floor: Floor; props: Prop[]; island?: Prop; weight: number }[] = [
    { role: 'office', floor: Floor.Office, props: [Prop.Desk, Prop.Desk, Prop.Plant], weight: 4 },
    { role: 'server', floor: Floor.Grate, props: [Prop.Rack, Prop.Rack], weight: 2 },
    { role: 'meeting', floor: Floor.Wood, props: [Prop.Plant, Prop.Tv], island: Prop.Table, weight: 2 },
    { role: 'lobby', floor: Floor.Lobby, props: [Prop.Sofa, Prop.Plant, Prop.Vending], island: Prop.Counter, weight: 1 },
  ];
  const total = roles.reduce((s, r) => s + r.weight, 0);
  const pickRole = () => {
    let roll = rand() * total;
    for (const r of roles) {
      roll -= r.weight;
      if (roll <= 0) return r;
    }
    return roles[0];
  };
  const rooms = building(g, { x: 0, y: 0, w: W, h: H }, rand, 7, 6, () => {
    const r = pickRole();
    return { role: r.role, floor: r.floor };
  }, 0.4);
  for (const room of rooms) {
    const def = roles.find((d) => d.role === room.role)!;
    furnish(g, room, def.props, Math.max(2, Math.floor((room.w * room.h) / 9)), rand);
    if (def.island) island(g, room, def.island, rand);
    if (room.role === 'office' && room.w >= 6 && room.h >= 5) island(g, room, Prop.Desk, rand);
    g.rooms.push(room);
  }
  // Glass partitions: some interior wall runs become breakable glass.
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (g.get(x, y) !== '#') continue;
      const horiz = g.isFloor(x, y - 1) && g.isFloor(x, y + 1);
      const vert = g.isFloor(x - 1, y) && g.isFloor(x + 1, y);
      if ((horiz || vert) && rand() < 0.22) g.set(x, y, 'G');
    }
  }
  return g;
}

/** Desert outpost by day: highway, rock shelves, shacks, wrecks. */
function genDesert(rand: () => number): Grid {
  const W = 40;
  const H = 24;
  const g = new Grid(W, H);
  g.carve({ x: 1, y: 1, w: W - 2, h: H - 2 }, Floor.Sand);
  // Irregular rock shelf along the borders.
  for (let x = 1; x < W - 1; x++) {
    const top = Math.floor(rand() * 3);
    const bottom = Math.floor(rand() * 3);
    for (let y = 1; y <= top; y++) g.set(x, y, '#');
    for (let y = H - 2; y >= H - 1 - bottom; y--) g.set(x, y, '#');
  }
  // Highway across the map.
  const roadY = 9 + Math.floor(rand() * 5);
  g.carve({ x: 1, y: roadY, w: W - 2, h: 3 }, Floor.Asphalt);
  for (let x = 2; x < W - 2; x += 3) g.floor[(roadY + 1) * W + x] = Floor.RoadLineH;
  // Shacks / adobe compounds.
  const shacks = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < shacks; i++) {
    const sw = 6 + Math.floor(rand() * 5);
    const sh = 5 + Math.floor(rand() * 3);
    const above = rand() < 0.5;
    const sx = 3 + Math.floor((i / shacks) * (W - sw - 6)) + Math.floor(rand() * 3);
    const sy = above ? Math.max(3, roadY - sh - 1 - Math.floor(rand() * 2)) : roadY + 4 + Math.floor(rand() * 2);
    if (sy + sh >= H - 3) continue;
    const rooms = building(g, { x: sx, y: sy, w: sw, h: sh }, rand, 5, 5, () => ({ role: 'shack', floor: Floor.Wood }), 0.2);
    for (const room of rooms) {
      doorOut(g, room, rand, above ? 's' : 'n');
      furnish(g, room, [Prop.Crate, Prop.Table, Prop.Bed], 2, rand);
      g.rooms.push(room);
    }
  }
  // Rock clusters, cacti and wrecked cars as cover in the open.
  for (let i = 0; i < 16; i++) {
    const rx = 2 + Math.floor(rand() * (W - 4));
    const ry = 2 + Math.floor(rand() * (H - 4));
    if (!g.isFloor(rx, ry) || g.floor[ry * W + rx] !== Floor.Sand || nearDoor(g, rx, ry)) continue;
    g.prop(rx, ry, rand() < 0.6 ? Prop.Rock : Prop.Cactus);
  }
  for (let i = 0; i < 3; i++) car(g, 3 + Math.floor(rand() * (W - 7)), roadY + Math.floor(rand() * 3));
  for (let i = 0; i < 4; i++) {
    const bx = 2 + Math.floor(rand() * (W - 4));
    const by = 2 + Math.floor(rand() * (H - 4));
    if (g.isFloor(bx, by) && !nearDoor(g, bx, by)) g.set(bx, by, 'o');
  }
  g.rooms.push({ x: 1, y: roadY, w: W - 2, h: 3, role: 'start', outdoor: true });
  g.rooms.push({ x: 1, y: 1, w: W - 2, h: H - 2, role: 'outdoor', outdoor: true });
  return g;
}

/* ------------------------------------------------------------------ */
/* population                                                          */
/* ------------------------------------------------------------------ */

function bfs(g: Grid, sx: number, sy: number): Int32Array {
  const d = new Int32Array(g.w * g.h).fill(-1);
  const q: number[] = [sy * g.w + sx];
  d[q[0]] = 0;
  for (let head = 0; head < q.length; head++) {
    const cur = q[head];
    const x = cur % g.w;
    const y = (cur / g.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!g.in(nx, ny) || !g.walkable(nx, ny)) continue;
      const ni = ny * g.w + nx;
      if (d[ni] !== -1) continue;
      d[ni] = d[cur] + 1;
      q.push(ni);
    }
  }
  return d;
}

/**
 * Every floor tile must be reachable from the insertion: punch a door into
 * each sealed region through a single wall, or fill it in if it can't be
 * reached (no dead, unenterable rooms on the map).
 */
function ensureConnected(g: Grid, sx: number, sy: number, rand: () => number): void {
  for (let pass = 0; pass < 24; pass++) {
    const d = bfs(g, sx, sy);
    const doors: { x: number; y: number }[] = [];
    let sealed = 0;
    for (let y = 1; y < g.h - 1; y++) {
      for (let x = 1; x < g.w - 1; x++) {
        if (g.get(x, y) !== '#') continue;
        const pairs: [number, number, number, number][] = [
          [x - 1, y, x + 1, y],
          [x, y - 1, x, y + 1],
        ];
        for (const [ax, ay, bx, by] of pairs) {
          const aIn = g.walkable(ax, ay) && d[ay * g.w + ax] >= 0;
          const bIn = g.walkable(bx, by) && d[by * g.w + bx] >= 0;
          const aOut = g.isFloor(ax, ay) && d[ay * g.w + ax] < 0;
          const bOut = g.isFloor(bx, by) && d[by * g.w + bx] < 0;
          if ((aIn && bOut) || (bIn && aOut)) doors.push({ x, y });
        }
      }
    }
    for (let i = 0; i < g.w * g.h; i++) {
      if (g.isFloor(i % g.w, (i / g.w) | 0) && d[i] < 0) sealed++;
    }
    if (sealed === 0) return;
    if (doors.length === 0) break;
    const pick = doors[Math.floor(rand() * doors.length)];
    g.set(pick.x, pick.y, 'D');
  }
  // Whatever is still sealed becomes solid.
  const d = bfs(g, sx, sy);
  for (let i = 0; i < g.w * g.h; i++) {
    const x = i % g.w;
    const y = (i / g.w) | 0;
    if (d[i] >= 0) continue;
    const c = g.get(x, y);
    if (c === '.' || c === 'n' || c === 'D') {
      g.set(x, y, '#');
      g.props[i] = 0;
    }
  }
}

const ENEMY_CHARS = ['E', 'E', 'E', 'E', 'g', 'g', 'r', 'h'];
const WEAPON_CHARS = ['w', 'w', 's', 'k', 'b', 'f', 'a'];

function populate(g: Grid, biome: Biome, rand: () => number): boolean {
  // Insertion: the far left of the 'start' strip (outdoor) or a random edge room.
  const start = g.rooms.find((r) => r.role === 'start') ?? g.rooms[0];
  let spawn: { x: number; y: number } | null = null;
  for (let x = start.x; x < start.x + start.w && !spawn; x++) {
    for (let y = start.y; y < start.y + start.h; y++) {
      if (g.isFloor(x, y)) {
        spawn = { x, y };
        break;
      }
    }
  }
  if (!spawn) return false;
  g.set(spawn.x, spawn.y, 'P');
  ensureConnected(g, spawn.x, spawn.y, rand);
  let dist = bfs(g, spawn.x, spawn.y);

  // Exit: a floor tile against a wall, as far from insertion as possible.
  let exit: { x: number; y: number } | null = null;
  let best = -1;
  for (let y = 1; y < g.h - 1; y++) {
    for (let x = 1; x < g.w - 1; x++) {
      const i = y * g.w + x;
      if (!g.isFloor(x, y) || dist[i] < 0 || nearDoor(g, x, y)) continue;
      const againstWall = g.get(x - 1, y) === '#' || g.get(x + 1, y) === '#' || g.get(x, y - 1) === '#' || g.get(x, y + 1) === '#';
      if (!againstWall) continue;
      const score = dist[i] + rand() * 4;
      if (score > best) {
        best = score;
        exit = { x, y };
      }
    }
  }
  if (!exit) return false;
  g.set(exit.x, exit.y, 'X');
  dist = bfs(g, spawn.x, spawn.y);

  const free: { x: number; y: number; d: number }[] = [];
  for (let y = 1; y < g.h - 1; y++) {
    for (let x = 1; x < g.w - 1; x++) {
      const i = y * g.w + x;
      if (g.isFloor(x, y) && dist[i] > 0 && !nearDoor(g, x, y)) free.push({ x, y, d: dist[i] });
    }
  }
  const maxD = Math.max(...free.map((f) => f.d));
  const take = (minD: number, spread: { x: number; y: number }[], minGap: number): { x: number; y: number } | null => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const f = free[Math.floor(rand() * free.length)];
      if (!f || f.d < minD || !g.isFloor(f.x, f.y)) continue;
      if (spread.some((s) => Math.abs(s.x - f.x) + Math.abs(s.y - f.y) < minGap)) continue;
      return f;
    }
    return null;
  };

  // Hostiles: squads of 1-3 away from the insertion.
  const enemyCount = 8 + Math.floor(rand() * 5);
  const placed: { x: number; y: number }[] = [];
  while (placed.length < enemyCount) {
    const anchor = take(Math.min(9, maxD * 0.35), placed, 4);
    if (!anchor) break;
    const squad = 1 + Math.floor(rand() * 3);
    for (let s = 0; s < squad && placed.length < enemyCount; s++) {
      const ox = anchor.x + (s === 0 ? 0 : Math.floor(rand() * 3) - 1);
      const oy = anchor.y + (s === 0 ? 0 : Math.floor(rand() * 3) - 1);
      if (!g.isFloor(ox, oy)) continue;
      g.set(ox, oy, ENEMY_CHARS[Math.floor(rand() * ENEMY_CHARS.length)]);
      placed.push({ x: ox, y: oy });
    }
  }
  if (placed.length < 6) return false;

  // Loot caches deep in the map, weapons scattered.
  const loot: { x: number; y: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const p = take(maxD * 0.45, loot, 6);
    if (!p) continue;
    g.set(p.x, p.y, String(1 + Math.floor(rand() * 3)));
    loot.push(p);
  }
  if (loot.length < 3) return false;
  const guns: { x: number; y: number }[] = [];
  for (let i = 0; i < 2 + Math.floor(rand() * 3); i++) {
    const p = take(2, guns, 5);
    if (!p) continue;
    g.set(p.x, p.y, WEAPON_CHARS[Math.floor(rand() * WEAPON_CHARS.length)]);
    guns.push(p);
  }
  // A melee weapon near the insertion so a fists start is survivable.
  const near = free.filter((f) => f.d >= 2 && f.d <= 5 && g.isFloor(f.x, f.y));
  if (near.length > 0) {
    const p = near[Math.floor(rand() * near.length)];
    g.set(p.x, p.y, 'b');
  }

  // Security per biome.
  const security = biome === 'megatower' ? { c: 3, t: 2, l: 2 } : biome === 'street' ? { c: 2, t: 0, l: 0 } : biome === 'motel' ? { c: 1, t: 0, l: 0 } : { c: 0, t: 1, l: 0 };
  const hz: { x: number; y: number }[] = [];
  const placeHazard = (ch: string, minD: number) => {
    const p = take(minD, hz, 5);
    if (!p) return;
    g.set(p.x, p.y, ch);
    hz.push(p);
  };
  for (let i = 0; i < security.c; i++) placeHazard('c', 6);
  for (let i = 0; i < security.t; i++) placeHazard('t', 10);
  // Laser grids sit in doorway-adjacent hall tiles of the tower.
  for (let i = 0; i < security.l; i++) placeHazard('l', 8);
  if (biome !== 'desert') for (let i = 0; i < 2; i++) placeHazard('o', 5);

  // Everything important must be reachable from the insertion.
  dist = bfs(g, spawn.x, spawn.y);
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const c = g.get(x, y);
      if (!'EghrX123'.includes(c)) continue;
      if (c === 'X') {
        const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => dist[(y + dy) * g.w + x + dx] >= 0);
        if (!ok) return false;
      } else if (dist[y * g.w + x] < 0) {
        return false;
      }
    }
  }
  return true;
}

const GENERATORS: Record<Biome, (rand: () => number) => Grid> = {
  motel: genMotel,
  street: genStreet,
  megatower: genMegatower,
  desert: genDesert,
};

/** Generate a playable layout for `biome` from `seed` (retries on dead ends). */
export function generateLayout(biome: Biome, seed: number): GeneratedLayout {
  for (let attempt = 0; attempt < 40; attempt++) {
    const rand = mulberry32((seed + attempt * 0x9e3779b1) >>> 0);
    const g = GENERATORS[biome](rand);
    if (populate(g, biome, rand)) {
      return { rows: g.rows(), floor: g.floor, props: g.props, daylight: biome === 'desert' };
    }
  }
  throw new Error(`levelgen: could not build ${biome} for seed ${seed}`);
}
