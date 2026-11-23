import { clamp } from '../core/math';

/** True when the segment A→B intersects the circle at C with radius r. */
export function segmentHitsCircle(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  r: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = 0;
  if (l2 > 0.0001) t = clamp(((cx - ax) * dx + (cy - ay) * dy) / l2, 0, 1);
  const px = ax + dx * t;
  const py = ay + dy * t;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey <= r * r;
}
