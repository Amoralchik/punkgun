import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../core/math';
import { addBlood, addCasing, addSparks, updateParticles } from './effects';
import type { Decal, Particle } from './world-types';

describe('world effects', () => {
  it('spawns and expires sparks with the injected RNG', () => {
    const particles: Particle[] = [];
    addSparks(particles, mulberry32(1), 10, 20, 0);
    expect(particles).toHaveLength(6);
    expect(particles.every((p) => p.kind === 'spark')).toBe(true);
    updateParticles(particles, [], 1);
    expect(particles).toHaveLength(0);
  });

  it('adds blood particles and decals, then caps decal history', () => {
    const particles: Particle[] = [];
    const decals: Decal[] = [];
    addBlood(particles, decals, mulberry32(2), 5, 5, 0, 2);
    expect(particles).toHaveLength(12);
    expect(particles.every((p) => p.kind === 'blood')).toBe(true);
    expect(decals.length).toBeGreaterThanOrEqual(3);
    expect(decals.length).toBeLessThanOrEqual(5);

    for (let i = 0; i < 230; i++) {
      decals.push({ x: i, y: 0, rot: 0, scale: 1, tex: 0 });
    }
    updateParticles([], decals, 0);
    expect(decals).toHaveLength(220);
  });

  it('spawns exactly one casing with a finite lifetime', () => {
    const particles: Particle[] = [];
    addCasing(particles, mulberry32(3), 0, 0, 0);
    expect(particles).toHaveLength(1);
    expect(particles[0]).toMatchObject({ kind: 'casing', life: 0.45, maxLife: 0.45, size: 4 });
  });
});
