import { describe, expect, it } from 'vitest';
import { ATTACHMENTS } from './attachments';
import {
  LEGACY_SAVE_KEY,
  Profile,
  SAVE_KEY,
  SAVE_VERSION,
  backupKey,
  corruptKey,
  encodeSave,
  listSaveSlots,
  slotKey,
  unwrapSave,
  type ProfileData,
  type StorageLike,
} from './profile';

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fresh(storage: MemoryStorage): Profile {
  return new Profile(1, storage);
}

describe('augment previews', () => {
  it('computes the next cyberware and perk deltas from the current build', () => {
    const profile = fresh(new MemoryStorage());
    const cyber = profile.previewCyberware('subdermal');
    expect(cyber).not.toBeNull();
    expect(cyber!.after.armor).toBe(cyber!.before.armor + 1);
    expect(cyber!.load).toBeGreaterThan(0);

    const perk = profile.previewPerk('sprinter');
    expect(perk).not.toBeNull();
    expect(perk!.after.speed).toBeGreaterThan(perk!.before.speed);
  });
});

describe('save slots', () => {
  it('starts fresh, writes a v2 envelope and reloads it', () => {
    const storage = new MemoryStorage();
    const profile = fresh(storage);
    expect(profile.slot).toBe(1);
    expect(profile.data.money).toBe(120);
    expect(profile.data.stash).toHaveLength(1);

    profile.data.money = 4321;
    profile.save();

    const envelope = JSON.parse(storage.getItem(SAVE_KEY) ?? 'null') as {
      version: number;
      profile: { money: number };
    };
    expect(envelope.version).toBe(SAVE_VERSION);
    expect(envelope.profile.money).toBe(4321);
    expect(fresh(storage).data.money).toBe(4321);
  });

  it('keeps slots isolated', () => {
    const storage = new MemoryStorage();
    const one = new Profile(1, storage);
    one.data.money = 500;
    one.save();

    const two = new Profile(2, storage);
    expect(two.data.money).toBe(120);
    two.data.money = 900;
    two.save();

    expect(fresh(storage).data.money).toBe(500);
    expect(new Profile(2, storage).data.money).toBe(900);
    expect(slotKey(2)).toBe(`${SAVE_KEY}.slot.2`);
    expect(slotKey(99)).toBe(`${SAVE_KEY}.slot.3`);
  });

  it('copies and switches slots', () => {
    const storage = new MemoryStorage();
    const one = new Profile(1, storage);
    one.data.money = 777;
    one.save();
    expect(one.copyToSlot(3)).toBe(true);
    expect(new Profile(3, storage).data.money).toBe(777);

    one.loadSlot(2);
    expect(one.slot).toBe(2);
    expect(one.data.money).toBe(120);
    one.data.money = 222;
    one.save();
    expect(new Profile(2, storage).data.money).toBe(222);
  });

  it('lists metadata without migrating', () => {
    const storage = new MemoryStorage();
    const source = fresh(storage);
    const legacy = clone(source.data);
    legacy.money = 777;
    storage.clear();
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(legacy));

    const before = listSaveSlots(storage);
    expect(before[0]).toMatchObject({ slot: 1, exists: true, version: 1, money: 777 });
    expect(before[1].exists).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(Profile.listSlots(storage)).toEqual(before);
  });
});

describe('save recovery', () => {
  it('restores the last known-good backup when the primary slot is corrupt', () => {
    const storage = new MemoryStorage();
    const profile = fresh(storage);
    profile.data.money = 500;
    profile.save();
    profile.data.money = 600;
    profile.save();
    expect(JSON.parse(storage.getItem(backupKey(1)) ?? 'null').profile.money).toBe(500);

    storage.setItem(SAVE_KEY, '{ damaged');
    const recovered = fresh(storage);

    expect(recovered.data.money).toBe(500);
    expect(recovered.lastRecovery).toEqual({
      source: 'backup',
      quarantinedKey: corruptKey(1),
      primaryCorrupt: true,
    });
    expect(recovered.recoveryNote()).toContain('RECOVERED');
    expect(storage.getItem(corruptKey(1))).toBe('{ damaged');
    expect(JSON.parse(storage.getItem(SAVE_KEY) ?? 'null').version).toBe(SAVE_VERSION);
  });

  it('quarantines a corrupt save with no backup instead of losing the evidence', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, profile: 'broken' }));

    const profile = fresh(storage);

    expect(profile.data.money).toBe(120);
    expect(profile.lastRecovery?.primaryCorrupt).toBe(true);
    expect(profile.lastRecovery?.source).toBe('quarantine');
    expect(storage.getItem(corruptKey(1))).not.toBeNull();
    expect(profile.recoveryNote()).toContain('QUARANTINED');
  });

  it('keeps the previous payload when importing a replacement save', () => {
    const storage = new MemoryStorage();
    const profile = fresh(storage);
    profile.data.money = 900;
    profile.save();

    const incoming = encodeSave({ ...profile.data, money: 42 });
    expect(profile.importSave(incoming)).toBeNull();
    expect(profile.data.money).toBe(42);

    expect(JSON.parse(storage.getItem(backupKey(1)) ?? 'null').profile.money).toBe(900);
    storage.setItem(SAVE_KEY, 'nope');
    const recovered = fresh(storage);
    expect(recovered.data.money).toBe(900);
  });
});

