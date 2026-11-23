import { describe, expect, it } from 'vitest';
import { Profile, type StorageLike } from './profile';
import { EMPTY_ATTRIBUTES } from './attributes';
import { EMPTY_CYBERWARE, EMPTY_PERKS, computeMods } from './progression';

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe('capstone perks', () => {
  it('enforces prerequisites and mutual exclusion', () => {
    const profile = new Profile(3, new MemoryStorage());
    profile.data.perkPoints = 4;
    expect(profile.perkBlockReason('ghostProtocol')).toContain('REQUIRES GHOST');
    expect(profile.trainPerk('ghost')).toBeNull();
    expect(profile.trainPerk('ghostProtocol')).toBeNull();
    expect(profile.trainPerk('warMachine')).toContain('REQUIRES JUGGERNAUT');
    profile.data.perks.juggernaut = 1;
    expect(profile.trainPerk('warMachine')).toContain('EXCLUSIVE WITH GHOST PROTOCOL');
  });

  it('applies capstone stats', () => {
    const ghost = computeMods(
      EMPTY_CYBERWARE,
      { ...EMPTY_PERKS, ghostProtocol: 1 },
      EMPTY_ATTRIBUTES,
    );
    const war = computeMods(
      EMPTY_CYBERWARE,
      { ...EMPTY_PERKS, warMachine: 1 },
      EMPTY_ATTRIBUTES,
    );
    const base = computeMods(EMPTY_CYBERWARE, EMPTY_PERKS, EMPTY_ATTRIBUTES);
    expect(ghost.vision).toBeLessThan(base.vision);
    expect(war.armor).toBe(base.armor + 1);
    expect(war.spread).toBeLessThan(base.spread);
  });
});
