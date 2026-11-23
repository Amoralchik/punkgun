import { describe, expect, it } from 'vitest';
import { LAYOUTS } from './map';
import { buildMissionSpec } from './mission-spec';
import type { Contract } from './missions';
import { collateralPenalty, SETPIECES, setpieceFor, setpiecePayBonus } from './setpieces';
import { districtFor } from './districts';

function contract(overrides: Partial<Contract>): Contract {
  return {
    objective: 'recover',
    requiredLoot: 1,
    modifiers: [],
    risk: 'MED',
    layoutId: 'nightmarket',
    seed: 1,
    ...overrides,
  } as unknown as Contract;
}

describe('district setpieces', () => {
  it('is deterministic per contract seed', () => {
    for (let seed = 0; seed < 50; seed++) {
      const c = contract({ seed });
      expect(setpieceFor(c)).toBe(setpieceFor(c));
    }
  });

  it('only assigns a setpiece that fits the district theme', () => {
    for (const layout of LAYOUTS) {
      for (let seed = 0; seed < 40; seed++) {
        const id = setpieceFor(contract({ layoutId: layout.id, seed }));
        if (!id) continue;
        expect(SETPIECES[id].themes).toContain(districtFor(layout.id).theme);
      }
    }
  });

  it('shows up on a meaningful share of eligible contracts', () => {
    let hits = 0;
    for (let seed = 0; seed < 400; seed++) if (setpieceFor(contract({ seed }))) hits++;
    expect(hits).toBeGreaterThan(120);
    expect(hits).toBeLessThan(260);
  });

  it('never applies to bosses, boss rush, the finale or the safehouse', () => {
    for (let seed = 0; seed < 60; seed++) {
      expect(setpieceFor(contract({ seed, objective: 'boss' }))).toBeNull();
      expect(setpieceFor(contract({ seed, bossRush: true }))).toBeNull();
      expect(setpieceFor(contract({ seed, chapter: 'final' }))).toBeNull();
      expect(setpieceFor(contract({ seed, layoutId: 'safehouse' }))).toBeNull();
    }
  });

  it('reaches the world spec and pays its bonus', () => {
    let seed = 0;
    while (!setpieceFor(contract({ seed, layoutId: 'docks' }))) seed++;
    const spec = buildMissionSpec(contract({ seed, layoutId: 'docks' }), 'standard', [], 0);
    expect(spec.setpiece).toBe('defendedExtraction');
    expect(setpiecePayBonus(spec.setpiece)).toBeCloseTo(0.18);
  });

  it('caps the collateral penalty', () => {
    expect(collateralPenalty(0)).toBe(0);
    expect(collateralPenalty(2)).toBeCloseTo(0.16);
    expect(collateralPenalty(20)).toBe(0.4);
  });
});
