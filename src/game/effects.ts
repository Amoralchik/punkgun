import type { Decal, Particle } from './world-types';

export function updateParticles(particles: Particle[], decals: Decal[], dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const drag = p.kind === 'blood' ? 5 : 2.5;
    const f = Math.exp(-drag * dt);
    p.vx *= f;
    p.vy *= f;
  }
  if (decals.length > 220) decals.splice(0, decals.length - 220);
  if (particles.length > 420) particles.splice(0, particles.length - 420);
}

export function addSparks(
  particles: Particle[],
  rng: () => number,
  x: number,
  y: number,
  angle: number,
): void {
  for (let i = 0; i < 6; i++) {
    const a = angle + (rng() - 0.5) * 0.9;
    const s = 90 + rng() * 260;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.12 + rng() * 0.16,
      maxLife: 0.28,
      size: 2 + rng() * 3,
      kind: 'spark',
      color: rng() > 0.4 ? 0x9ffcff : 0xffd48a,
    });
  }
}

export function addBlood(
  particles: Particle[],
  decals: Decal[],
  rng: () => number,
  x: number,
  y: number,
  angle: number,
  amount = 1,
): void {
  for (let i = 0; i < 6 * amount; i++) {
    const a = angle + (rng() - 0.5) * 2.4;
    const s = 60 + rng() * 260;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.18 + rng() * 0.35,
      maxLife: 0.5,
      size: 3 + rng() * 5,
      kind: 'blood',
      color: 0x9b0b1e,
    });
  }
  const decalsCount = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < decalsCount; i++) {
    const a = rng() * Math.PI * 2;
    const rad = rng() * 26;
    decals.push({
      x: x + Math.cos(a) * rad,
      y: y + Math.sin(a) * rad,
      rot: rng() * Math.PI * 2,
      scale: 0.45 + rng() * 0.8,
      tex: Math.floor(rng() * 3),
    });
  }
  decals.push({
    x,
    y,
    rot: rng() * Math.PI * 2,
    scale: 1.35,
    tex: Math.floor(rng() * 3),
  });
}

export function addCasing(
  particles: Particle[],
  rng: () => number,
  x: number,
  y: number,
  angle: number,
): void {
  const side = angle + (rng() > 0.5 ? 1 : -1) * (Math.PI / 2);
  const speed = 70 + rng() * 70;
  particles.push({
    x,
    y,
    vx: Math.cos(side) * speed,
    vy: Math.sin(side) * speed,
    life: 0.45,
    maxLife: 0.45,
    size: 4,
    kind: 'casing',
    color: 0xffc46b,
  });
}
