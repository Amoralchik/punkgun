import { describe, expect, it } from 'vitest';
import { Profile, type StorageLike } from './profile';
import { rollContracts } from './missions';
import { settleRun } from './settlement';
import type { World } from './world';

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
} 

describe('run settlement', () => {
  it('banks payout, extraction, rep, loot and XP exactly once', () => {
    const profile = new Profile(1, new MemoryStorage());
    const contract = rollContracts(3, 123)[0];
    const world = {
      time: 60,
      shotsFired: 10,
      shotsHit: 5,
      peakHeat: 10,
      stealthKills: 1,
      aliveEnemies: 0,
      kills: 5,
      loot: [
        { kind: 'shard', collected: true },
        { kind: 'chip', collected: false },
      ],
      player: { weapon: 'smg', ammo: 6, clip: 18, attachment: null, variant: null },
      boons: [],
    } as unknown as World;

    const beforeMoney = profile.data.money;
    const { reward } = settleRun(profile, world, contract, 'standard');

    expect(reward.contractTitle).toBe(contract.title);
    expect(reward.payout).toBe(reward.base + reward.bonus + reward.rankBonus);
    expect(reward.extracted).toMatchObject({ weapon: 'smg', ammo: 24 });
    expect(profile.data.money).toBe(beforeMoney + reward.payout);
    expect(profile.data.clears).toBe(1);
    expect(profile.data.regularClears).toBe(1);
    expect(profile.data.bestTime).toBe(60);
    expect(profile.data.reputation[contract.faction]).toBe(1);
    expect(profile.data.contraband.shard).toBe(1);
    expect(profile.data.stash.some((item) => item.weapon === 'smg')).toBe(true);
  });
});

describe('ghost run settlement', () => {
  it('pays the no-detection bonus once and marks the result', () => {
    const profile = new Profile(3, new MemoryStorage());
    const contract = rollContracts(3, 456)[0];
    const world = {
      time: 55,
      shotsFired: 6,
      shotsHit: 6,
      peakHeat: 0,
      stealthKills: 5,
      detections: 0,
      aliveEnemies: 0,
      kills: 5,
      loot: [],
      player: { weapon: 'fists', ammo: 0, clip: 0, attachment: null, variant: null, alive: true },
      boons: [],
    } as unknown as World;
    const { reward } = settleRun(profile, world, contract, 'standard');
    expect(reward.ghostRun).toBe(true);
    expect(reward.ghostBonus).toBeGreaterThan(0);
    expect(reward.payout).toBe(
      reward.base +
        reward.bonus +
        reward.rankBonus +
        (reward.ghostBonus ?? 0),
    );
  });
});

describe('dialogue boons in settlement', () => {
  it('adds the fixer bonus and salvage components', () => {
    const profile = new Profile(2, new MemoryStorage());
    const contract = rollContracts(3, 123)[0];
    const world = {
      time: 60,
      shotsFired: 0,
      shotsHit: 0,
      peakHeat: 0,
      stealthKills: 0,
      aliveEnemies: 0,
      kills: 0,
      loot: [],
      player: { weapon: 'fists', ammo: 0, clip: 0, attachment: null, variant: null },
      boons: ['pay', 'components'],
    } as unknown as World;
    const beforeComponents = Object.values(profile.data.components).reduce(
      (sum, value) => sum + value,
      0,
    );
    const { reward } = settleRun(profile, world, contract, 'standard');
    expect(reward.boonBonus).toBeGreaterThan(0);
    expect(reward.payout).toBe(reward.base + reward.bonus + reward.rankBonus + reward.boonBonus!);
    expect(
      Object.values(profile.data.components).reduce((sum, value) => sum + value, 0),
    ).toBe(beforeComponents + 3);
  });
});

describe('role and business settlement', () => {
  it('adds role pay, venture income and chop components', () => {
    const profile = new Profile(2, new MemoryStorage());
    profile.data.role = 'fixer';
    profile.data.ventures.haven = 1;
    profile.data.ventures.noodle = 2;
    profile.data.ventures.chop = 1;
    const contract = rollContracts(3, 321)[0];
    const world = {
      time: 60,
      shotsFired: 0,
      shotsHit: 0,
      peakHeat: 0,
      stealthKills: 0,
      aliveEnemies: 0,
      kills: 0,
      loot: [],
      player: { weapon: 'fists', ammo: 0, clip: 0, attachment: null, variant: null },
      boons: [],
    } as unknown as World;
    const beforeComponents = Object.values(profile.data.components).reduce(
      (sum, value) => sum + value,
      0,
    );
    const { reward } = settleRun(profile, world, contract, 'standard');
    expect(reward.roleBonus).toBeGreaterThan(0);
    expect(reward.ventureBonus).toBeGreaterThan(0);
    expect(reward.ventureIncome).toBe(62);
    expect(reward.payout).toBe(
      reward.base +
        reward.bonus +
        reward.rankBonus +
        (reward.boonBonus ?? 0) +
        (reward.roleBonus ?? 0) +
        (reward.ventureBonus ?? 0) +
        (reward.ventureIncome ?? 0),
    );
    expect(
      Object.values(profile.data.components).reduce((sum, value) => sum + value, 0),
    ).toBeGreaterThan(beforeComponents);
  });
});
