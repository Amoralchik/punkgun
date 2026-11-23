import { describe, expect, it } from 'vitest';
import { challengePayBonus, CHALLENGES } from './challenges';
import { createDailyContract, dailySeed, localDateKey } from './daily';
import { Profile } from './profile';
import { settleRun } from './settlement';

describe('daily contract', () => {
  it('derives a stable seed from the local date and a contract from it', () => {
    const key = '2026-11-23';
    expect(localDateKey(new Date(2026, 10, 23))).toBe(key);
    expect(dailySeed(key)).toBe(dailySeed(key));
    expect(dailySeed(key)).not.toBe(dailySeed('2026-11-24'));
    const contract = createDailyContract(dailySeed(key));
    expect(contract.daily).toBe(true);
    expect(contract.id).toContain('daily-');
    expect(contract.reward).toBeGreaterThan(0);
  });

  it('initializes once per date and marks the clear once', () => {
    const profile = new Profile(3, null);
    expect(profile.data.daily.seed).toBe(dailySeed(localDateKey()));
    expect(profile.ensureDaily()).toBe(false);
    expect(profile.markDailyCleared('A')).toBe(true);
    expect(profile.markDailyCleared('S')).toBe(false);
    expect(profile.data.daily.bestRank).toBe('A');
    expect(profile.dailyContract().daily).toBe(true);
  });
});

describe('challenge modes', () => {
  it('publishes three bonus modes plus standard', () => {
    expect(CHALLENGES).toHaveLength(4);
    expect(challengePayBonus('standard')).toBe(0);
    expect(challengePayBonus('fists')).toBeCloseTo(0.35);
    expect(challengePayBonus('glass')).toBeCloseTo(0.4);
    expect(challengePayBonus('rush')).toBeCloseTo(0.3);
  });

  it('does not consume the stored weapon for a fists run', () => {
    const profile = new Profile(3, null);
    const weapon = profile.equipped;
    const loadout = profile.beginRun(true);
    expect(loadout.weapon).toBe('fists');
    expect(profile.data.stash.some((item) => item.id === weapon?.id)).toBe(true);
  });
});

describe('daily/challenge settlement', () => {
  it('pays the daily bonus once and the challenge bonus every run', () => {
    const profile = new Profile(3, null);
    const daily = createDailyContract(dailySeed(localDateKey()));
    const world = {
      time: 30,
      shotsFired: 0,
      shotsHit: 0,
      peakHeat: 0,
      stealthKills: 0,
      aliveEnemies: 0,
      kills: 0,
      loot: [],
      player: { weapon: 'fists', ammo: 0, clip: 0, attachment: null, variant: null },
      boons: [],
    } as unknown as import('./world').World;
    const first = settleRun(profile, world, { ...daily, challenge: 'glass' }, 'standard');
    expect(first.reward.dailyBonus).toBeGreaterThan(0);
    expect(first.reward.challengeBonus).toBeGreaterThan(0);
    expect(profile.data.daily.cleared).toBe(true);
    const second = settleRun(profile, world, daily, 'standard');
    expect(second.reward.dailyBonus).toBe(0);
  });
});

describe('run history', () => {
  it('records newest-first and caps the local leaderboard', () => {
    const profile = new Profile(3, null);
    for (let i = 0; i < 14; i++) {
      profile.recordRun({
        title: `RUN ${i}`,
        layoutName: 'SECTOR 07',
        time: i + 1,
        kills: i,
        payout: i * 10,
        rank: i % 2 === 0 ? 'A' : 'B',
        success: true,
        daily: false,
        challenge: 'standard',
      });
    }
    expect(profile.data.runHistory).toHaveLength(12);
    expect(profile.data.runHistory[0].title).toBe('RUN 13');
  });
});
