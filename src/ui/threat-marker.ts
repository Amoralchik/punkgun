export interface EdgeMarkerPosition {
  x: number;
  y: number;
  angle: number;
  visible: boolean;
}

/** Clamp an off-screen world point to the HUD edge nearest its projection. */
export function edgeMarkerPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 54,
): EdgeMarkerPosition {
  const inside = x > margin && x < width - margin && y > margin && y < height - margin;
  if (inside) return { x, y, angle: 0, visible: false };
  const cx = width / 2;
  const cy = height / 2;
  const dx = x - cx;
  const dy = y - cy;
  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const scaleX = Math.abs(cos) > 1e-6 ? (width / 2 - margin) / Math.abs(cos) : Infinity;
  const scaleY = Math.abs(sin) > 1e-6 ? (height / 2 - margin) / Math.abs(sin) : Infinity;
  const radius = Math.min(scaleX, scaleY);
  return {
    x: cx + cos * radius,
    y: cy + sin * radius,
    angle,
    visible: true,
  };
}
