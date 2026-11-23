import { describe, expect, it } from 'vitest';
import { Profile, type StorageLike } from './profile';

describe('operator roles', () => {
  it('applies role identity to run modifiers and saves the choice', () => {
    const profile = new Profile(3, null);
    expect(profile.data.role).toBeNull();
    profile.setRole('solo');
    expect(profile.data.role).toBe('solo');
    expect(profile.runMods().armor).toBe(1);

    profile.setRole('netrunner');
    expect(profile.runMods().abilityCd).toBeCloseTo(0.8);
    expect(profile.runMods().hackResist).toBeCloseTo(0.15);
  });
});

describe('street businesses', () => {
  it('buys and upgrades ventures with escalating costs', () => {
    const profile = new Profile(3, null);
    profile.data.money = 5000;
    expect(profile.buyVenture('noodle')).toBeNull();
    expect(profile.data.ventures.noodle).toBe(1);
    expect(profile.data.money).toBe(5000 - 220);
    expect(profile.buyVenture('noodle')).toBeNull();
    expect(profile.data.money).toBe(5000 - 220 - 440);
    profile.data.ventures.noodle = 3;
    expect(profile.buyVenture('noodle')).toBe('MAX LEVEL');
  });

  it('feeds venture income, discounts and components into the profile', () => {
    const profile = new Profile(3, null);
    profile.data.money = 5000;
    const baseWeapon = profile.weaponPrice('pistol');
    const baseCyber = profile.cyberwarePrice('subdermal');
    profile.data.ventures.clinic = 2;
    profile.data.ventures.courier = 2;
    expect(profile.weaponPrice('pistol')).toBeLessThan(baseWeapon);
    expect(profile.cyberwarePrice('subdermal')).toBeLessThan(baseCyber);
    expect(profile.data.ventures.clinic).toBe(2);
    expect(profile.buyVenture('chop')).toBeNull();
    expect(profile.data.ventures.chop).toBe(1);
  });
});

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('role and venture persistence', () => {
  it('round-trips role and business ranks through the save', () => {
    const storage = new MemoryStorage();
    const profile = new Profile(2, storage);
    profile.setRole('fixer');
    profile.data.ventures.noodle = 2;
    profile.data.ventures.haven = 1;
    profile.save();

    const reloaded = new Profile(2, storage);
    expect(reloaded.data.role).toBe('fixer');
    expect(reloaded.data.ventures.noodle).toBe(2);
    expect(reloaded.data.ventures.haven).toBe(1);
  });
});
