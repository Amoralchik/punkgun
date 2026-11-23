import { describe, expect, it } from 'vitest';
import {
  ENEMY_AIM_WINDUP,
  ENEMY_KIND_ROLLS,
  ENEMY_TRAITS,
  isEnemyAiming,
  pickEnemyKind,
  rollEnemyLoadout,
} from './enemy-data';

describe('enemy archetype data', () => {
  it('maps roll buckets to the declared archetypes', () => {
    expect(pickEnemyKind(0.07)).toBe('shield');
    expect(pickEnemyKind(0.1)).toBe('sniper');
    expect(pickEnemyKind(0.2)).toBe('rusher');
    expect(pickEnemyKind(0.3)).toBe('gunner');
    expect(pickEnemyKind(0.36)).toBe('marksman');
    expect(pickEnemyKind(0.4)).toBe('heavy');
    expect(pickEnemyKind(0.46)).toBe('grenadier');
    expect(pickEnemyKind(0.52)).toBe('blade');
    expect(pickEnemyKind(0.58)).toBe('netrunner');
    expect(pickEnemyKind(0.62)).toBe('operator');
    expect(pickEnemyKind(0.65)).toBe('stalker');
    expect(pickEnemyKind(0.72)).toBe('breacher');
    expect(pickEnemyKind(0.75)).toBe('drone');
    expect(pickEnemyKind(0.79)).toBe('hound');
    expect(pickEnemyKind(0.8)).toBe('medic');
    expect(pickEnemyKind(0.85)).toBe('grunt');
    expect(pickEnemyKind(0.99)).toBe('grunt');
    expect(ENEMY_KIND_ROLLS.map((entry) => entry.below)).toEqual([
      0.08, 0.15, 0.26, 0.34, 0.39, 0.44, 0.5, 0.56, 0.61, 0.65, 0.7, 0.74, 0.77,
      0.8, 0.83,
    ]);
  });

  it('rolls the documented loadouts without hidden randomness', () => {
    const seq = (values: number[]) => {
      let i = 0;
      return () => values[i++] ?? 0;
    };

    expect(rollEnemyLoadout('boss', () => 0.99)).toEqual({ weapon: 'shotgun', ammo: 10 });
    expect(rollEnemyLoadout('rusher', () => 0.99)).toEqual({ weapon: 'fists', ammo: 0 });
    expect(rollEnemyLoadout('gunner', () => 0.99)).toEqual({ weapon: 'smg', ammo: 36 });
    expect(rollEnemyLoadout('heavy', () => 0.99)).toEqual({ weapon: 'lmg', ammo: 80 });
    expect(rollEnemyLoadout('grenadier', () => 0.99)).toEqual({ weapon: 'fists', ammo: 0 });
    expect(rollEnemyLoadout('blade', () => 0.99)).toEqual({ weapon: 'fists', ammo: 0 });
    expect(rollEnemyLoadout('netrunner', () => 0.99)).toEqual({ weapon: 'fists', ammo: 0 });
    expect(rollEnemyLoadout('operator', () => 0.99)).toEqual({ weapon: 'pistol', ammo: 5 });
    expect(rollEnemyLoadout('stalker', () => 0.99)).toEqual({ weapon: 'fists', ammo: 0 });
    expect(rollEnemyLoadout('breacher', () => 0.99)).toEqual({
      weapon: 'shotgun',
      ammo: 6,
    });
    expect(rollEnemyLoadout('drone', () => 0.99)).toEqual({ weapon: 'needler', ammo: 12 });
    expect(rollEnemyLoadout('hound', () => 0.99)).toEqual({ weapon: 'fists', ammo: 0 });
    expect(rollEnemyLoadout('medic', () => 0.99)).toEqual({ weapon: 'pistol', ammo: 4 });
    expect(rollEnemyLoadout('shield', seq([0.54]))).toEqual({ weapon: 'bat', ammo: 0 });
    expect(rollEnemyLoadout('shield', seq([0.56]))).toEqual({ weapon: 'pistol', ammo: 4 });
    expect(rollEnemyLoadout('grunt', seq([0.1, 0.99]))).toEqual({ weapon: 'fists', ammo: 0 });
    expect(rollEnemyLoadout('grunt', seq([0.15, 0.99]))).toEqual({ weapon: 'bat', ammo: 0 });
    expect(rollEnemyLoadout('grunt', seq([0.33, 0.99]))).toEqual({
      weapon: 'revolver',
      ammo: 11,
    });
    expect(rollEnemyLoadout('grunt', seq([0.58, 0.99]))).toEqual({
      weapon: 'carbine',
      ammo: 11,
    });
    expect(rollEnemyLoadout('grunt', seq([0.65, 0.99]))).toEqual({
      weapon: 'needler',
      ammo: 11,
    });
    expect(rollEnemyLoadout('grunt', seq([0.87, 0.99]))).toEqual({ weapon: 'dmr', ammo: 11 });
    expect(rollEnemyLoadout('grunt', seq([0.97, 0.99]))).toEqual({
      weapon: 'plasma',
      ammo: 11,
    });
    expect(rollEnemyLoadout('grunt', seq([0.995, 0.99]))).toEqual({
      weapon: 'railgun',
      ammo: 11,
    });
    expect(rollEnemyLoadout('grunt', seq([0.9, 0.5]))).toEqual({ weapon: 'lmg', ammo: 8 });
  });

  it('telegraphs only during the final aim window', () => {
    expect(isEnemyAiming('sniper', 0.7)).toBe(false);
    expect(isEnemyAiming('sniper', 0.65)).toBe(true);
    expect(isEnemyAiming('grunt', 0.33)).toBe(false);
    expect(isEnemyAiming('grunt', 0.3)).toBe(true);
    expect(ENEMY_AIM_WINDUP.sniper!).toBeGreaterThan(ENEMY_AIM_WINDUP.grunt!);
    expect(ENEMY_AIM_WINDUP.heavy!).toBeGreaterThan(ENEMY_AIM_WINDUP.gunner!);
  });

  it('keeps archetype traits distinct and boss-heavy', () => {
    expect(ENEMY_TRAITS.rusher.speedMult).toBeGreaterThan(ENEMY_TRAITS.heavy.speedMult);
    expect(ENEMY_TRAITS.marksman.visionMult).toBeGreaterThan(ENEMY_TRAITS.grunt.visionMult);
    expect(ENEMY_TRAITS.heavy.armor).toBe(2);
    expect(ENEMY_TRAITS.boss).toMatchObject({ radius: 24, armor: 3 });
  });
});
