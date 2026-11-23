import * as THREE from 'three';

/**
 * Sound pings: expanding rings drawn above the line-of-sight darkness where
 * an unseen enemy makes noise. Footsteps are small and grey, gunfire is a
 * wide red ring, a guard going hot is amber. You hear the room you can't see.
 */
interface Ping {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  life: number;
  radius: number;
  peak: number;
}

const RING = new THREE.RingGeometry(0.86, 1, 48);
const POOL = 28;

export class SoundPings {
  readonly group = new THREE.Group();
  private readonly pings: Ping[] = [];
  private cursor = 0;
  private reduced = false;

  constructor() {
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(RING, mat);
      mesh.visible = false;
      mesh.position.z = 1.9;
      this.group.add(mesh);
      this.pings.push({ mesh, mat, t: 0, life: 0, radius: 0, peak: 0 });
    }
  }

  setReducedMotion(on: boolean): void {
    this.reduced = on;
  }

  emit(x: number, y: number, radius: number, color: number, life = 0.7, peak = 0.55): void {
    const p = this.pings[this.cursor];
    this.cursor = (this.cursor + 1) % this.pings.length;
    p.t = 0;
    p.life = life;
    p.radius = radius;
    p.peak = peak;
    p.mat.color.setHex(color);
    p.mesh.position.set(x, y, 1.9);
    p.mesh.visible = true;
  }

  clear(): void {
    for (const p of this.pings) {
      p.mesh.visible = false;
      p.life = 0;
    }
  }

  update(dt: number): void {
    for (const p of this.pings) {
      if (!p.mesh.visible) continue;
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        p.mesh.visible = false;
        continue;
      }
      // Reduced motion: a static fading ring instead of an expanding one.
      const r = this.reduced ? p.radius : p.radius * (0.25 + 0.75 * Math.sqrt(k));
      p.mesh.scale.set(r, r, 1);
      p.mat.opacity = p.peak * (1 - k);
    }
  }
}
