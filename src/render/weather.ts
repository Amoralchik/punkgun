import * as THREE from 'three';
import { mulberry32 } from '../core/math';

export type WeatherKind = 'rain' | 'ash' | 'embers' | 'none';

export function weatherForLevel(id: string): WeatherKind {
  if (
    id === 'nightmarket' ||
    id === 'docks' ||
    id === 'sector07' ||
    id === 'transit' ||
    id === 'freighter' ||
    id === 'nightclub'
  ) {
    return 'rain';
  }
  if (id === 'tenements' || id === 'spire' || id === 'arcology') return 'ash';
  if (id === 'sublevel') return 'embers';
  return 'none';
}

const MAX_DROPS = 460;

interface Drop {
  x: number;
  y: number;
  speed: number;
  drift: number;
  length: number;
}

/** In-world atmospheric particles. Drawn above the map and below units. */
export class WeatherField {
  readonly group = new THREE.Group();

  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions = new Float32Array(MAX_DROPS * 2 * 3);
  private readonly material = new THREE.LineBasicMaterial({
    color: 0x5ef1ff,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private readonly line: THREE.LineSegments;
  private readonly drops: Drop[] = [];
  private readonly rng = mulberry32(0x51ab);
  private kind: WeatherKind = 'none';
  private enabled = true;
  private count = 0;
  private speed = 0;
  private wind = 0;
  private rise = false;

  constructor() {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.line = new THREE.LineSegments(this.geometry, this.material);
    this.line.frustumCulled = false;
    this.group.add(this.line);
    this.group.visible = false;

    for (let i = 0; i < MAX_DROPS; i++) {
      this.drops.push({
        x: (this.rng() - 0.5) * 1200,
        y: (this.rng() - 0.5) * 900,
        speed: 0.7 + this.rng() * 0.6,
        drift: (this.rng() - 0.5) * 16,
        length: 12 + this.rng() * 14,
      });
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.group.visible = enabled && this.kind !== 'none';
  }

  setKind(kind: WeatherKind): void {
    if (kind === this.kind) return;
    this.kind = kind;
    this.group.visible = this.enabled && kind !== 'none';
    if (kind === 'none') {
      this.count = 0;
      this.geometry.setDrawRange(0, 0);
      return;
    }

    if (kind === 'rain') {
      this.count = 360;
      this.speed = 460;
      this.wind = -90;
      this.rise = false;
      this.material.color.setHex(0x5ef1ff);
      this.material.opacity = 0.14;
    } else if (kind === 'ash') {
      this.count = 180;
      this.speed = 16;
      this.wind = 8;
      this.rise = false;
      this.material.color.setHex(0xffc46b);
      this.material.opacity = 0.11;
    } else {
      this.count = 220;
      this.speed = 36;
      this.wind = 12;
      this.rise = true;
      this.material.color.setHex(0xff6a3b);
      this.material.opacity = 0.24;
    }
    this.geometry.setDrawRange(0, this.count * 2);
  }

  update(camX: number, camY: number, viewW: number, viewH: number, dt: number): void {
    if (this.kind === 'none' || this.count === 0) return;
    const halfW = viewW / 2 + 90;
    const halfH = viewH / 2 + 90;
    const time = Math.min(0.05, dt);

    for (let i = 0; i < this.count; i++) {
      const d = this.drops[i];
      d.y += this.rise ? this.speed * d.speed * time : -this.speed * d.speed * time;
      d.x += (this.wind + d.drift) * time;

      if (this.rise ? d.y > camY + halfH : d.y < camY - halfH) {
        d.y = this.rise ? camY - halfH : camY + halfH;
        d.x = camX + (this.rng() * 2 - 1) * halfW;
      }
      if (d.x > camX + halfW) d.x = camX - halfW;
      else if (d.x < camX - halfW) d.x = camX + halfW;

      const o = i * 6;
      this.positions[o] = d.x;
      this.positions[o + 1] = d.y;
      this.positions[o + 2] = 0.2;
      this.positions[o + 3] = d.x + (this.rise ? 1 : -4);
      this.positions[o + 4] = d.y + (this.rise ? d.length : -d.length);
      this.positions[o + 5] = 0.2;
    }
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}
