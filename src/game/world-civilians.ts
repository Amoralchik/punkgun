import { dist } from '../core/math';
import { TILE, tileCenter, worldToTile, type Level } from './map';
import { isStandable, roomsFor } from './level-spawns';

/**
 * Civilians for the market-patrol setpiece. Deliberately not an EnemyKind:
 * they never fight, never count as hostiles, and never block objectives.
 * They browse, scatter from noise, and make every stray round a decision.
 */
export interface Civilian {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  corpseAngle: number;
  alive: boolean;
  r: number;
  /** Browsing target. */
  tx: number;
  ty: number;
  waitT: number;
  /** Seconds left of panic; while > 0 they run from (fleeX, fleeY). */
  fleeT: number;
  fleeX: number;
  fleeY: number;
  /** Cosmetic variant for the renderer. */
  look: number;
}

export const CIVILIAN_RADIUS = 15;
const BROWSE_SPEED = 62;
const FLEE_SPEED = 205;

export interface CivilianHost {
  level: Level;
  player: { x: number; y: number };
  civilians: Civilian[];
  rand(): number;
  solidAt(x: number, y: number): boolean;
}

/** Scatter `count` civilians across rooms, away from the player's insertion. */
export function spawnCivilians(
  level: Level,
  count: number,
  rand: () => number,
  nextId: () => number,
): Civilian[] {
  const rooms = roomsFor(level);
  const tiles: { x: number; y: number }[] = [];
  for (let cy = 0; cy < level.h; cy++) {
    for (let cx = 0; cx < level.w; cx++) {
      if (!isStandable(level, cx, cy)) continue;
      if (rooms.tileRoom[cy * level.w + cx] === -1) continue;
      const c = tileCenter(cx, cy, level.h);
      if (dist(c.x, c.y, level.spawn.x, level.spawn.y) < TILE * 4) continue;
      if (dist(c.x, c.y, level.exit.x, level.exit.y) < TILE * 1.5) continue;
      tiles.push(c);
    }
  }
  const out: Civilian[] = [];
  for (let i = 0; i < count && tiles.length > 0; i++) {
    const idx = Math.floor(rand() * tiles.length);
    const t = tiles.splice(idx, 1)[0];
    out.push({
      id: nextId(),
      x: t.x,
      y: t.y,
      vx: 0,
      vy: 0,
      angle: rand() * Math.PI * 2,
      corpseAngle: 0,
      alive: true,
      r: CIVILIAN_RADIUS,
      tx: t.x,
      ty: t.y,
      waitT: rand() * 2,
      fleeT: 0,
      fleeX: 0,
      fleeY: 0,
      look: i % 3,
    });
  }
  return out;
}

/** Pick a nearby standable browsing point in the same room. */
function pickBrowseTarget(host: CivilianHost, c: Civilian): void {
  const { level } = host;
  const rooms = roomsFor(level);
  const here = worldToTile(c.x, c.y, level.h);
  const room = rooms.tileRoom[here.cy * level.w + here.cx];
  for (let attempt = 0; attempt < 8; attempt++) {
    const cx = here.cx + Math.round((host.rand() - 0.5) * 6);
    const cy = here.cy + Math.round((host.rand() - 0.5) * 6);
    if (!isStandable(level, cx, cy)) continue;
    if (room !== -1 && rooms.tileRoom[cy * level.w + cx] !== room) continue;
    const t = tileCenter(cx, cy, level.h);
    c.tx = t.x + (host.rand() - 0.5) * 24;
    c.ty = t.y + (host.rand() - 0.5) * 24;
    return;
  }
  c.tx = c.x;
  c.ty = c.y;
}

/** Noise (gunfire, explosions, alarms) sends nearby civilians running. */
export function panicCivilians(host: CivilianHost, x: number, y: number, radius: number): void {
  for (const c of host.civilians) {
    if (!c.alive) continue;
    if (dist(c.x, c.y, x, y) > radius * 1.25) continue;
    c.fleeT = 3.2 + host.rand() * 1.4;
    c.fleeX = x;
    c.fleeY = y;
  }
}

export function updateCivilians(host: CivilianHost, dt: number): void {
  for (const c of host.civilians) {
    if (!c.alive) {
      c.vx = 0;
      c.vy = 0;
      continue;
    }
    let dx = 0;
    let dy = 0;
    let speed = 0;
    if (c.fleeT > 0) {
      c.fleeT -= dt;
      dx = c.x - c.fleeX;
      dy = c.y - c.fleeY;
      // Jitter so a crowd fans out instead of moving as one block.
      const a = Math.atan2(dy, dx) + Math.sin(c.id * 1.7 + c.fleeT * 2) * 0.5;
      dx = Math.cos(a);
      dy = Math.sin(a);
      speed = FLEE_SPEED;
    } else {
      const d = dist(c.x, c.y, c.tx, c.ty);
      if (d < 6) {
        c.waitT -= dt;
        if (c.waitT <= 0) {
          pickBrowseTarget(host, c);
          c.waitT = 1.2 + host.rand() * 3.5;
        }
      } else {
        dx = (c.tx - c.x) / d;
        dy = (c.ty - c.y) / d;
        speed = BROWSE_SPEED;
      }
    }
    const tvx = dx * speed;
    const tvy = dy * speed;
    const k = Math.min(1, dt * 8);
    c.vx += (tvx - c.vx) * k;
    c.vy += (tvy - c.vy) * k;
    const nx = c.x + c.vx * dt;
    const ny = c.y + c.vy * dt;
    // Axis-separated slide against walls.
    if (!host.solidAt(nx + Math.sign(c.vx) * c.r, c.y)) c.x = nx;
    else {
      c.vx = 0;
      if (c.fleeT <= 0) pickBrowseTarget(host, c);
    }
    if (!host.solidAt(c.x, ny + Math.sign(c.vy) * c.r)) c.y = ny;
    else {
      c.vy = 0;
      if (c.fleeT <= 0) pickBrowseTarget(host, c);
    }
    if (Math.hypot(c.vx, c.vy) > 8) c.angle = Math.atan2(c.vy, c.vx);
  }
}