describe('v1 migration and v2 validation', () => {
  it('migrates the legacy raw profile into v2 and preserves progress', () => {
    const storage = new MemoryStorage();
    const source = fresh(storage);
    source.data.money = 777;
    source.data.level = 4;
    source.data.runs = 9;
    const legacy = clone(source.data);
    storage.clear();
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(legacy));

    const migrated = fresh(storage);
    expect(migrated.data.money).toBe(777);
    expect(migrated.data.level).toBe(4);
    expect(migrated.data.runs).toBe(9);

    const envelope = JSON.parse(storage.getItem(SAVE_KEY) ?? 'null') as {
      version: number;
      profile: ProfileData;
    };
    expect(envelope.version).toBe(SAVE_VERSION);
    expect(envelope.profile.money).toBe(777);
    expect(envelope.profile.level).toBe(4);
    expect(storage.getItem(LEGACY_SAVE_KEY)).not.toBeNull();
  });

  it('sanitizes corrupt values and invalid stash entries', () => {
    const storage = new MemoryStorage();
    const base = fresh(storage).data;
    const raw = clone(base) as unknown as Record<string, unknown>;
    raw.money = -5;
    raw.level = 0;
    raw.equippedId = 'missing';
    raw.contraband = { shard: -3, chip: 'x' };
    raw.components = { scrap: -2, circuit: 1.8 };
    raw.supplyType = 'bogus';
    raw.supplyCharges = 999;
    raw.cyberware = { subdermal: 99 };
    raw.perks = { sprinter: 99 };
    raw.attributes = { body: 99, reflexes: -1, cool: 'x', tech: 4 };
    raw.stash = [
      {
        id: 'kept',
        weapon: 'pistol',
        ammo: -4,
        attachment: 'bogus',
        variant: 'bogus',
        cellX: 1.7,
        cellY: -2,
        turned: 1,
      },
      { id: 'fists', weapon: 'fists', ammo: 0, cellX: 0, cellY: 0, turned: false },
      { id: 'bad', weapon: 'railgunX', ammo: 4, cellX: 0, cellY: 0, turned: false },
      { id: 42, weapon: 'pistol', ammo: 4, cellX: 0, cellY: 0, turned: false },
    ];

    storage.clear();
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(raw));
    const profile = fresh(storage);

    expect(profile.data.money).toBe(0);
    expect(profile.data.level).toBe(1);
    expect(profile.data.equippedId).toBeNull();
    expect(profile.data.stash).toHaveLength(1);
    expect(profile.data.stash[0]).toMatchObject({
      id: 'kept',
      weapon: 'pistol',
      ammo: 0,
      attachment: null,
      variant: null,
    });
    expect(profile.data.contraband.shard).toBe(0);
    expect(profile.data.contraband.chip).toBe(0);
    expect(profile.data.components.scrap).toBe(0);
    expect(profile.data.components.circuit).toBe(1);
    expect(profile.data.supplyType).toBeNull();
    expect(profile.data.supplyCharges).toBe(0);
    expect(profile.data.cyberware.subdermal).toBe(3);
    expect(profile.data.perks.sprinter).toBe(3);
    expect(profile.data.attributes.body).toBe(8);
    expect(profile.data.attributes.reflexes).toBe(3);
  });

  it('sanitizes non-finite run counters and preserves overflow extraction', () => {
    const storage = new MemoryStorage();
    const base = fresh(storage).data;
    const raw = clone(base) as unknown as Record<string, unknown>;
    raw.runs = 'NaN';
    raw.clears = null;
    storage.clear();
    storage.setItem(LEGACY_SAVE_KEY, JSON.stringify(raw));
    const profile = fresh(storage);
    expect(profile.data.runs).toBe(0);
    expect(profile.data.clears).toBe(0);

    profile.data.stash = Array.from({ length: 60 }, (_, index) => ({
      id: `filled-${index}`,
      weapon: 'bat' as const,
      ammo: 0,
      attachment: null,
      variant: null,
      cellX: index % 10,
      cellY: Math.floor(index / 10),
      turned: false,
    }));
    const returned = profile.bankClear(30, 10, {
      weapon: 'pistol',
      ammo: 0,
      attachment: null,
      variant: null,
    });
    expect(returned).not.toBeNull();
    expect(returned?.cellX).toBe(-1);
    expect(returned?.cellY).toBe(-1);
    expect(profile.data.stash).toContainEqual(returned);
  });

  it('rejects future save versions instead of loading them', () => {
    const storage = new MemoryStorage();
    const source = fresh(storage);
    const envelope = JSON.parse(encodeSave(source.data)) as {
      version: number;
      profile: ProfileData;
    };
    envelope.version = SAVE_VERSION + 1;
    envelope.profile.money = 999999;
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));

    const profile = fresh(storage);
    expect(profile.data.money).toBe(120);
    expect(unwrapSave({ version: 3, profile: {} })).toBeNull();
    expect(unwrapSave({ nonsense: true })).toBeNull();
  });

  it('accepts export/import round trips and rejects invalid imports', () => {
    const storage = new MemoryStorage();
    const source = fresh(storage);
    source.data.money = 321;
    source.save();

    const raw = source.exportSave();
    expect(JSON.parse(raw).version).toBe(SAVE_VERSION);

    const target = new Profile(2, storage);
    expect(target.importSave(raw)).toBeNull();
    expect(target.slot).toBe(2);
    expect(target.data.money).toBe(321);

    const before = target.data.money;
    expect(target.importSave('{not json')).toBe('INVALID SAVE');
    expect(target.importSave(JSON.stringify({ version: 99 }))).toBe('INVALID SAVE');
    expect(target.data.money).toBe(before);
  });
});

