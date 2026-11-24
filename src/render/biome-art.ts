import { TILE } from '../game/map';
import { Floor, Prop } from '../game/levelgen';

/**
 * Hand-painted (procedurally) materials and furniture for generated maps.
 * Direction: Hotline Miami's bold, saturated, patterned floors and chunky
 * readable furniture, crossed with old Fallout's sun-bleached desert and
 * retro-futurist kit. Everything is painted into the baked map canvas.
 *
 * Coordinates are canvas pixels; (x, y) is a tile's top-left corner.
 */

type Ctx = CanvasRenderingContext2D;

function noise(ctx: Ctx, x: number, y: number, rnd: () => number, count: number, color: string, size = 2): void {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) ctx.fillRect(x + rnd() * TILE, y + rnd() * TILE, size, size);
}

/* ------------------------------------------------------------------ */
/* floors                                                              */
/* ------------------------------------------------------------------ */

export function paintFloor(ctx: Ctx, kind: number, x: number, y: number, cx: number, cy: number, rnd: () => number): void {
  switch (kind) {
    case Floor.Carpet: {
      // Motel carpet: oxblood with a gold diamond lattice.
      ctx.fillStyle = '#5a1726';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(232, 176, 82, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + TILE / 2);
      ctx.lineTo(x + TILE / 2, y);
      ctx.lineTo(x + TILE, y + TILE / 2);
      ctx.lineTo(x + TILE / 2, y + TILE);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(40, 170, 160, 0.7)';
      ctx.fillRect(x + TILE / 2 - 3, y + TILE / 2 - 3, 6, 6);
      noise(ctx, x, y, rnd, 18, 'rgba(0,0,0,0.18)', 2);
      return;
    }
    case Floor.Checker: {
      const a = (cx + cy) % 2 === 0;
      ctx.fillStyle = '#f0e9d8';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#1b1d24';
      for (let iy = 0; iy < 2; iy++) {
        for (let ix = 0; ix < 2; ix++) {
          if ((ix + iy + (a ? 0 : 1)) % 2 === 0) ctx.fillRect(x + ix * 32, y + iy * 32, 32, 32);
        }
      }
      noise(ctx, x, y, rnd, 10, 'rgba(90, 70, 50, 0.12)', 3);
      return;
    }
    case Floor.Wood: {
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(x, y, TILE, TILE);
      for (let i = 0; i < 4; i++) {
        const py = y + i * 16;
        ctx.fillStyle = i % 2 ? '#86522f' : '#6f4224';
        ctx.fillRect(x, py, TILE, 15);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x, py + 15, TILE, 1);
        const joint = ((cx * 37 + i * 23) % 4) * 16;
        ctx.fillRect(x + joint, py, 1, 15);
      }
      noise(ctx, x, y, rnd, 8, 'rgba(40, 20, 8, 0.25)', 3);
      return;
    }
    case Floor.Office: {
      ctx.fillStyle = (cx + cy) % 2 === 0 ? '#2d3c52' : '#33445c';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      noise(ctx, x, y, rnd, 30, 'rgba(160, 190, 230, 0.06)', 2);
      return;
    }
    case Floor.Lobby: {
      // Polished marble with veining.
      ctx.fillStyle = '#d9d2c3';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(120, 110, 100, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const sx = x + rnd() * TILE;
      ctx.moveTo(sx, y);
      ctx.bezierCurveTo(sx + 20, y + 20, sx - 15, y + 40, sx + 10, y + TILE);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      return;
    }
    case Floor.Grate: {
      ctx.fillStyle = '#15191f';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = '#2c3440';
      ctx.lineWidth = 2;
      for (let i = 8; i < TILE; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y + TILE);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(94, 241, 255, 0.12)';
      ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
      return;
    }
    case Floor.Asphalt:
    case Floor.RoadLineH:
    case Floor.RoadLineV:
    case Floor.Parking: {
      ctx.fillStyle = '#26272b';
      ctx.fillRect(x, y, TILE, TILE);
      noise(ctx, x, y, rnd, 40, 'rgba(255,255,255,0.05)', 2);
      noise(ctx, x, y, rnd, 20, 'rgba(0,0,0,0.25)', 3);
      if (rnd() < 0.12) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + rnd() * TILE, y + rnd() * TILE);
        ctx.lineTo(x + rnd() * TILE, y + rnd() * TILE);
        ctx.stroke();
      }
      ctx.fillStyle = '#e8c547';
      if (kind === Floor.RoadLineH) ctx.fillRect(x + 8, y + TILE / 2 - 2, TILE - 16, 4);
      if (kind === Floor.RoadLineV) ctx.fillRect(x + TILE / 2 - 2, y + 8, 4, TILE - 16);
      if (kind === Floor.Parking && cx % 2 === 0) {
        ctx.fillStyle = 'rgba(240, 240, 230, 0.75)';
        ctx.fillRect(x, y + 4, 3, TILE - 8);
      }
      return;
    }
    case Floor.Sidewalk: {
      ctx.fillStyle = '#55575c';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, 31, 31);
      ctx.strokeRect(x + 32.5, y + 0.5, 31, 31);
      ctx.strokeRect(x + 0.5, y + 32.5, 31, 31);
      ctx.strokeRect(x + 32.5, y + 32.5, 31, 31);
      noise(ctx, x, y, rnd, 12, 'rgba(0,0,0,0.2)', 3);
      return;
    }
    case Floor.Sand: {
      // Warm sand with wind ripples.
      const g = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
      g.addColorStop(0, '#d4a76a');
      g.addColorStop(1, '#c99a5c');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(150, 100, 50, 0.22)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const ry = y + 10 + i * 20 + Math.sin(cx * 1.3 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(x, ry);
        ctx.quadraticCurveTo(x + TILE / 2, ry - 5, x + TILE, ry + Math.sin(cx + i) * 3);
        ctx.stroke();
      }
      noise(ctx, x, y, rnd, 14, 'rgba(110, 70, 30, 0.25)', 2);
      noise(ctx, x, y, rnd, 6, 'rgba(255, 240, 200, 0.3)', 2);
      return;
    }
    default: {
      ctx.fillStyle = '#3a3c42';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      noise(ctx, x, y, rnd, 16, 'rgba(0,0,0,0.18)', 3);
      noise(ctx, x, y, rnd, 8, 'rgba(255,255,255,0.05)', 2);
    }
  }
}

