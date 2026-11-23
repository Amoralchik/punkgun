import { describe, expect, it } from 'vitest';
import { mulberry32, seedLabel } from '../core/math';
import { createBossContract, createBossRushContract, createFinalContract, rollContracts } from './missions';
import { LAYOUTS, layoutCacheCount, loadLevel } from './map';
import { rollModifiers } from './modifiers';

describe('seeded mission generation', () => {
  it('reproduces the exact board from the same seed', () => {
    const a = rollContracts(3, 123456);
    const b = rollContracts(3, 123456);
    expect(a).toEqual(b);
    expect(a.map((c) => c.seed)).toEqual(b.map((c) => c.seed));
    expect(new Set(a.map((c) => c.objective)).size).toBe(3);
    expect(new Set(a.map((c) => c.layoutId)).size).toBe(3);
    for (const contract of a) {
      if (contract.objective === 'recover') {
        expect(contract.requiredLoot).toBeGreaterThanOrEqual(1);
        expect(contract.requiredLoot).toBeLessThanOrEqual(2);
      } else if (contract.objective === 'sabotage') {
        expect(contract.requiredLoot).toBeGreaterThanOrEqual(2);
        expect(contract.requiredLoot).toBeLessThanOrEqual(3);
      } else if (contract.objective === 'extraction') {
        expect(contract.requiredLoot).toBe(1);
      } else {
        expect(contract.requiredLoot).toBe(0);
      }
      expect(contract.reward).toBeGreaterThan(0);
      expect(contract.id).toContain(contract.seed.toString(36));
    }
  });

  it('changes the board with a different seed', () => {
    const a = rollContracts(3, 123456);
    const b = rollContracts(3, 654321);
    expect(a).not.toEqual(b);
  });

  it('covers the expanded objective pool over generated boards', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 120; seed++) {
      const board = rollContracts(3, seed);
      expect(new Set(board.map((c) => c.objective)).size).toBe(3);
      for (const contract of board) seen.add(contract.objective);
    }
    expect(seen).toEqual(
      new Set(['purge', 'target', 'recover', 'sabotage', 'extraction', 'hunt', 'defense']),
    );
  });

  it('makes boss and final contracts seed-stable', () => {
    expect(createBossContract(4, 777)).toEqual(createBossContract(4, 777));
    expect(createBossContract(4, 777).seed).toBe(777);
    expect(createFinalContract(888)).toEqual(createFinalContract(888));
    expect(createFinalContract(888).seed).toBe(888);
    expect(createFinalContract(888).modifiers).toEqual(['elite']);
    const rush = createBossRushContract(999, 5);
    expect(rush.bossRush).toBe(true);
    expect(rush.objective).toBe('boss');
    expect(rush.reward).toBeGreaterThan(createBossContract(5, 999).reward);
    expect(rush.taglineEs).toContain('Seis puertas');
  });

  it('seeds modifier rolls', () => {
    const roll = () => {
      const rng = mulberry32(99);
      return [rollModifiers(rng), rollModifiers(rng), rollModifiers(rng)];
    };
    expect(roll()).toEqual(roll());
    for (const ids of roll()) {
      expect(ids.length).toBeLessThanOrEqual(2);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('never asks for more caches than the layout contains', () => {
    for (const layout of LAYOUTS.filter((entry) => entry.id !== 'safehouse')) {
      const level = loadLevel(layout.id);
      expect(level.loot.length).toBeGreaterThanOrEqual(2);
      expect(level.loot.length).toBe(layoutCacheCount(layout.id));
    }
    for (let seed = 1; seed <= 250; seed++) {
      for (const contract of rollContracts(3, seed)) {
        if (contract.objective !== 'recover') continue;
        expect(contract.requiredLoot).toBeLessThanOrEqual(
          layoutCacheCount(contract.layoutId),
        );
      }
    }
  });

  it('formats a stable compact seed label', () => {
    expect(seedLabel(0)).toBe('0000000');
    expect(seedLabel(123456)).toBe(seedLabel(123456));
    expect(seedLabel(0xffffffff)).toHaveLength(7);
  });
});
