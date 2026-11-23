import { describe, expect, it } from 'vitest';
import { Profile, priceDrift, stockKey } from './profile';

describe('market stock and price drift', () => {
  it('seeds limited stock and decrements it on purchase', () => {
    const profile = new Profile(2, null);
    profile.data.money = 10_000;
    const key = stockKey('weapon', 'pistol');
    const before = profile.stockFor(key);
    expect(before).toBeGreaterThan(0);
    expect(profile.buyWeapon('pistol')).toBeNull();
    expect(profile.stockFor(key)).toBe(before - 1);

    profile.data.market.stock[key] = 0;
    expect(profile.buyWeapon('pistol')).toBe('OUT OF STOCK');
  });

  it('prices drift no more than 12% and refresh rotates the seed', () => {
    const profile = new Profile(2, null);
    profile.data.money = 500;
    for (const id of Object.keys(profile.data.market.stock)) {
      expect(Math.abs(profile.priceDrift(id))).toBeLessThanOrEqual(0.1200001);
    }
    const oldSeed = profile.data.market.seed;
    const oldStock = { ...profile.data.market.stock };
    expect(profile.refreshMarket(50)).toBeNull();
    expect(profile.data.market.seed).not.toBe(oldSeed);
    expect(profile.data.market.stock).not.toEqual(oldStock);
    expect(profile.data.money).toBe(450);
  });

  it('rotates automatically after two runs', () => {
    const profile = new Profile(2, null);
    const seed = profile.data.market.seed;
    profile.recordAttempt();
    expect(profile.data.market.seed).toBe(seed);
    profile.recordAttempt();
    expect(profile.data.market.seed).not.toBe(seed);
  });

  it('keeps drift deterministic for a seed/key pair', () => {
    expect(priceDrift(42, 'weapon:pistol')).toBe(priceDrift(42, 'weapon:pistol'));
    expect(priceDrift(42, 'weapon:pistol')).not.toBe(priceDrift(43, 'weapon:pistol'));
  });
});
