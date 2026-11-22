import { describe, expect, it } from 'vitest';
import { CASE_COLS, CASE_ROWS, canPlace, findFree } from './inventory';
import { MODIFIER_MAP, modifierPayBonus, rollModifiers } from './modifiers';
import {
  EMPTY_CYBERWARE,
  EMPTY_PERKS,
  computeMods,
  xpForNext,
} from './progression';

describe('case placement', () => {
  it('rejects out-of-bounds and overlapping placements', () => {
    expect(canPlace([], 'a', 'lmg', 0, 0, false)).toBe(true);
    expect(canPlace([], 'a', 'lmg', CASE_COLS - 3, 0, false)).toBe(false);
    expect(canPlace([], 'a', 'lmg', 0, CASE_ROWS - 1, false)).toBe(true);
    expect(canPlace([], 'a', 'lmg', 0, CASE_ROWS - 3, true)).toBe(false);
    expect(canPlace([], 'a', 'lmg', 0, 0, true)).toBe(true);

    const occupied = [{ id: 'b', weapon: 'pistol' as const, cellX: 0, cellY: 0, turned: false }];
    expect(canPlace(occupied, 'a', 'pistol', 0, 0, false)).toBe(false);
    expect(canPlace(occupied, 'a', 'pistol', 2, 0, false)).toBe(true);
  });

  it('findFree returns a placement that can actually be used', () => {
    const occupied = [{ id: 'b', weapon: 'lmg' as const, cellX: 0, cellY: 0, turned: false }];
    const spot = findFree(occupied, 'a', 'lmg');
    expect(spot).not.toBeNull();
    expect(canPlace(occupied, 'a', 'lmg', spot!.cellX, spot!.cellY, spot!.turned)).toBe(true);
  });
});

describe('contract modifiers', () => {
  it('rolls unique, valid modifiers with a 0-2 count', () => {
    for (let i = 0; i < 500; i++) {
      const ids = rollModifiers();
      expect(ids.length).toBeLessThanOrEqual(2);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(MODIFIER_MAP[id]).toBeDefined();
    }
    expect(modifierPayBonus(['alarm', 'hotLoot'])).toBeCloseTo(0.26);
    expect(modifierPayBonus([])).toBe(0);
  });
});

describe('progression math', () => {
  it('keeps XP and derived modifiers inside their stated bounds', () => {
    expect(xpForNext(1)).toBe(100);
    expect(xpForNext(2)).toBe(150);

    const maxed = {
      ...EMPTY_CYBERWARE,
      subdermal: 3,
      biomonitor: 2,
      reflex: 2,
      smartlink: 2,
      ocular: 2,
      mantis: 2,
      gorilla: 2,
    };
    const perks = { ...EMPTY_PERKS, sprinter: 3, ghost: 3, brawler: 3, gunslinger: 3 };
    const mods = computeMods(maxed, perks, { body: 8, reflexes: 8, cool: 8, tech: 8 });
    expect(mods.armor).toBe(5);
    expect(mods.speed).toBeCloseTo(1.45);
    expect(mods.meleeCooldown).toBeCloseTo(0.76);
    expect(mods.gunCooldown).toBeCloseTo(0.66);
    expect(mods.spread).toBeCloseTo(0.46);
    expect(mods.meleeReach).toBeCloseTo(1.85);
    expect(mods.vision).toBeCloseTo(0.48);
    expect(mods.speed).toBeLessThanOrEqual(1.6);
    expect(mods.gunCooldown).toBeGreaterThanOrEqual(0.4);
    expect(mods.spread).toBeGreaterThanOrEqual(0.25);
    expect(mods.vision).toBeGreaterThanOrEqual(0.4);
  });
});