/* ------------------------------------------------------------------ */
/* props                                                               */
/* ------------------------------------------------------------------ */

function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, edge: string, r = 4): void {
  // Soft drop shadow, then the body with a lit top edge.
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.roundRect(x + 4, y + 5, w, h, r);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x + 3, y + 2, w - 6, 3);
}

export function paintProp(ctx: Ctx, kind: number, x: number, y: number, rnd: () => number): void {
  const m = 6;
  switch (kind) {
    case Prop.Bed:
      box(ctx, x + m, y + m, TILE - m * 2, TILE - m * 2, '#e8e1d2', '#3b2a22', 6);
      ctx.fillStyle = '#b8344a';
      ctx.fillRect(x + m + 2, y + 22, TILE - m * 2 - 4, TILE - 30);
      ctx.fillStyle = '#fff6e6';
      ctx.fillRect(x + m + 6, y + m + 4, TILE - m * 2 - 12, 10);
      return;
    case Prop.Nightstand:
      box(ctx, x + 14, y + 14, 36, 36, '#6b4226', '#2a180c');
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath();
      ctx.arc(x + 32, y + 30, 7, 0, Math.PI * 2);
      ctx.fill();
      return;
    case Prop.Sofa:
      box(ctx, x + 4, y + 10, TILE - 8, TILE - 20, '#2f6f73', '#123033', 10);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 10, y + 16, TILE - 20, 8);
      return;
    case Prop.Desk:
      box(ctx, x + 4, y + 8, TILE - 8, TILE - 16, '#3b2f28', '#14100c', 3);
      ctx.fillStyle = '#0d1a22';
      ctx.fillRect(x + 18, y + 14, 28, 16);
      ctx.fillStyle = 'rgba(94, 241, 255, 0.75)';
      ctx.fillRect(x + 20, y + 16, 24, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x + 22, y + 18, 14, 2);
      return;
    case Prop.Table:
      box(ctx, x + 3, y + 3, TILE - 6, TILE - 6, '#5d3a22', '#22140a', 4);
      ctx.fillStyle = 'rgba(255, 220, 160, 0.25)';
      ctx.beginPath();
      ctx.arc(x + 32, y + 32, 9, 0, Math.PI * 2);
      ctx.fill();
      return;
    case Prop.Booth:
      box(ctx, x + 4, y + 4, TILE - 8, TILE - 8, '#c4283f', '#4a0d17', 12);
      ctx.fillStyle = '#e9e2d3';
      ctx.fillRect(x + 16, y + 20, 32, 24);
      return;
    case Prop.Counter:
      box(ctx, x + 2, y + 10, TILE - 4, TILE - 20, '#8a8f99', '#2b2e35', 3);
      ctx.fillStyle = '#c9ced8';
      ctx.fillRect(x + 4, y + 12, TILE - 8, 6);
      return;
    case Prop.Rack: {
      box(ctx, x + 8, y + 4, TILE - 16, TILE - 8, '#11161d', '#33414f', 2);
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = rnd() < 0.5 ? '#5ef1ff' : rnd() < 0.5 ? '#7dffcf' : '#ff3b4e';
        ctx.fillRect(x + 14 + (i % 3) * 12, y + 12 + Math.floor(i / 3) * 18, 4, 3);
      }
      return;
    }
    case Prop.Plant:
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(x + 35, y + 36, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a4a2a';
      ctx.beginPath();
      ctx.arc(x + 32, y + 32, 12, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + rnd();
        ctx.fillStyle = i % 2 ? '#2f8f4a' : '#3fae5c';
        ctx.beginPath();
        ctx.ellipse(x + 32 + Math.cos(a) * 9, y + 32 + Math.sin(a) * 9, 9, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    case Prop.CarL:
    case Prop.CarR: {
      // Two-tile retro sedan; each half paints its own end.
      const left = kind === Prop.CarL;
      // Colour keyed on the car's left tile so both halves match.
      const ox = left ? x : x - TILE;
      const body = ['#b83a2e', '#2f6f9e', '#d9b44a', '#4f8a5b', '#e8e1d2'][Math.floor(Math.abs(Math.sin(ox * 0.013 + y * 0.007)) * 5)];
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(x + (left ? 8 : 0), y + 14, left ? TILE - 8 : TILE - 4, 42);
      ctx.fillStyle = body;
      ctx.beginPath();
      if (left) ctx.roundRect(x + 4, y + 10, TILE - 4, 42, [14, 0, 0, 14]);
      else ctx.roundRect(x, y + 10, TILE - 4, 42, [0, 14, 14, 0]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(20, 40, 55, 0.85)';
      if (left) ctx.fillRect(x + 34, y + 15, 26, 32);
      else ctx.fillRect(x + 2, y + 15, 20, 32);
      ctx.fillStyle = left ? '#ffeaa0' : '#ff3b4e';
      ctx.fillRect(left ? x + 6 : x + TILE - 9, y + 14, 4, 8);
      ctx.fillRect(left ? x + 6 : x + TILE - 9, y + 40, 4, 8);
      return;
    }
    case Prop.Dumpster:
      box(ctx, x + 4, y + 10, TILE - 8, TILE - 18, '#2f5d3a', '#10231a', 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 26);
      ctx.lineTo(x + TILE - 8, y + 26);
      ctx.stroke();
      return;
    case Prop.Crate:
      box(ctx, x + 10, y + 10, TILE - 20, TILE - 20, '#a67b45', '#4a3018', 2);
      ctx.strokeStyle = 'rgba(60, 35, 15, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 12);
      ctx.lineTo(x + TILE - 12, y + TILE - 12);
      ctx.moveTo(x + TILE - 12, y + 12);
      ctx.lineTo(x + 12, y + TILE - 12);
      ctx.stroke();
      return;
    case Prop.Rock: {
      ctx.fillStyle = 'rgba(80, 50, 25, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x + 36, y + 38, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6142';
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 40);
      ctx.lineTo(x + 18, y + 14);
      ctx.lineTo(x + 40, y + 8);
      ctx.lineTo(x + 56, y + 26);
      ctx.lineTo(x + 50, y + 50);
      ctx.lineTo(x + 22, y + 54);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a77a55';
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 14);
      ctx.lineTo(x + 40, y + 8);
      ctx.lineTo(x + 46, y + 24);
      ctx.lineTo(x + 24, y + 30);
      ctx.closePath();
      ctx.fill();
      return;
    }
    case Prop.Cactus:
      ctx.fillStyle = 'rgba(80, 50, 25, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x + 36, y + 40, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d7a45';
      ctx.beginPath();
      ctx.arc(x + 32, y + 32, 11, 0, Math.PI * 2);
      ctx.arc(x + 18, y + 26, 6, 0, Math.PI * 2);
      ctx.arc(x + 46, y + 38, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7aa8';
      ctx.beginPath();
      ctx.arc(x + 32, y + 28, 3, 0, Math.PI * 2);
      ctx.fill();
      return;
    case Prop.Vending:
      box(ctx, x + 10, y + 6, TILE - 20, TILE - 12, '#c4283f', '#4a0d17', 3);
      ctx.fillStyle = '#ffe9b0';
      ctx.fillRect(x + 16, y + 12, TILE - 32, 18);
      ctx.fillStyle = 'rgba(94, 241, 255, 0.8)';
      ctx.fillRect(x + 16, y + 36, 10, 4);
      return;
    case Prop.Tv:
      box(ctx, x + 14, y + 16, 36, 30, '#2b2622', '#0f0c0a', 6);
      ctx.fillStyle = 'rgba(150, 230, 255, 0.85)';
      ctx.fillRect(x + 19, y + 21, 26, 18);
      return;
    default:
      box(ctx, x + 10, y + 10, TILE - 20, TILE - 20, '#555', '#222');
  }
}

/* ------------------------------------------------------------------ */
/* walls                                                               */
/* ------------------------------------------------------------------ */

/** Biome surface detail painted over a wall slab's cap. */
export function paintWallDetail(
  ctx: Ctx,
  theme: string,
  x: number,
  y: number,
  capH: number,
  cx: number,
  cy: number,
  border: boolean,
  rnd: () => number,
): void {
  if (theme === 'safehouse') {
    // Apartment walls: plum wallpaper with a pale picture rail.
    ctx.fillStyle = '#3b2836';
    ctx.fillRect(x, y, TILE, capH);
    ctx.fillStyle = 'rgba(255, 200, 230, 0.05)';
    for (let i = 4; i < TILE; i += 10) ctx.fillRect(x + i, y, 2, capH);
    ctx.fillStyle = 'rgba(230, 210, 190, 0.35)';
    ctx.fillRect(x, y + capH - 6, TILE, 2);
    return;
  }
  if (theme === 'desert') {
    // Sandstone shelf with strata.
    ctx.fillStyle = '#8f5e38';
    ctx.fillRect(x, y, TILE, capH);
    ctx.strokeStyle = 'rgba(70, 40, 20, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 10; i < capH; i += 12) {
      ctx.beginPath();
      ctx.moveTo(x, y + i + Math.sin(cx + i) * 2);
      ctx.lineTo(x + TILE, y + i + Math.sin(cx + 1 + i) * 2);
      ctx.stroke();
    }
    noise(ctx, x, y, rnd, 10, 'rgba(255, 220, 170, 0.18)', 3);
  } else if (theme === 'motel') {
    // Pastel stucco with a terracotta roof edge.
    ctx.fillStyle = '#c9837a';
    ctx.fillRect(x, y, TILE, capH);
    noise(ctx, x, y, rnd, 30, 'rgba(255,255,255,0.08)', 2);
    ctx.fillStyle = '#7d3b2c';
    for (let i = 0; i < TILE; i += 8) ctx.fillRect(x + i, y, 6, 6);
  } else if (theme === 'street') {
    // Tar roof with gravel; brick on the border.
    ctx.fillStyle = border ? '#5b2f26' : '#2a2b2f';
    ctx.fillRect(x, y, TILE, capH);
    if (border) {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < capH; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x + TILE, y + i);
        ctx.stroke();
      }
    } else {
      noise(ctx, x, y, rnd, 30, 'rgba(255,255,255,0.06)', 2);
    }
  } else if (theme === 'megatower') {
    if (border) {
      // Floor-to-ceiling window onto the night city.
      const g = ctx.createLinearGradient(x, y, x, y + capH);
      g.addColorStop(0, '#0a1630');
      g.addColorStop(1, '#141032');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, TILE, capH);
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = ['#ffd27a', '#5ef1ff', '#ff5fa2', '#e9f6ff'][Math.floor(rnd() * 4)];
        ctx.globalAlpha = 0.5 + rnd() * 0.5;
        ctx.fillRect(x + rnd() * TILE, y + rnd() * capH, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(160, 200, 255, 0.25)';
      ctx.fillRect(x, y + 1, TILE, 2);
    } else {
      ctx.fillStyle = '#1b2533';
      ctx.fillRect(x, y, TILE, capH);
      ctx.strokeStyle = 'rgba(120, 160, 210, 0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4.5, y + 4.5, TILE - 9, capH - 9);
    }
  }
  void cy;
}

