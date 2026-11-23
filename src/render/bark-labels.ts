import * as THREE from 'three';
import { getLocale } from '../core/i18n';
import { barkText, type Bark, type BarkId } from '../game/world-barks';

/**
 * Floating callout labels. Seen speakers get a crisp tag; unseen speakers
 * are "heard through the wall": bracketed, dimmer, italic.
 */
const COLORS: Record<BarkId, string> = {
  contact: '#ff3b4e',
  manDown: '#ff3b4e',
  fragOut: '#ff7a4c',
  exitHold: '#ff3b4e',
  flanking: '#ffc46b',
  staggered: '#ffc46b',
  heard: '#d8e2ec',
  lost: '#9fd8e6',
  clear: '#9fd8e6',
  giveUp: '#9fb0c0',
};

interface Label {
  mesh: THREE.Mesh;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  mat: THREE.MeshBasicMaterial;
  barkId: number;
  heard: boolean;
}

const W = 320;
const H = 48;

export class BarkLabels {
  readonly group = new THREE.Group();
  private readonly labels: Label[] = [];

  constructor(count = 4) {
    for (let i = 0; i < count; i++) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d')!;
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      mesh.scale.set(W / 2, H / 2, 1);
      mesh.visible = false;
      this.group.add(mesh);
      this.labels.push({ mesh, ctx, tex, mat, barkId: -1, heard: false });
    }
  }

  private paint(label: Label, bark: Bark, heard: boolean): void {
    const { ctx } = label;
    const text = barkText(bark, getLocale() === 'es' ? 'es' : 'en');
    const shown = heard ? `[ ${text} ]` : text;
    ctx.clearRect(0, 0, W, H);
    ctx.font = `${heard ? 'italic ' : ''}bold 20px Bahnschrift, "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = Math.min(W - 8, ctx.measureText(shown).width + 22);
    if (!heard) {
      ctx.fillStyle = 'rgba(6, 8, 13, 0.78)';
      ctx.beginPath();
      ctx.roundRect((W - w) / 2, 8, w, 32, 4);
      ctx.fill();
      ctx.fillStyle = COLORS[bark.key];
      ctx.fillRect((W - w) / 2, 8, 3, 32);
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(shown, W / 2, 25);
    ctx.fillStyle = COLORS[bark.key];
    ctx.fillText(shown, W / 2, 25);
    label.tex.needsUpdate = true;
    label.barkId = bark.id;
    label.heard = heard;
  }

  /** `locate` returns the speaker's position and whether the player sees them. */
  sync(
    barks: Bark[],
    locate: (enemyId: number) => { x: number; y: number; seen: boolean } | null,
  ): void {
    const live = new Set(barks.map((b) => b.id));
    for (const label of this.labels) {
      if (!live.has(label.barkId)) {
        label.barkId = -1;
        label.mesh.visible = false;
      }
    }
    for (const bark of barks) {
      const at = locate(bark.enemyId);
      let label = this.labels.find((l) => l.barkId === bark.id);
      if (!at) {
        if (label) label.mesh.visible = false;
        continue;
      }
      if (!label) {
        label = this.labels.find((l) => l.barkId === -1);
        if (!label) continue;
        this.paint(label, bark, !at.seen);
      } else if (label.heard && at.seen) {
        this.paint(label, bark, false);
      }
      const k = bark.t / bark.life;
      const fade = k < 0.1 ? k / 0.1 : k > 0.75 ? (1 - k) / 0.25 : 1;
      label.mat.opacity = fade * (label.heard ? 0.7 : 1);
      label.mesh.position.set(at.x, at.y + 64 + k * 10, 2.3);
      label.mesh.visible = true;
    }
  }

  clear(): void {
    for (const label of this.labels) {
      label.barkId = -1;
      label.mesh.visible = false;
    }
  }
}
