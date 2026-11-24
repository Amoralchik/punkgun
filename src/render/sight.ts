import * as THREE from 'three';
import { TILE } from '../game/map';

/**
 * Noir line-of-sight: everything the operative cannot see sinks into
 * darkness. A visibility polygon is ray-cast from the player through the
 * same tiles that block enemy sight (walls, closed doors; glass stays
 * transparent), painted into a small canvas and laid over the world.
 *
 * The mask is low-res and softened on purpose: it should read as light and
 * shadow, not as a hard-edged fog-of-war decal.
 */

export interface SightSource {
  readonly level: { w: number; h: number };
  sightBlockedTile(cx: number, cy: number): boolean;
}

const RAYS = 420;
const RANGE = 1150;
/** How far light spills past a hit so the facing wall surface reads. */
const WALL_SPILL = 20;
/** Darkness opacity outside sight (a memory of the room stays faintly visible). */
const DARK = 0.8;

export class SightMask {
  readonly mesh: THREE.Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly tex: THREE.CanvasTexture;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly xs = new Float32Array(RAYS);
  private readonly ys = new Float32Array(RAYS);
  private strength = 1;

  constructor(width = 384, height = 288) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.magFilter = THREE.LinearFilter;
    this.mat = new THREE.MeshBasicMaterial({
      map: this.tex,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    // Transparent depth sort places this above bodies (z <= 1.3) and below
    // telegraphs/markers (z >= 1.8), which must stay readable in the dark.
    this.mesh.position.z = 1.7;
    this.mesh.visible = false;
  }

  setEnabled(on: boolean): void {
    this.mesh.visible = on;
  }

  /** Overall darkness multiplier (e.g. a touch lighter when cones are off). */
  setStrength(k: number): void {
    this.strength = Math.max(0, Math.min(1, k));
  }

  /** Cast the polygon from (px, py) and repaint the mask for the current view. */
  update(
    world: SightSource,
    px: number,
    py: number,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
  ): void {
    if (!this.mesh.visible) return;
    // Never let one bad frame (e.g. a NaN from physics) take the game down.
    if (![px, py, camX, camY, viewW, viewH].every(Number.isFinite) || viewW <= 0 || viewH <= 0) return;
    this.cast(world, px, py);

    const { ctx, canvas } = this;
    const sx = canvas.width / viewW;
    const sy = canvas.height / viewH;
    const left = camX - viewW / 2;
    const top = camY + viewH / 2;
    const toX = (x: number) => (x - left) * sx;
    const toY = (y: number) => (top - y) * sy;

    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `rgba(2, 3, 9, ${DARK * this.strength})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Carve the visible region; sight also falls off with distance.
    ctx.globalCompositeOperation = 'destination-out';
    if ('filter' in ctx) ctx.filter = 'blur(2px)';
    const cx = toX(px);
    const cy = toY(py);
    const r = RANGE * sx;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.92)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(toX(this.xs[0]), toY(this.ys[0]));
    for (let i = 1; i < RAYS; i++) ctx.lineTo(toX(this.xs[i]), toY(this.ys[i]));
    ctx.closePath();
    ctx.fill();
    // Close-range awareness: you always feel what is right next to you.
    const near = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90 * sx);
    near.addColorStop(0, 'rgba(0,0,0,0.9)');
    near.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = near;
    ctx.fillRect(cx - 90 * sx, cy - 90 * sx, 180 * sx, 180 * sx);
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';

    this.tex.needsUpdate = true;
    this.mesh.position.set(camX, camY, 1.7);
    this.mesh.scale.set(viewW, viewH, 1);
  }

  /** Grid DDA per ray against sight-blocking tiles. */
  private cast(world: SightSource, px: number, py: number): void {
    const { w, h } = world.level;
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      // World y is up; tile row 0 is the top row.
      let tx = Math.floor(px / TILE);
      let ty = Math.floor(py / TILE);
      const stepX = dx > 0 ? 1 : -1;
      const stepY = dy > 0 ? 1 : -1;
      const tDeltaX = Math.abs(TILE / (dx || 1e-9));
      const tDeltaY = Math.abs(TILE / (dy || 1e-9));
      let tMaxX = dx > 0 ? ((tx + 1) * TILE - px) / dx : (px - tx * TILE) / (-dx || 1e-9);
      let tMaxY = dy > 0 ? ((ty + 1) * TILE - py) / dy : (py - ty * TILE) / (-dy || 1e-9);
      let t = RANGE;
      while (true) {
        let next: number;
        if (tMaxX < tMaxY) {
          next = tMaxX;
          tMaxX += tDeltaX;
          tx += stepX;
        } else {
          next = tMaxY;
          tMaxY += tDeltaY;
          ty += stepY;
        }
        if (next >= RANGE) break;
        const row = h - 1 - ty;
        if (tx < 0 || ty < 0 || tx >= w || row < 0 || row >= h || world.sightBlockedTile(tx, row)) {
          t = Math.min(RANGE, next + WALL_SPILL);
          break;
        }
      }
      this.xs[i] = px + dx * t;
      this.ys[i] = py + dy * t;
    }
  }

  dispose(): void {
    this.tex.dispose();
    this.mat.dispose();
    this.mesh.geometry.dispose();
  }
}