/* ------------------------------------------------------------------ */
/* safehouse stations                                                  */
/* ------------------------------------------------------------------ */

/**
 * Safehouse stations as physical objects, drawn centred on the origin
 * (the caller translates to the station tile centre). Each keeps a small
 * coloured label so the room still reads as a menu at a glance.
 */
export function paintStation(ctx: Ctx, kind: string, color: string): void {
  const shadow = () => {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(-26, -22, 56, 50, 6);
    ctx.fill();
  };
  shadow();
  switch (kind) {
    case 'contracts': {
      // Corkboard: pinned photos and red string.
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(-28, -26, 56, 44);
      ctx.fillStyle = '#a77a4c';
      ctx.fillRect(-25, -23, 50, 38);
      const pins = [[-16, -14], [6, -16], [-6, 4], [14, 2]];
      ctx.strokeStyle = '#d4283b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      pins.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      for (const [x, y] of pins) {
        ctx.fillStyle = '#f2eadb';
        ctx.fillRect(x - 6, y - 5, 12, 10);
        ctx.fillStyle = '#d4283b';
        ctx.beginPath();
        ctx.arc(x, y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'operator': {
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(-28, -20, 56, 38);
      ctx.fillStyle = '#3d4a3a';
      ctx.fillRect(-22, -16, 28, 18);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#c9b27a';
        ctx.beginPath();
        ctx.arc(-15 + i * 9, -7, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.fillRect(10, -14, 12, 8);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 4);
      ctx.lineTo(18, 12);
      ctx.stroke();
      break;
    }
    case 'archive': {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#5c6470';
        ctx.fillRect(-27 + i * 18, -24, 16, 42);
        ctx.fillStyle = '#3b414a';
        for (let d = 0; d < 3; d++) ctx.fillRect(-25 + i * 18, -20 + d * 13, 12, 10);
        ctx.fillStyle = '#c9ced8';
        for (let d = 0; d < 3; d++) ctx.fillRect(-21 + i * 18, -16 + d * 13, 4, 2);
      }
      break;
    }
    case 'fabricator': {
      ctx.fillStyle = '#23272f';
      ctx.fillRect(-26, -24, 52, 44);
      ctx.strokeStyle = '#6b7380';
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -20, 44, 36);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-18, 4, 36, 8);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(-4, -10, 8, 8);
      break;
    }
    case 'workbench': {
      ctx.fillStyle = '#7a4a2a';
      ctx.fillRect(-29, -10, 58, 28);
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(-29, -26, 58, 16);
      ctx.fillStyle = '#b9bfc8';
      ctx.fillRect(-22, -22, 14, 3);
      ctx.fillRect(-4, -23, 3, 10);
      ctx.fillRect(8, -21, 12, 2);
      ctx.fillStyle = '#1b1d22';
      ctx.fillRect(-14, -2, 26, 7);
      ctx.fillRect(6, 4, 5, 7);
      break;
    }
    case 'clinic': {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -2, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#e6e2d8';
      ctx.beginPath();
      ctx.roundRect(-10, -22, 20, 42, 8);
      ctx.fill();
      ctx.fillStyle = '#b8b2a5';
      ctx.fillRect(-10, -4, 20, 3);
      break;
    }
    case 'sanctuary': {
      ctx.fillStyle = '#3a2440';
      ctx.fillRect(-24, -18, 48, 34);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -4, 12, Math.PI, 0);
      ctx.stroke();
      for (const x of [-16, 16, -8, 8]) {
        ctx.fillStyle = '#f2eadb';
        ctx.fillRect(x - 2, 4, 4, 9);
        ctx.fillStyle = '#ffc46b';
        ctx.beginPath();
        ctx.arc(x, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'market': {
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#e8e1d2' : '#c4283f';
        ctx.fillRect(-28 + i * 9.5, -26, 9.5, 12);
      }
      ctx.fillStyle = '#a67b45';
      ctx.fillRect(-24, -10, 22, 22);
      ctx.fillRect(2, -6, 20, 18);
      ctx.strokeStyle = 'rgba(60,35,15,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-24, -10, 22, 22);
      ctx.strokeRect(2, -6, 20, 18);
      break;
    }
    case 'supplies': {
      ctx.fillStyle = '#5d6b72';
      ctx.fillRect(-20, -26, 40, 46);
      ctx.strokeStyle = '#2d3538';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(0, 20);
      ctx.stroke();
      ctx.fillStyle = '#f2eadb';
      ctx.fillRect(-7, -12, 14, 14);
      ctx.fillStyle = '#d4283b';
      ctx.fillRect(-2, -10, 4, 10);
      ctx.fillRect(-5, -7, 10, 4);
      break;
    }
    case 'deploy': {
      // Garage roll-up door with hazard stripes and a cyan status strip.
      ctx.fillStyle = '#3a3f47';
      ctx.fillRect(-30, -26, 60, 46);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      for (let y = -20; y < 18; y += 6) {
        ctx.beginPath();
        ctx.moveTo(-28, y);
        ctx.lineTo(28, y);
        ctx.stroke();
      }
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#1b1d22' : '#e8c547';
        ctx.fillRect(-30 + i * 10, 14, 10, 6);
      }
      ctx.fillStyle = color;
      ctx.fillRect(-30, -28, 60, 3);
      break;
    }
    default: {
      ctx.fillStyle = '#08101a';
      ctx.fillRect(-26, -24, 52, 40);
    }
  }
}
