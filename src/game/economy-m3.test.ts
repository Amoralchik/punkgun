import { describe, expect, it } from 'vitest';
import { EMPTY_VENTURES } from './ventures';
import { Profile } from './profile';
import { rollVentureEvent } from './venture-events';

describe('safehouse room upgrades', () => {
  it('buys ranks, raises armor/supply, and discounts the market', () => {
    const profile = new Profile(3, null);
    profile.data.money = 10_000;
    expect(profile.buyRoomUpgrade('window')).toBeNull();
    expect(profile.buyRoomUpgrade('window')).toBeNull();
    expect(profile.buyRoomUpgrade('window')).toBeNull();
    expect(profile.data.room.window).toBe(3);
    expect(profile.runMods().armor).toBeGreaterThanOrEqual(1);
    expect(profile.buyRoomUpgrade('window')).toBe('MAX LEVEL');

    expect(profile.buyRoomUpgrade('medbay')).toBeNull();
    expect(profile.buyRoomUpgrade('medbay')).toBeNull();
    expect(profile.buyRoomUpgrade('medbay')).toBeNull();
    expect(profile.maxSupply()).toBe(3);
    expect(profile.buyRoomUpgrade('server')).toBeNull();
    expect(profile.marketRefreshCost()).toBe(40);
    expect(profile.boardRefreshCost()).toBe(60);
  });
});

describe('exchange', () => {
  it('prices deterministically and buys/sells shares', () => {
    const profile = new Profile(3, null);
    profile.data.money = 10_000;
    profile.ensureExchange();
    const price = profile.exchangePrice('helix');
    expect(profile.exchangePrice('helix')).toBe(price);
    expect(profile.buyShares('helix', 2)).toBeNull();
    expect(profile.exchangeHoldings('helix')).toBe(2);
    expect(profile.exchangeDividend()).toBe(6);
    expect(profile.sellShares('helix', 1)).toBeNull();
    expect(profile.exchangeHoldings('helix')).toBe(1);
    expect(profile.sellShares('helix', 2)).toBe('INVALID ORDER');
  });

  it('advances the market day', () => {
    const profile = new Profile(3, null);
    const day = profile.data.exchange.day;
    profile.advanceExchange();
    expect(profile.data.exchange.day).toBe(day + 1);
  });
});

describe('venture events', () => {
  it('gates events on business rank', () => {
    expect(rollVentureEvent(10, 99, { ...EMPTY_VENTURES })).toBeNull();
  });

  it('resolves a pending event with rank and reputation effects', () => {
    const profile = new Profile(3, null);
    profile.data.money = 1000;
    profile.data.ventures.noodle = 2;
    profile.data.pendingVentureEvent = 'noodle-inspection';
    expect(profile.resolveVentureEvent('refuse')).toBeNull();
    expect(profile.data.ventures.noodle).toBe(1);
    expect(profile.data.reputation.market).toBe(1);
    expect(profile.pendingVentureEvent()).toBeNull();
    expect(profile.resolveVentureEvent('refuse')).toBe('NO ACTIVE EVENT');
  });
});

describe('insurance', () => {
  it('returns an insured weapon with no ammo after death claim', () => {
    const profile = new Profile(3, null);
    profile.data.money = 1000;
    expect(profile.buyInsurance()).toBeNull();
    expect(profile.data.insurance).not.toBeNull();
    const loadout = profile.beginRun();
    expect(loadout.insured).toBe(true);
    const returned = profile.claimInsurance();
    expect(returned?.weapon).toBe('pistol');
    expect(returned?.ammo).toBe(0);
    expect(profile.data.insurance).toBeNull();
    expect(profile.claimInsurance()).toBeNull();
  });
});

describe('faction broker', () => {
  it('requires standing and adds faction hardware to storage', () => {
    const profile = new Profile(3, null);
    profile.data.money = 5000;
    expect(profile.buyFactionOffer('helix-kensei')).toContain('REQUIRES');
    profile.data.reputation.helix = 5;
    expect(profile.buyFactionOffer('helix-kensei')).toBeNull();
    expect(profile.data.stash.some((item) => item.variant === 'kensei')).toBe(true);
  });
});
