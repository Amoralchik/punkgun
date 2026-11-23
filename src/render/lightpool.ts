import * as THREE from 'three';

/** A static light source baked per level (neon, hazards, objectives). */
export interface LightSpec {
  x: number;
  y: number;
  size: number;
  color: number;
  intensity: number;
  /** 0 = steady, otherwise sin-pulse amplitude relative to intensity. */
  pulse?: number;
}

const QUAD = new THREE.PlaneGeometry(1, 1);
const MAX_STATIC = 64;
const MAX_FLASH = 80;

interface StaticSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  spec: LightSpec | null;
  phase: number;
}

interface FlashSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  intensity: number;
}

/**
 * Pooled additive "light pools" lying on the floor plane (z just above the
 * map). Static slots are rebuilt on bind(); flash slots are short-lived
 * dynamic lights (muzzle flashes, explosions, dashes) that fade out.
 */
export class LightPool {
  readonly group = new THREE.Group();
  private readonly statics: StaticSlot[] = [];
  private readonly flashes: FlashSlot[] = [];
  private flashCursor = 0;

  constructor(dotTexture: THREE.Texture) {
    for (let i = 0; i < MAX_STATIC; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: dotTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(QUAD, mat);
      mesh.position.z = 0.06;
      mesh.visible = false;
      this.group.add(mesh);
      this.statics.push({ mesh, mat, spec: null, phase: i * 1.7 });
    }
    for (let i = 0; i < MAX_FLASH; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: dotTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(QUAD, mat);
      mesh.position.z = 0.08;
      mesh.visible = false;
      this.group.add(mesh);
      this.flashes.push({ mesh, mat, life: 0, maxLife: 1, intensity: 0 });
    }
  }

  clear(): void {
    for (const slot of this.statics) {
      slot.spec = null;
      slot.mesh.visible = false;
    }
    for (const slot of this.flashes) {
      slot.life = 0;
      slot.mesh.visible = false;
    }
  }

  setStatics(specs: LightSpec[]): void {
    const count = Math.min(specs.length, MAX_STATIC);
    for (let i = 0; i < count; i++) {
      const slot = this.statics[i];
      slot.spec = specs[i];
      slot.mesh.visible = true;
      slot.mesh.position.set(specs[i].x, specs[i].y, 0.06);
      slot.mesh.scale.set(specs[i].size, specs[i].size, 1);
      slot.mat.color.setHex(specs[i].color);
      slot.mat.opacity = specs[i].intensity;
    }
    for (let i = count; i < this.statics.length; i++) {
      this.statics[i].spec = null;
      this.statics[i].mesh.visible = false;
    }
  }

  /** Short-lived dynamic light; overwrites the oldest slot when full. */
  flash(x: number, y: number, size: number, color: number, intensity: number, life = 0.09): void {
    const slot = this.flashes[this.flashCursor];
    this.flashCursor = (this.flashCursor + 1) % this.flashes.length;
    slot.life = life;
    slot.maxLife = life;
    slot.intensity = intensity;
    slot.mesh.visible = true;
    slot.mesh.position.set(x, y, 0.08);
    slot.mesh.scale.set(size, size, 1);
    slot.mat.color.setHex(color);
    slot.mat.opacity = intensity;
  }

  sync(dt: number, time: number): void {
    for (const slot of this.statics) {
      if (!slot.spec) continue;
      const pulse = slot.spec.pulse ?? 0;
      const k = pulse > 0 ? 1 + Math.sin(time * 2.2 + slot.phase) * pulse : 1;
      slot.mat.opacity = slot.spec.intensity * k;
    }
    for (const slot of this.flashes) {
      if (slot.life <= 0) continue;
      slot.life -= dt;
      if (slot.life <= 0) {
        slot.mesh.visible = false;
        continue;
      }
      slot.mat.opacity = slot.intensity * (slot.life / slot.maxLife);
    }
  }
}