describe('profile combat economy', () => {
  it('applies faction standing to clinic, workbench and supply prices', () => {
    const profile = new Profile(1, new MemoryStorage());
    const baseCyberware = profile.cyberwarePrice('subdermal');
    const baseAttachment = profile.attachmentPrice(ATTACHMENTS[0].id);
    const baseSupply = profile.supplyPrice('stim');

    profile.data.reputation.helix = 9;
    profile.data.reputation.market = 9;
    profile.data.money = 5000;

    expect(profile.cyberwarePrice('subdermal')).toBeLessThan(baseCyberware);
    expect(profile.attachmentPrice(ATTACHMENTS[0].id)).toBeLessThan(baseAttachment);
    expect(profile.supplyPrice('stim')).toBeLessThan(baseSupply);

    const start = profile.data.money;
    const cyberPrice = profile.cyberwarePrice('subdermal');
    expect(profile.installCyberware('subdermal')).toBeNull();
    expect(profile.data.money).toBe(start - cyberPrice);

    const gun = profile.equipped;
    expect(gun).toBeDefined();
    const attachmentPrice = profile.attachmentPrice(ATTACHMENTS[0].id);
    expect(profile.installAttachment(gun!.id, ATTACHMENTS[0].id)).toBeNull();
    expect(profile.data.money).toBe(start - cyberPrice - attachmentPrice);

    const supplyPrice = profile.supplyPrice('stim');
    expect(profile.buySupply('stim')).toBeNull();
    expect(profile.data.money).toBe(start - cyberPrice - attachmentPrice - supplyPrice);
  });

  it('buys, equips, consumes and extracts a weapon through save cycles', () => {
    const storage = new MemoryStorage();
    const profile = new Profile(1, storage);
    profile.data.money = 5000;
    profile.save();

    expect(profile.buyWeapon('smg')).toBeNull();
    const smg = profile.data.stash.find((item) => item.weapon === 'smg');
    expect(smg).toBeDefined();
    expect(profile.equip(smg!.id)).toBeNull();

    const loadout = profile.beginRun();
    expect(loadout.weapon).toBe('smg');
    expect(profile.data.stash.some((item) => item.id === smg!.id)).toBe(false);
    expect(fresh(storage).data.runs).toBe(1);

    const returned = profile.bankClear(42.5, 300, {
      weapon: loadout.weapon,
      ammo: loadout.ammo,
      attachment: loadout.attachment,
      variant: loadout.variant,
    });
    expect(returned?.weapon).toBe('smg');
    expect(profile.data.clears).toBe(1);
    expect(profile.data.bestTime).toBe(42.5);
    expect(new Profile(1, storage).data.money).toBe(profile.data.money);
  });
});

describe('loadout presets', () => {
  it('saves and re-equips a stash fit without duplicating gear', () => {
    const profile = new Profile(2, null);
    profile.data.money = 5000;
    expect(profile.buyWeapon('smg')).toBeNull();
    const smg = profile.data.stash.find((item) => item.weapon === 'smg');
    expect(smg).toBeDefined();
    expect(profile.equip(smg!.id)).toBeNull();
    const stashSize = profile.data.stash.length;

    expect(profile.savePreset(0)).toBeNull();
    expect(profile.data.presets[0]).toMatchObject({ weapon: 'smg' });
    expect(profile.data.stash.length).toBe(stashSize);

    profile.data.equippedId = null;
    expect(profile.applyPreset(0)).toBeNull();
    expect(profile.equipped?.weapon).toBe('smg');
    expect(profile.data.stash.length).toBe(stashSize);

    expect(profile.applyPreset(1)).toBe('EMPTY PRESET');
    profile.clearPreset(0);
    expect(profile.data.presets[0]).toBeNull();
  });
});
