import { TILE, Level, tileCenter } from './map';

export interface PathPoint {
  x: number;
  y: number;
}

/**
 * Breadth-first search over the tile grid. Doors are treated as passable;
 * closed doors are handled by the caller opening them on approach.
 */
export class Pathfinder {
  private readonly prev: Int32Array;
  private readonly blocked: Uint8Array;
  private readonly queue: Int32Array;

  constructor(
    private readonly w: number,
    private readonly h: number,
  ) {
    this.prev = new Int32Array(w * h);
    this.blocked = new Uint8Array(w * h);
    this.queue = new Int32Array(w * h);
  }

  find(level: Level, sx: number, sy: number, tx: number, ty: number): PathPoint[] | null {
    const { w, h } = this;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h || tx < 0 || ty < 0 || tx >= w || ty >= h) return null;
    if (sx === tx && sy === ty) return null;

    for (let i = 0; i < w * h; i++) this.blocked[i] = level.walls[i];
    const start = sy * w + sx;
    const goal = ty * w + tx;
    if (this.blocked[goal] === 1) return null;

    this.prev.fill(-1);
    this.prev[goal] = goal;
    let head = 0;
    let tail = 0;
    this.queue[tail++] = goal;

    let found = false;
    while (head < tail) {
      const cur = this.queue[head++];
      if (cur === start) {
        found = true;
        break;
      }
      const cx = cur % w;
      const cy = (cur / w) | 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = cx + ox;
          const ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (this.blocked[ni] === 1 || this.prev[ni] !== -1) continue;
          if (ox !== 0 && oy !== 0) {
            // No cutting wall corners.
            if (this.blocked[cy * w + nx] === 1 || this.blocked[ny * w + cx] === 1) continue;
          }
          this.prev[ni] = cur;
          this.queue[tail++] = ni;
        }
      }
    }

    if (!found) return null;

    const points: PathPoint[] = [];
    let cur = start;
    let guard = 0;
    while (cur !== goal && guard++ < w * h) {
      const cx = cur % w;
      const cy = (cur / w) | 0;
      const p = tileCenter(cx, cy, h);
      points.push(p);
      cur = this.prev[cur];
      if (cur === -1) return null;
    }
    const end = tileCenter(tx, ty, h);
    points.push(end);
    // Drop the first tile: the unit already stands there.
    if (points.length > 1) points.shift();
    return points;
  }

  static tileOf(x: number, y: number): { cx: number; cy: number } {
    return { cx: Math.floor(x / TILE), cy: Math.floor(y / TILE) };
  }
}
