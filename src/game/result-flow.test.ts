import { describe, expect, it } from 'vitest';
import type { Contract } from './missions';
import type { RewardSummary } from './results';
import { buildResult, type ResultInput } from './result-flow';

const contract = {
  title: 'NIGHT SHIFT',
  chapter: 1,
  modifiers: [],
} as unknown as Contract;

const reward = {
  contractTitle: 'NIGHT SHIFT',
  base: 100,
  bonus: 20,
  payout: 180,
  contrabandCount: 0,
  contrabandValue: 0,
  extracted: null,
  xpGain: 50,
  level: 2,
  xp: 10,
  xpNext: 100,
  levelsGained: 0,
  perkPoints: 0,
  rank: 'A',
  rankBonus: 60,
  accuracy: 0.5,
  stealthKills: 0,
  peakHeat: 0,
} as RewardSummary;

function input(overrides: Partial<ResultInput> = {}): ResultInput {
  return {
    dead: false,
    contract,
    world: {
      time: 60,
      kills: 5,
      lootValue: 0,
      deathCause: 'SHOTGUN',
      player: { weapon: 'smg' },
    },
    carriedWeapon: true,
    insured: false,
    insuredWeapon: null,
    reward,
    approachId: 'standard',
    ending: null,
    money: 500,
    ...overrides,
  };
}

describe('run result flow', () => {
  it('builds death, win, ending and none views', () => {
    expect(buildResult(input({ dead: true })).kind).toBe('death');
    expect(buildResult(input()).kind).toBe('win');
    expect(
      buildResult(input({ contract: { ...contract, chapter: 'final' } as Contract })).kind,
    ).toBe('ending');
    expect(
      buildResult(
        input({
          contract: { ...contract, chapter: 'final' } as Contract,
          ending: 'burn',
        }),
      ).kind,
    ).toBe('win');
    expect(buildResult(input({ reward: null })).kind).toBe('none');
  });
});
