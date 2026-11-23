import * as THREE from 'three';
import { Level, TILE, isWall } from '../game/map';
import { districtFor } from '../game/districts';
import { GUN_IDS, WeaponId } from '../game/weapons';
import { LootKind } from '../game/economy';
import { mulberry32 } from '../core/math';

const CYAN = '#5ef1ff';
const MAGENTA = '#ff2f8e';
const VIOLET = '#8b6bff';
const AMBER = '#ffc46b';
/** Pixel height of the baked south-facing wall face (fake 3/4 extrusion). */
const WALL_FACE = 18;

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function texture(c: HTMLCanvasElement, mip = false): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

function drawOperative(
  ctx: CanvasRenderingContext2D,
  palette: { coat: string; coatDark: string; trim: string; hair: string; skin: string; accent: string },
  variant: number,
  frame = 0,
  style: 'noir' | 'corp' | 'street' = 'corp',
): void {
  ctx.save();
  // Top-down walk sway: the frame shifts the whole silhouette so the
  // feet/coat appear to alternate without needing a second body rig.
  const phase = ((frame % 4) + 4) % 4;
  const sway = [0, 2.6, 0, -2.6][phase];
  const lift = [0, -1, 0, 1][phase];
  ctx.translate(sway, lift);

  if (style === 'noir') {
    // Trench coat skirt flaring behind the walk; sways opposite the step.
    const flare = [0, 3, 0, -3][phase];
    ctx.fillStyle = palette.coatDark;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(52, 40);
    ctx.quadraticCurveTo(22, 46 + flare, 18, 64 + flare);
    ctx.quadraticCurveTo(22, 82 + flare, 52, 88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = palette.trim;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(24, 52 + flare);
    ctx.quadraticCurveTo(20, 64 + flare, 24, 76 + flare);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // coat tail / back plate
  ctx.fillStyle = palette.coatDark;
  ctx.strokeStyle = palette.trim;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(54, 64, 20, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // shoulders
  for (const y of [44, 84]) {
    ctx.fillStyle = palette.coat;
    ctx.beginPath();
    ctx.arc(58, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // arms toward +X
  for (const y of [50, 78]) {
    ctx.fillStyle = palette.coat;
    ctx.strokeStyle = palette.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(64, y - 6, 27, 12, 6);
    ctx.fill();
    ctx.stroke();
    // glove
    ctx.fillStyle = '#11151d';
    ctx.beginPath();
    ctx.arc(93, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // torso
  ctx.fillStyle = palette.coat;
  ctx.strokeStyle = palette.trim;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(57, 64, 19, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // chest strap
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(46, 48);
  ctx.lineTo(69, 82);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // head
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(68, 64, 13.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // hair (back two thirds)
  ctx.fillStyle = palette.hair;
  ctx.beginPath();
  ctx.arc(66, 64, 13.8, Math.PI * 0.38, Math.PI * 1.62);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // visor / eye glint
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(73, 64, 8.5, -0.85, 0.85);
  ctx.stroke();

  if (style === 'noir') {
    // Wide-brim hat: the operative's silhouette from above. Solid volume,
    // lit from the upper left, so it reads as a hat and not a reticle.
    ctx.fillStyle = '#0d1118';
    ctx.strokeStyle = 'rgba(94, 241, 255, 0.3)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(67, 64, 19, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#04060a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(66, 64, 11.5, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    const crown = ctx.createRadialGradient(62, 59, 1, 66, 64, 12);
    crown.addColorStop(0, '#3a4658');
    crown.addColorStop(1, '#161c27');
    ctx.fillStyle = crown;
    ctx.beginPath();
    ctx.ellipse(66, 64, 10.5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 64);
    ctx.lineTo(72, 64);
    ctx.stroke();
  } else if (style === 'corp') {
    // Rounded corp helmet with a lit visor slit.
    ctx.fillStyle = '#20242e';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(66, 64, 14.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(67, 64, 10, -0.7, 0.7);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(62, 59, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Street hood pulled up, a crest of dyed hair showing.
    ctx.fillStyle = palette.coatDark;
    ctx.beginPath();
    ctx.arc(64, 64, 15, Math.PI * 0.45, Math.PI * 1.55);
    ctx.fill();
    ctx.fillStyle = palette.accent;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(56, 61, 16, 5);
    ctx.globalAlpha = 1;
  }

  // small back vents
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 3; i++) {
    const yy = 57 + i * 7;
    ctx.fillRect(38 + variant * 2, yy, 9, 2);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

/**
 * Bystander silhouettes. Deliberately unlike combatants: no neon trim ring,
 * no gloves out front. Looks 0/1 carry umbrellas (dark canopy, lit clear
 * canopy), look 2 is hooded with arms tucked in.
 */
function drawCivilian(ctx: CanvasRenderingContext2D, look: number, frame = 0): void {
  ctx.save();
  const phase = ((frame % 4) + 4) % 4;
  ctx.translate([0, 1.6, 0, -1.6][phase], [0, -0.6, 0, 0.6][phase]);
  // body underneath (mostly hidden by the canopy)
  ctx.fillStyle = '#1b1f27';
  ctx.beginPath();
  ctx.ellipse(56, 64, 15, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  if (look === 2) {
    // hooded walker, hands in pockets
    ctx.fillStyle = '#3a3f49';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(57, 64, 17, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4b515c';
    ctx.beginPath();
    ctx.arc(64, 64, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.arc(70, 64, 6, -1.1, 1.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(214, 186, 150, 0.55)';
    ctx.fillRect(48, 58, 3, 12);
  } else {
    const clear = look === 1;
    const r = 30;
    ctx.translate(60, 64);
    ctx.fillStyle = clear ? 'rgba(170, 220, 235, 0.22)' : '#22262e';
    ctx.strokeStyle = clear ? 'rgba(200, 245, 255, 0.75)' : 'rgba(150, 160, 175, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r - 3;
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = clear ? 'rgba(200, 245, 255, 0.4)' : 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i += 2) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
    }
    // LED shaft tip on the lit umbrella; plain ferrule otherwise.
    ctx.fillStyle = clear ? '#bff8ff' : '#6b7280';
    ctx.beginPath();
    ctx.arc(0, 0, clear ? 3.2 : 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCorpse(
  ctx: CanvasRenderingContext2D,
  palette: { coat: string; coatDark: string; trim: string; hair: string; skin: string },
): void {
  // blood pool
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 54);
  g.addColorStop(0, 'rgba(120, 6, 22, 0.9)');
  g.addColorStop(0.55, 'rgba(80, 4, 16, 0.65)');
  g.addColorStop(1, 'rgba(40, 0, 8, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(64, 64, 56, 40, 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(0.65);
  ctx.fillStyle = palette.coatDark;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // limbs
  ctx.strokeStyle = palette.coat;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-6, 8);
  ctx.lineTo(-30, 26);
  ctx.moveTo(10, 6);
  ctx.lineTo(30, 22);
  ctx.moveTo(-12, -8);
  ctx.lineTo(-26, -24);
  ctx.stroke();

  // head
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(30, -6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.hair;
  ctx.beginPath();
  ctx.arc(28, -6, 10, Math.PI * 0.6, Math.PI * 1.6);
  ctx.fill();
  ctx.restore();

  // splatter
  const rnd = mulberry32(1337);
  ctx.fillStyle = 'rgba(130, 8, 24, 0.75)';
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 26 + rnd() * 34;
    ctx.beginPath();
    ctx.ellipse(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1.5 + rnd() * 4, 1 + rnd() * 3, a, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWeapon(ctx: CanvasRenderingContext2D, id: WeaponId): void {
  if (id === 'pistol') {
    ctx.fillStyle = '#3a4c63';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(18, 16, 54, 12, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#22303f';
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.5)';
    ctx.beginPath();
    ctx.roundRect(30, 28, 12, 18, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CYAN;
    ctx.fillRect(64, 18, 6, 3);
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(22, 19, 9, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(26, 18);
    ctx.lineTo(64, 18);
    ctx.stroke();
  } else if (id === 'shotgun') {
    ctx.fillStyle = '#3c4e65';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(8, 17, 80, 10, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4a3526';
    ctx.strokeStyle = 'rgba(255, 170, 120, 0.65)';
    ctx.beginPath();
    ctx.roundRect(4, 26, 22, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#31445a';
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.6)';
    ctx.beginPath();
    ctx.roundRect(38, 27, 24, 10, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(42, 22, 18, 2);
    ctx.fillStyle = CYAN;
    ctx.fillRect(82, 18, 5, 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, 19);
    ctx.lineTo(80, 19);
    ctx.stroke();
  } else if (id === 'bat') {
    // bat
    ctx.strokeStyle = '#0a0e15';
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, 27);
    ctx.lineTo(82, 27);
    ctx.stroke();
    ctx.strokeStyle = '#aebbd0';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(20, 27);
    ctx.lineTo(82, 27);
    ctx.stroke();
    ctx.strokeStyle = MAGENTA;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(10, 27);
    ctx.lineTo(26, 27);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(34, 24);
    ctx.lineTo(76, 24);
    ctx.stroke();
  } else if (id === 'smg') {
    ctx.fillStyle = '#33475a';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(16, 17, 54, 12, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1d2a36';
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.5)';
    ctx.beginPath();
    ctx.roundRect(4, 18, 14, 9, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(34, 29, 11, 16, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26343f';
    ctx.fillRect(70, 20, 20, 5);
    ctx.fillStyle = CYAN;
    ctx.fillRect(86, 21, 5, 3);
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(21, 19, 11, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 18);
    ctx.lineTo(70, 18);
    ctx.stroke();
  } else if (id === 'rifle') {
    ctx.fillStyle = '#2f4b55';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(6, 19, 78, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a2b36';
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.6)';
    ctx.beginPath();
    ctx.roundRect(0, 17, 12, 12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26343f';
    ctx.fillRect(84, 21, 11, 4);
    ctx.fillStyle = CYAN;
    ctx.fillRect(90, 22, 5, 2);
    ctx.fillStyle = '#1a2b36';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.7)';
    ctx.beginPath();
    ctx.roundRect(30, 8, 28, 7, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#22303f';
    ctx.beginPath();
    ctx.roundRect(44, 27, 8, 13, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(18, 21, 20, 2);
    ctx.fillStyle = CYAN;
    ctx.fillRect(36, 11, 8, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 20);
    ctx.lineTo(38, 20);
    ctx.stroke();
  } else if (id === 'ak') {
    ctx.fillStyle = '#4a3a2e';
    ctx.strokeStyle = 'rgba(255, 190, 120, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(14, 18, 64, 9, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6b4a32';
    ctx.strokeStyle = 'rgba(255, 196, 107, 0.8)';
    ctx.beginPath();
    ctx.roundRect(2, 16, 20, 13, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26343f';
    ctx.fillRect(78, 21, 14, 3);
    ctx.fillStyle = CYAN;
    ctx.fillRect(88, 21, 5, 2);
    ctx.fillStyle = '#3a2a1e';
    ctx.strokeStyle = 'rgba(255, 190, 120, 0.65)';
    ctx.beginPath();
    ctx.roundRect(30, 27, 13, 18, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#22303f';
    ctx.beginPath();
    ctx.roundRect(48, 15, 26, 4, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 196, 107, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(23, 20);
    ctx.lineTo(62, 20);
    ctx.stroke();
    ctx.fillStyle = CYAN;
    ctx.fillRect(34, 20, 8, 2);
  } else if (id === 'revolver') {
    ctx.fillStyle = '#3b4257';
    ctx.strokeStyle = 'rgba(255, 196, 107, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(22, 17, 62, 11, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#222938';
    ctx.strokeStyle = AMBER;
    ctx.beginPath();
    ctx.arc(38, 23, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = AMBER;
    ctx.fillRect(34, 21, 3, 4);
    ctx.fillRect(40, 21, 3, 4);
    ctx.fillStyle = '#4a3526';
    ctx.beginPath();
    ctx.roundRect(4, 25, 22, 13, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 196, 107, 0.55)';
    ctx.stroke();
    ctx.fillStyle = CYAN;
    ctx.fillRect(78, 19, 6, 3);
  } else if (id === 'carbine' || id === 'needler') {
    const accent = id === 'needler' ? VIOLET : CYAN;
    ctx.fillStyle = '#2f4558';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(14, 17, 66, 11, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a2533';
    ctx.beginPath();
    ctx.roundRect(2, 18, 16, 10, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26343f';
    ctx.beginPath();
    ctx.roundRect(32, 27, 10, 15, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26343f';
    ctx.fillRect(78, 20, 14, 5);
    ctx.fillStyle = accent;
    ctx.fillRect(86, 21, 6, 3);
    if (id === 'needler') {
      ctx.fillStyle = accent;
      for (let i = 0; i < 3; i++) ctx.fillRect(56 + i * 7, 14, 4, 4);
    }
    ctx.fillStyle = accent;
    ctx.fillRect(20, 19, 12, 2);
  } else if (id === 'dmr') {
    ctx.fillStyle = '#2f4b55';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 19, 84, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a2b36';
    ctx.beginPath();
    ctx.roundRect(0, 17, 12, 12, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26343f';
    ctx.fillRect(88, 21, 8, 4);
    ctx.fillStyle = CYAN;
    ctx.fillRect(92, 22, 4, 2);
    ctx.fillStyle = '#1a2b36';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.75)';
    ctx.beginPath();
    ctx.roundRect(32, 6, 34, 9, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CYAN;
    ctx.fillRect(43, 9, 12, 3);
    ctx.fillStyle = '#22303f';
    ctx.beginPath();
    ctx.roundRect(42, 27, 8, 13, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(14, 21, 16, 2);
  } else if (id === 'plasma') {
    ctx.fillStyle = '#2b3152';
    ctx.strokeStyle = 'rgba(179, 140, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(12, 13, 68, 18, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1d31';
    ctx.beginPath();
    ctx.roundRect(2, 18, 16, 12, 4);
    ctx.fill();
    ctx.stroke();
    const glow = ctx.createRadialGradient(82, 22, 1, 82, 22, 13);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.35, VIOLET);
    glow.addColorStop(1, 'rgba(139, 107, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(82, 22, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(179, 140, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(44, 22, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#26343f';
    ctx.beginPath();
    ctx.roundRect(34, 30, 11, 13, 2);
    ctx.fill();
    ctx.stroke();
  } else if (id === 'railgun') {
    ctx.fillStyle = '#26364a';
    ctx.strokeStyle = 'rgba(94, 241, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(6, 16, 82, 12, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111823';
    ctx.fillRect(20, 19, 64, 6);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(24, 18);
    ctx.lineTo(86, 18);
    ctx.moveTo(24, 26);
    ctx.lineTo(86, 26);
    ctx.stroke();
    ctx.fillStyle = CYAN;
    ctx.fillRect(66, 20, 18, 4);
    ctx.fillStyle = '#1a2533';
    ctx.beginPath();
    ctx.roundRect(2, 18, 14, 10, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#22303f';
    ctx.beginPath();
    ctx.roundRect(34, 27, 10, 14, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(12, 21, 14, 2);
  } else {
    // lmg
    ctx.fillStyle = '#33475a';
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(8, 14, 78, 15, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#22303f';
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.55)';
    ctx.beginPath();
    ctx.roundRect(26, 29, 28, 15, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#26343f';
    ctx.fillRect(84, 20, 11, 5);
    ctx.fillStyle = CYAN;
    ctx.fillRect(90, 21, 5, 3);
    ctx.fillStyle = '#1a2b36';
    ctx.beginPath();
    ctx.roundRect(14, 26, 13, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 28);
    ctx.lineTo(52, 44);
    ctx.moveTo(66, 28);
    ctx.lineTo(70, 44);
    ctx.stroke();
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(20, 16, 18, 2);
    ctx.fillStyle = AMBER;
    ctx.fillRect(42, 32, 6, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 22);
    ctx.lineTo(80, 22);
    ctx.stroke();
  }
}

export class TextureBank {
  readonly player: THREE.Texture;
  readonly playerWalk: THREE.Texture[];
  readonly playerCorpse: THREE.Texture;
  readonly enemy: THREE.Texture[];
  readonly enemyWalk: THREE.Texture[][];
  readonly enemyCorpse: THREE.Texture[];
  /** Bystanders: [look][walkFrame] and one corpse per look. */
  readonly civilianWalk: THREE.Texture[][];
  readonly civilianCorpse: THREE.Texture[];
  readonly weapons = new Map<WeaponId, THREE.Texture>();
  readonly flash: THREE.Texture;
  readonly slash: THREE.Texture;
  readonly alert: THREE.Texture;
  readonly exit: THREE.Texture;
  readonly shadow: THREE.Texture;
  readonly dot: THREE.Texture;
  readonly bullet: THREE.Texture;
  readonly blood: THREE.Texture[];
  readonly door: THREE.Texture;
  readonly loot: Record<LootKind, THREE.Texture>;
  readonly target: THREE.Texture;
  readonly intent: THREE.Texture;
  readonly shield: THREE.Texture;
  readonly smoke: THREE.Texture;
  readonly barrel: THREE.Texture;
  readonly glass: THREE.Texture;
  readonly steam: THREE.Texture;
  readonly grate: THREE.Texture;
  readonly holo: THREE.Texture[];
  private readonly mapCache = new Map<string, THREE.Texture>();

  constructor() {
    this.playerWalk = [0, 1, 2, 3].map((f) => texture(this.buildBody('player', 0, f), true));
    this.player = this.playerWalk[0];
    this.playerCorpse = this.buildCorpseTex('player');
    this.enemyWalk = [0, 1].map((v) =>
      [0, 1, 2, 3].map((f) => texture(this.buildBody('enemy', v, f), true)),
    );
    this.enemy = [this.enemyWalk[0][0], this.enemyWalk[1][0]];
    this.enemyCorpse = [this.buildCorpseTex('enemy', 0), this.buildCorpseTex('enemy', 1)];
    this.civilianWalk = [0, 1, 2].map((look) =>
      [0, 1, 2, 3].map((f) => {
        const c = canvas(128, 128);
        drawCivilian(c.getContext('2d')!, look, f);
        return texture(c, true);
      }),
    );
    this.civilianCorpse = [0, 1, 2].map((look) => {
      const c = canvas(128, 128);
      const ctx = c.getContext('2d')!;
      drawCorpse(ctx, { coat: '#3a3f49', coatDark: '#1b1f27', trim: '#4b515c', hair: '#15171c', skin: '#c79a80' });
      if (look !== 2) {
        // dropped umbrella beside the body
        ctx.save();
        ctx.translate(98, 30);
        ctx.rotate(0.6);
        ctx.scale(0.55, 0.35);
        drawCivilian(ctx, look, 0);
        ctx.restore();
      }
      return texture(c);
    });

    for (const id of [...GUN_IDS, 'bat' as const]) {
      const c = canvas(96, 48);
      const ctx = c.getContext('2d')!;
      drawWeapon(ctx, id);
      this.weapons.set(id, texture(c));
    }

    this.flash = texture(this.buildFlash());
    this.slash = texture(this.buildSlash());
    this.alert = texture(this.buildAlert());
    this.exit = texture(this.buildExit());
    this.shadow = texture(this.buildShadow());
    this.dot = texture(this.buildDot());
    this.bullet = texture(this.buildBullet());
    this.door = texture(this.buildDoor());
    this.loot = {
      shard: texture(this.buildLootIcon('shard')),
      chip: texture(this.buildLootIcon('chip')),
      optic: texture(this.buildLootIcon('optic')),
    };
    this.target = texture(this.buildTarget());
    this.intent = texture(this.buildIntent());
    this.shield = texture(this.buildShield());
    this.smoke = texture(this.buildSmoke());
    this.barrel = texture(this.buildBarrel());
    this.glass = texture(this.buildGlass());
    this.steam = texture(this.buildSteam());
    this.grate = texture(this.buildGrate());
    this.holo = [
      this.buildHolo('HELIX', CYAN),
      this.buildHolo('NIGHT MARKET', '#7dffcf'),
      this.buildHolo('CHROME TEETH', MAGENTA),
      this.buildHolo('LOW ORBIT', AMBER),
      this.buildHolo('SUBLEVEL', VIOLET),
    ].map((canvas) => texture(canvas));
    this.blood = [0, 1, 2].map((i) => texture(this.buildBlood(i)));
  }

  map(level: Level): THREE.Texture {
    let cached = this.mapCache.get(level.id);
    if (!cached) {
      cached = texture(this.bakeMap(level), true);
      cached.anisotropy = 8;
      this.mapCache.set(level.id, cached);
    }
    return cached;
  }

  private buildBody(team: 'player' | 'enemy', variant = 0, frame = 0): HTMLCanvasElement {
    const c = canvas(128, 128);
    const ctx = c.getContext('2d')!;
    if (team === 'player') {
      drawOperative(
        ctx,
        {
          coat: '#16303d',
          coatDark: '#0c1b26',
          trim: CYAN,
          hair: '#10141c',
          skin: '#b58a70',
          accent: CYAN,
        },
        0,
        frame,
        'noir',
      );
    } else {
      drawOperative(
        ctx,
        variant === 0
          ? {
              coat: '#361523',
              coatDark: '#1b0a12',
              trim: MAGENTA,
              hair: '#1a0a10',
              skin: '#b07f68',
              accent: MAGENTA,
            }
          : {
              coat: '#241a3d',
              coatDark: '#120d20',
              trim: VIOLET,
              hair: '#120d1c',
              skin: '#b88b73',
              accent: AMBER,
            },
        variant,
        frame,
        variant === 0 ? 'corp' : 'street',
      );
    }
    return c;
  }

  private buildGlass(): HTMLCanvasElement {
    const c = canvas(64, 64);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(94, 241, 255, 0.08)';
    ctx.fillRect(2, 2, 60, 60);
    ctx.strokeStyle = 'rgba(94, 241, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, 58, 58);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (let i = 8; i < 64; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 4);
      ctx.lineTo(i - 18, 60);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255, 47, 142, 0.55)';
    ctx.beginPath();
    ctx.moveTo(6, 48);
    ctx.lineTo(28, 18);
    ctx.lineTo(38, 34);
    ctx.lineTo(58, 8);
    ctx.stroke();
    return c;
  }

  private buildSteam(): HTMLCanvasElement {
    const c = canvas(128, 128);
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(190, 245, 255, 0.55)');
    g.addColorStop(0.45, 'rgba(120, 210, 230, 0.22)');
    g.addColorStop(1, 'rgba(80, 160, 190, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#bff8ff' : '#6fd7e8';
      ctx.beginPath();
      ctx.arc(35 + i * 9, 42 + (i % 3) * 14, 10 + i, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  private buildGrate(): HTMLCanvasElement {
    const c = canvas(64, 64);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#0a1118';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#385061';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 56, 56);
    ctx.strokeStyle = '#1b2a36';
    ctx.lineWidth = 4;
    for (let i = 12; i < 60; i += 9) {
      ctx.beginPath();
      ctx.moveTo(i, 6);
      ctx.lineTo(i, 58);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(94, 241, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 12; i < 60; i += 9) {
      ctx.beginPath();
      ctx.moveTo(i - 1, 6);
      ctx.lineTo(i - 1, 58);
      ctx.stroke();
    }
    return c;
  }

  private buildBarrel(): HTMLCanvasElement {
    const c = canvas(96, 96);
    const ctx = c.getContext('2d')!;
    ctx.translate(48, 48);

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(4, 5, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a1912';
    ctx.strokeStyle = '#ff8a3d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6e2a16';
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(-0.7);
    ctx.fillStyle = AMBER;
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 13 - 3, -18, 5, 36);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,196,107,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff3b4e';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  private buildCorpseTex(team: 'player' | 'enemy', variant = 0): THREE.Texture {
    const c = canvas(128, 128);
    const ctx = c.getContext('2d')!;
    drawCorpse(
      ctx,
      team === 'player'
        ? { coat: '#16303d', coatDark: '#0c1b26', trim: CYAN, hair: '#10141c', skin: '#d5a98d' }
        : variant === 0
          ? { coat: '#361523', coatDark: '#1b0a12', trim: MAGENTA, hair: '#1a0a10', skin: '#c9947f' }
          : { coat: '#241a3d', coatDark: '#120d20', trim: VIOLET, hair: '#120d1c', skin: '#cfa189' },
    );
    return texture(c);
  }

  private buildSlash(): HTMLCanvasElement {
    const c = canvas(192, 192);
    const ctx = c.getContext('2d')!;
    ctx.translate(96, 96);
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = 'rgba(120, 250, 255, 0.75)';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.arc(0, 0, 68, -0.95, 0.95);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 68, -0.8, 0.8);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 47, 142, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 80, -0.65, 0.65);
    ctx.stroke();
    return c;
  }

  private buildFlash(): HTMLCanvasElement {
    const c = canvas(96, 96);
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(48, 48, 2, 48, 48, 46);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(180,250,255,0.95)');
    g.addColorStop(0.55, 'rgba(90,220,255,0.45)');
    g.addColorStop(1, 'rgba(0,160,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 44 : 12;
      const x = 48 + Math.cos(a) * r;
      const y = 48 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    return c;
  }

  private buildAlert(): HTMLCanvasElement {
    const c = canvas(64, 64);
    const ctx = c.getContext('2d')!;
    ctx.font = 'bold 56px Bahnschrift, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = MAGENTA;
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffd9ea';
    ctx.fillText('!', 32, 34);
    ctx.fillStyle = MAGENTA;
    ctx.globalAlpha = 0.6;
    ctx.fillText('!', 32, 34);
    return c;
  }

  private buildHolo(label: string, color: string): HTMLCanvasElement {
    const c = canvas(512, 128);
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 128);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 504, 120);
    ctx.globalAlpha = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = color;
    ctx.font = '700 58px Bahnschrift, "DIN Alternate", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 256, 60);
    ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.55;
    ctx.font = '16px monospace';
    ctx.fillText('// NIGHT CITY AD NETWORK', 256, 102);
    ctx.globalAlpha = 0.16;
    for (let y = 8; y < 120; y += 5) ctx.fillRect(8, y, 496, 1);
    return c;
  }

  private buildExit(): HTMLCanvasElement {
    const c = canvas(192, 192);
    const ctx = c.getContext('2d')!;
    ctx.translate(96, 96);
    ctx.strokeStyle = CYAN;
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, 63, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(28, -12);
      ctx.lineTo(42, 0);
      ctx.lineTo(28, 12);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(94, 241, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    return c;
  }

  private buildShadow(): HTMLCanvasElement {
    const c = canvas(96, 48);
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(48, 24, 4, 48, 24, 46);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 48);
    return c;
  }

  private buildDot(): HTMLCanvasElement {
    const c = canvas(32, 32);
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return c;
  }

  private buildBullet(): HTMLCanvasElement {
    const c = canvas(64, 12);
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(94,241,255,0)');
    g.addColorStop(0.55, 'rgba(160,250,255,0.55)');
    g.addColorStop(0.92, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 3, 64, 6);
    return c;
  }

  private buildBlood(_seed: number): HTMLCanvasElement {
    const c = canvas(160, 160);
    const ctx = c.getContext('2d')!;
    const rnd = mulberry32(9000 + _seed * 1337);
    const cx = 80;
    const cy = 80;
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 30;
      const rx = 8 + rnd() * 26;
      const ry = 6 + rnd() * 20;
      ctx.fillStyle = `rgba(${90 + rnd() * 50}, ${2 + rnd() * 8}, ${10 + rnd() * 10}, ${0.45 + rnd() * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rx, ry, a, 0, Math.PI * 2);
      ctx.fill();
    }
    // droplets
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 34 + rnd() * 44;
      ctx.fillStyle = `rgba(120, 4, 18, ${0.3 + rnd() * 0.45})`;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1 + rnd() * 4, 1 + rnd() * 3, a, 0, Math.PI * 2);
      ctx.fill();
    }
    return c;
  }

  private buildIntent(): HTMLCanvasElement {
    const c = canvas(64, 64);
    const ctx = c.getContext('2d')!;
    ctx.translate(32, 32);
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-13, 12);
    ctx.lineTo(11, 0);
    ctx.lineTo(-13, -12);
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(-1, 12);
    ctx.lineTo(23, 0);
    ctx.lineTo(-1, -12);
    ctx.stroke();
    return c;
  }

  private buildTarget(): HTMLCanvasElement {
    const c = canvas(96, 96);
    const ctx = c.getContext('2d')!;
    ctx.translate(48, 48);
    ctx.shadowColor = AMBER;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(27, 0);
    ctx.lineTo(0, 30);
    ctx.lineTo(-27, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 245, 220, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(15, 0);
    ctx.lineTo(0, 17);
    ctx.lineTo(-15, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = AMBER;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 196, 107, 0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 34, Math.sin(a) * 34);
      ctx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44);
      ctx.stroke();
    }
    return c;
  }

  private buildShield(): HTMLCanvasElement {
    const c = canvas(64, 128);
    const ctx = c.getContext('2d')!;
    ctx.translate(32, 64);
    ctx.shadowColor = CYAN;
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(18, 32, 46, 0.92)';
    ctx.strokeStyle = CYAN;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-24, -56, 48, 112, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.5)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-18, i * 20);
      ctx.lineTo(18, i * 20);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(150, 240, 255, 0.9)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(17, i * 20, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255, 196, 107, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, -48);
    ctx.lineTo(-16, 48);
    ctx.stroke();
    return c;
  }

  private buildSmoke(): HTMLCanvasElement {
    const c = canvas(192, 192);
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(96, 96, 8, 96, 96, 92);
    g.addColorStop(0, 'rgba(210, 226, 244, 0.55)');
    g.addColorStop(0.45, 'rgba(170, 188, 210, 0.38)');
    g.addColorStop(1, 'rgba(120, 140, 165, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 192, 192);
    const rnd = mulberry32(2199);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 62;
      const rad = 18 + rnd() * 44;
      const px = 96 + Math.cos(a) * r;
      const py = 96 + Math.sin(a) * r;
      const bg = ctx.createRadialGradient(px, py, 2, px, py, rad);
      bg.addColorStop(0, `rgba(205, 220, 238, ${0.12 + rnd() * 0.18})`);
      bg.addColorStop(1, 'rgba(150, 170, 195, 0)');
      ctx.fillStyle = bg;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    return c;
  }

  private buildLootIcon(kind: LootKind): HTMLCanvasElement {
    const c = canvas(96, 96);
    const ctx = c.getContext('2d')!;
    ctx.translate(48, 48);
    ctx.lineJoin = 'round';

    if (kind === 'shard') {
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(94, 241, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(27, 0);
      ctx.lineTo(0, 32);
      ctx.lineTo(-27, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(200, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-15, i * 10);
        ctx.lineTo(15, i * 10);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(-3, -18, 6, 36);
    } else if (kind === 'chip') {
      ctx.shadowColor = AMBER;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 196, 107, 0.16)';
      ctx.beginPath();
      ctx.roundRect(-32, -22, 64, 44, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 210, 140, 0.9)';
      ctx.fillRect(-24, -14, 18, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 4; i++) ctx.fillRect(-24 + i * 13, 6, 8, 4);
      ctx.strokeStyle = 'rgba(255, 196, 107, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-32, 16);
      ctx.lineTo(32, 16);
      ctx.stroke();
    } else {
      ctx.shadowColor = MAGENTA;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = MAGENTA;
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(255, 47, 142, 0.14)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 220, 240, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 47, 142, 0.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 14);
        ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 22);
        ctx.stroke();
      }
    }
    return c;
  }

  private buildDoor(): HTMLCanvasElement {
    const c = canvas(96, 32);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#131a26';
    ctx.fillRect(0, 0, 96, 32);
    ctx.strokeStyle = '#2b3a50';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 94, 30);
    ctx.fillStyle = MAGENTA;
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(8 + i * 18, 6);
      ctx.lineTo(16 + i * 18, 6);
      ctx.lineTo(10 + i * 18, 26);
      ctx.lineTo(2 + i * 18, 26);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = CYAN;
    ctx.fillRect(44, 14, 8, 4);
    return c;
  }

  private bakeMap(level: Level): HTMLCanvasElement {
    const { w, h } = level;
    const c = canvas(w * TILE, h * TILE);
    const ctx = c.getContext('2d')!;
    const rnd = mulberry32(424242);
    const isHub = level.id === 'safehouse';
    const district = districtFor(level.id);
    const flip = (worldY: number): number => h * TILE - worldY;

    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, c.width, c.height);

    const floorColors = district.floor;
    const gridColor = district.grid;

    // floors
    for (let cy = 0; cy < h; cy++) {
      for (let cx = 0; cx < w; cx++) {
        if (isWall(level, cx, cy)) continue;
        const x = cx * TILE;
        const y = cy * TILE;
        // One coherent material per floor, with only a faint per-tile tint so
        // the ground reads as poured concrete/plating rather than a checkerboard.
        ctx.fillStyle = floorColors[0];
        ctx.fillRect(x, y, TILE, TILE);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = floorColors[Math.floor(rnd() * floorColors.length)];
        ctx.fillRect(x, y, TILE, TILE);
        ctx.globalAlpha = 1;

        // grid seams
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);

        // occasional tech panel
        // Kept faint: bright filled squares read as pickups/crates.
        if (rnd() < (isHub ? 0.05 : 0.08)) {
          const col = district.neon[Math.floor(rnd() * district.neon.length)];
          ctx.globalAlpha = 0.05;
          ctx.fillStyle = col;
          ctx.fillRect(x + 9, y + 9, TILE - 18, TILE - 18);
          ctx.globalAlpha = 0.2;
          ctx.strokeStyle = col;
          ctx.strokeRect(x + 9.5, y + 9.5, TILE - 19, TILE - 19);
          ctx.globalAlpha = 1;
        }

        // specks / scratches
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(180, 220, 255, ${0.02 + rnd() * 0.04})`;
          ctx.fillRect(x + rnd() * TILE, y + rnd() * TILE, 1 + rnd() * 2, 1);
        }
        if (rnd() < 0.07) {
          ctx.strokeStyle = 'rgba(94, 241, 255, 0.12)';
          ctx.beginPath();
          ctx.moveTo(x + 14, y + TILE * 0.5);
          ctx.lineTo(x + TILE - 14, y + TILE * 0.5);
          ctx.stroke();
        }
      }
    }

    const palette = district.neon;

    if (district.decals === 'puddles') {
      for (let i = 0; i < 18; i++) {
        const px = 40 + rnd() * (w * TILE - 80);
        const py = 40 + rnd() * (h * TILE - 80);
        const rx = 18 + rnd() * 56;
        ctx.fillStyle = 'rgba(10, 22, 34, 0.24)';
        ctx.beginPath();
        ctx.ellipse(px, py, rx, rx * 0.4, rnd(), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `${district.neon[i % district.neon.length]}55`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (district.decals === 'cables') {
      for (let i = 0; i < 8; i++) {
        const px = 20 + rnd() * (w * TILE - 40);
        const py = 20 + rnd() * (h * TILE - 40);
        ctx.strokeStyle = 'rgba(20, 28, 38, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.bezierCurveTo(px + 40, py + 22, px + 90, py - 14, px + 150, py + 8);
        ctx.stroke();
      }
    } else if (district.decals === 'hazards') {
      for (let i = 0; i < 16; i++) {
        const px = 20 + rnd() * (w * TILE - 40);
        const py = 20 + rnd() * (h * TILE - 40);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-0.65);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = AMBER;
        ctx.fillRect(0, 0, 28, 5);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    } else if (district.decals === 'circuits') {
      ctx.strokeStyle = `${district.neon[0]}22`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const px = 20 + rnd() * (w * TILE - 40);
        const py = 20 + rnd() * (h * TILE - 40);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 24 + rnd() * 60, py);
        ctx.lineTo(px + 24 + rnd() * 60, py + 18 + rnd() * 40);
        ctx.stroke();
        ctx.fillStyle = `${district.neon[i % district.neon.length]}66`;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    } else if (district.decals === 'stage') {
      for (let i = 0; i < 5; i++) {
        ctx.strokeStyle = `${district.neon[i % district.neon.length]}33`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.width / 2, c.height / 2, 60 + i * 34, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (const steam of level.steam) {
      const x = Math.floor(steam.x / TILE) * TILE;
      const y = flip(steam.y) - TILE;
      ctx.fillStyle = '#0a1118';
      ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
      ctx.strokeStyle = 'rgba(94, 241, 255, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 12; i < TILE - 8; i += 8) {
        ctx.beginPath();
        ctx.moveTo(x + i, y + 8);
        ctx.lineTo(x + i, y + TILE - 8);
        ctx.stroke();
      }
    }

    if (isHub) {
      ctx.save();
      ctx.translate(c.width / 2, c.height / 2);
      ctx.fillStyle = 'rgba(90, 22, 70, 0.16)';
      ctx.strokeStyle = 'rgba(255, 47, 142, 0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-5.2 * TILE, -2.2 * TILE, 10.4 * TILE, 4.4 * TILE, 22);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(94, 241, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE * 1.1, -2.2 * TILE + 8);
        ctx.lineTo(i * TILE * 1.1, 2.2 * TILE - 8);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ambient neon wash on the floor
    for (let i = 0; i < 7; i++) {
      const px = 80 + rnd() * (w * TILE - 160);
      const py = 80 + rnd() * (h * TILE - 160);
      const col = palette[Math.floor(rnd() * palette.length)];
      const rad = 220 + rnd() * 260;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, col);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.075;
      ctx.fillStyle = grad;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    ctx.globalAlpha = 1;

    // Low-frequency grime: large soft blotches break up the floor without
    // fighting the gameplay lights layered on top.
    for (let i = 0; i < Math.round((w * h) / 22); i++) {
      const px = rnd() * w * TILE;
      const py = rnd() * h * TILE;
      const rad = 60 + rnd() * 160;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
      grad.addColorStop(0, `rgba(0, 0, 0, ${0.1 + rnd() * 0.14})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }

    // Cast shadows: walls are tall, the key light sits up and to the left, so
    // every solid block throws a soft shadow down-right onto the floor.
    {
      const shadow = canvas(c.width, c.height);
      const sctx = shadow.getContext('2d')!;
      sctx.fillStyle = '#000';
      for (let cy = 0; cy < h; cy++) {
        for (let cx = 0; cx < w; cx++) {
          if (!isWall(level, cx, cy) || level.glass[cy * w + cx] === 1) continue;
          sctx.fillRect(cx * TILE + 14, cy * TILE + WALL_FACE + 10, TILE, TILE);
        }
      }
      // Walls themselves are painted over this, so only the spill shows.
      ctx.save();
      ctx.globalAlpha = 0.5;
      if ('filter' in ctx) ctx.filter = 'blur(7px)';
      ctx.drawImage(shadow, 0, 0);
      ctx.restore();
    }

    // contact shadows on floors next to walls
    for (let cy = 0; cy < h; cy++) {
      for (let cx = 0; cx < w; cx++) {
        if (isWall(level, cx, cy)) continue;
        const x = cx * TILE;
        const y = cy * TILE;
        const sides = [
          { wall: isWall(level, cx, cy - 1), grad: ctx.createLinearGradient(0, y, 0, y + 26) },
          { wall: isWall(level, cx, cy + 1), grad: ctx.createLinearGradient(0, y + TILE, 0, y + TILE - 26) },
          { wall: isWall(level, cx - 1, cy), grad: ctx.createLinearGradient(x, 0, x + 26, 0) },
          { wall: isWall(level, cx + 1, cy), grad: ctx.createLinearGradient(x + TILE, 0, x + TILE - 26, 0) },
        ];
        for (const sde of sides) {
          if (!sde.wall) continue;
          sde.grad.addColorStop(0, 'rgba(0,0,0,0.38)');
          sde.grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = sde.grad;
          if (sde === sides[0]) ctx.fillRect(x, y, TILE, 26);
          else if (sde === sides[1]) ctx.fillRect(x, y + TILE - 26, TILE, 26);
          else if (sde === sides[2]) ctx.fillRect(x, y, 26, TILE);
          else ctx.fillRect(x + TILE - 26, y, 26, TILE);
        }
      }
    }

    // wall bodies
    for (let cy = 0; cy < h; cy++) {
      for (let cx = 0; cx < w; cx++) {
        if (!isWall(level, cx, cy)) continue;
        if (level.glass[cy * w + cx] === 1) continue;
        const x = cx * TILE;
        const y = cy * TILE;
        // Roof cap: one continuous slab across neighbouring wall tiles (no
        // per-tile box outline), lit from the upper left.
        const wg = ctx.createLinearGradient(x, y, x + TILE * 0.6, y + TILE);
        wg.addColorStop(0, '#151d2a');
        wg.addColorStop(1, district.wall);
        ctx.fillStyle = wg;
        ctx.fillRect(x, y, TILE, TILE);
        // Sparse roof detail: vents/plates every few tiles.
        if (((cx * 7 + cy * 13) & 7) === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + 14, y + 12, 22, 14);
          ctx.strokeStyle = 'rgba(120, 150, 190, 0.16)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 14.5, y + 12.5, 21, 13);
        }
        // Bevel highlight on edges that face open floor (north/west catch light).
        ctx.fillStyle = 'rgba(160, 190, 230, 0.13)';
        if (!isWall(level, cx, cy - 1)) ctx.fillRect(x, y, TILE, 2);
        if (!isWall(level, cx - 1, cy)) ctx.fillRect(x, y, 2, TILE);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        if (!isWall(level, cx + 1, cy)) ctx.fillRect(x + TILE - 3, y, 3, TILE);

        // South face: the visible vertical side of the wall gives the block
        // height. Drawn inside the wall tile so collision stays honest.
        if (!isWall(level, cx, cy + 1)) {
          const fy = y + TILE - WALL_FACE;
          const fg = ctx.createLinearGradient(0, fy, 0, y + TILE);
          fg.addColorStop(0, '#0e141e');
          fg.addColorStop(1, '#04060a');
          ctx.fillStyle = fg;
          ctx.fillRect(x, fy, TILE, WALL_FACE);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x, fy, TILE, 1.5);
          ctx.strokeStyle = 'rgba(90, 120, 160, 0.13)';
          ctx.lineWidth = 1;
          for (let px = x + 8; px < x + TILE; px += 16) {
            ctx.beginPath();
            ctx.moveTo(px + 0.5, fy + 3);
            ctx.lineTo(px + 0.5, y + TILE - 3);
            ctx.stroke();
          }
        }
      }
    }

    // Rooftop dressing on wall caps (solid tiles only, so nothing walkable
    // ever looks blocked): AC units, pipe runs, signage boxes.
    const theme = district.theme;
    for (let cy = 0; cy < h; cy++) {
      for (let cx = 0; cx < w; cx++) {
        if (!isWall(level, cx, cy) || level.glass[cy * w + cx] === 1) continue;
        if (cx === 0 || cy === 0 || cx === w - 1 || cy === h - 1) continue;
        const roll = rnd();
        if (roll > (isHub ? 0.05 : 0.2)) continue;
        const x = cx * TILE;
        const y = cy * TILE;
        const capH = TILE - (isWall(level, cx, cy + 1) ? 0 : WALL_FACE);
        ctx.save();
        if (roll < 0.07) {
          // AC unit with fan
          ctx.fillStyle = '#1d2531';
          ctx.fillRect(x + 10, y + 8, 40, Math.min(32, capH - 12));
          ctx.strokeStyle = 'rgba(140, 170, 205, 0.28)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 10.5, y + 8.5, 39, Math.min(32, capH - 12) - 1);
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.beginPath();
          ctx.arc(x + 30, y + 8 + Math.min(32, capH - 12) / 2, 9, 0, Math.PI * 2);
          ctx.stroke();
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2 + rnd();
            const fx = x + 30;
            const fy = y + 8 + Math.min(32, capH - 12) / 2;
            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8);
            ctx.stroke();
          }
        } else if (roll < 0.13) {
          // pipe run
          ctx.strokeStyle = '#2a3442';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(x, y + 14);
          ctx.lineTo(x + TILE, y + 14);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(170, 200, 230, 0.18)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + 12.5);
          ctx.lineTo(x + TILE, y + 12.5);
          ctx.stroke();
        } else {
          // signage box: a lit panel with glyph bars in the district neon
          const col = palette[Math.floor(rnd() * palette.length)];
          const sw = theme === 'corporate' ? 34 : 26;
          ctx.fillStyle = '#0b0f16';
          ctx.fillRect(x + 14, y + 10, sw, 16);
          ctx.shadowColor = col;
          ctx.shadowBlur = 8;
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 14.5, y + 10.5, sw - 1, 15);
          ctx.shadowBlur = 0;
          ctx.fillStyle = col;
          ctx.globalAlpha = 0.75;
          for (let k = 0; k < 3; k++) ctx.fillRect(x + 18 + k * (sw / 3.4), y + 15, sw / 5, 6);
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
    }

    // Floor clutter hugging the walls: flat, low-contrast, never solid-looking.
    for (let cy = 1; cy < h - 1; cy++) {
      for (let cx = 1; cx < w - 1; cx++) {
        if (isWall(level, cx, cy)) continue;
        const north = isWall(level, cx, cy - 1);
        const west = isWall(level, cx - 1, cy);
        const east = isWall(level, cx + 1, cy);
        if (!north && !west && !east) continue;
        const roll = rnd();
        if (roll > (isHub ? 0.08 : 0.3)) continue;
        const x = cx * TILE;
        const y = cy * TILE;
        const ex = west ? x + 6 : east ? x + TILE - 20 : x + 10 + rnd() * 30;
        const ey = north ? y + 6 : y + 10 + rnd() * 30;
        ctx.save();
        if (roll < 0.1) {
          // scattered debris / cans
          for (let k = 0; k < 5; k++) {
            ctx.fillStyle = k % 2 ? 'rgba(120, 130, 145, 0.35)' : 'rgba(30, 36, 46, 0.8)';
            ctx.fillRect(ex + rnd() * 18, ey + rnd() * 18, 2 + rnd() * 4, 2 + rnd() * 3);
          }
        } else if (roll < 0.18) {
          // flattened cardboard / paper
          ctx.translate(ex + 8, ey + 8);
          ctx.rotate(rnd() * 1.4 - 0.7);
          ctx.fillStyle = theme === 'corporate' ? 'rgba(200, 210, 225, 0.12)' : 'rgba(150, 118, 80, 0.2)';
          ctx.fillRect(-9, -6, 18, 12);
        } else if (roll < 0.24) {
          // cable bundle along the wall
          ctx.strokeStyle = 'rgba(8, 10, 14, 0.85)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          if (north) {
            ctx.moveTo(x, y + 5);
            ctx.bezierCurveTo(x + 20, y + 11, x + 40, y + 2, x + TILE, y + 7);
          } else {
            const vx = west ? x + 5 : x + TILE - 5;
            ctx.moveTo(vx, y);
            ctx.bezierCurveTo(vx + 5, y + 20, vx - 4, y + 40, vx, y + TILE);
          }
          ctx.stroke();
        } else {
          // stencilled floor marking
          ctx.strokeStyle = theme === 'docks' || theme === 'transit' ? 'rgba(255, 196, 107, 0.16)' : 'rgba(94, 241, 255, 0.1)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 20, y + 40);
          ctx.lineTo(x + 32, y + 28);
          ctx.lineTo(x + 44, y + 40);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // neon edges (drawn after all wall bodies so shared corners look clean)
    for (let cy = 0; cy < h; cy++) {
      for (let cx = 0; cx < w; cx++) {
        if (!isWall(level, cx, cy)) continue;
        if (level.glass[cy * w + cx] === 1) continue;
        const x = cx * TILE;
        const y = cy * TILE;
        const neighbors: { side: string; nx: number; ny: number }[] = [
          { side: 'top', nx: cx, ny: cy - 1 },
          { side: 'bottom', nx: cx, ny: cy + 1 },
          { side: 'left', nx: cx - 1, ny: cy },
          { side: 'right', nx: cx + 1, ny: cy },
        ];
        for (const n of neighbors) {
          if (isWall(level, n.nx, n.ny)) continue;
          const bright = rnd() < 0.4;
          const col = bright ? palette[Math.floor(rnd() * palette.length)] : '#2d3d55';
          ctx.strokeStyle = col;
          ctx.lineWidth = bright ? 2.5 : 1.5;
          ctx.shadowColor = col;
          ctx.shadowBlur = bright ? 7 : 0;
          ctx.globalAlpha = bright ? 0.9 : 0.4;
          ctx.beginPath();
          if (n.side === 'top') {
            ctx.moveTo(x + 2, y + 1.5);
            ctx.lineTo(x + TILE - 2, y + 1.5);
          } else if (n.side === 'bottom') {
            ctx.moveTo(x + 2, y + TILE - 1.5);
            ctx.lineTo(x + TILE - 2, y + TILE - 1.5);
          } else if (n.side === 'left') {
            ctx.moveTo(x + 1.5, y + 2);
            ctx.lineTo(x + 1.5, y + TILE - 2);
          } else {
            ctx.moveTo(x + TILE - 1.5, y + 2);
            ctx.lineTo(x + TILE - 1.5, y + TILE - 2);
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }

    // safehouse stations
    const stationLabels: Record<string, string> = {
      contracts: 'CONTRACTS',
      workbench: 'WORKBENCH',
      clinic: 'CLINIC',
      market: 'MARKET',
      supplies: 'SUPPLIES',
      archive: 'ARCHIVE',
      fabricator: 'FABRICATOR',
      operator: 'OPERATOR',
      deploy: 'DEPLOY',
    };
    const stationColors: Record<string, string> = {
      contracts: CYAN,
      workbench: AMBER,
      clinic: MAGENTA,
      market: VIOLET,
      supplies: AMBER,
      archive: VIOLET,
      fabricator: AMBER,
      operator: CYAN,
      deploy: CYAN,
    };
    for (const station of level.stations) {
      const color = stationColors[station.kind] ?? CYAN;
      ctx.save();
      ctx.translate(station.x, flip(station.y));
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#08101a';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-26, -24, 52, 40, 6);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-20, -18, 40, 18, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-20, -5);
      ctx.lineTo(20, -5);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 7px Bahnschrift, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stationLabels[station.kind] ?? 'TERMINAL', 0, station.kind === 'deploy' ? -40 : 25);
      ctx.restore();
    }

    // door thresholds
    for (const d of level.doors) {
      const x = d.cx * TILE;
      const y = d.cy * TILE;
      ctx.strokeStyle = 'rgba(94, 241, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
    }

    // exit pad
    {
      const x = level.exit.x;
      const y = flip(level.exit.y);
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = CYAN;
      ctx.shadowColor = CYAN;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // spawn pad
    if (!isHub) {
      ctx.save();
      ctx.translate(level.spawn.x, flip(level.spawn.y));
      ctx.strokeStyle = 'rgba(94, 241, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
      ctx.restore();
    }

    // floor stencils
    if (!isHub) {
      const sy = flip(level.spawn.y);
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = CYAN;
      ctx.font =
        level.name.length > 12
          ? 'bold 42px Bahnschrift, sans-serif'
          : 'bold 54px Bahnschrift, sans-serif';
      ctx.fillText(level.name, level.spawn.x + 40, sy - 52);
      ctx.font = 'bold 26px Bahnschrift, sans-serif';
      ctx.fillText('NO FUTURE', level.spawn.x + 42, sy - 22);
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = MAGENTA;
      ctx.font = 'bold 96px Bahnschrift, sans-serif';
      const districtTag =
        level.id === 'docks'
          ? 'DOCKS'
          : level.id === 'spire'
            ? 'HELIX'
            : level.id === 'tenements'
              ? 'BLOCK'
              : level.id === 'nightmarket'
                ? 'NIGHT'
                : '07';
      ctx.fillText(districtTag, (w * TILE) / 2 - 90, (h * TILE) / 2);
      ctx.restore();
    }

    // hazard chevrons near the exit pad
    if (!isHub) {
      ctx.save();
      ctx.translate(level.exit.x, flip(level.exit.y) + 34);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 14 - 6, 6);
      ctx.lineTo(i * 14, -2);
      ctx.lineTo(i * 14 + 6, 6);
      ctx.stroke();
    }
    ctx.restore();
    }

    return c;
  }
}
