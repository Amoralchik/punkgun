import { describe, expect, it } from 'vitest';
import {
  CYBERWARE_DEFS,
  EMPTY_CYBERWARE,
  EMPTY_PERKS,
  PERK_DEFS,
  baseMods,
  computeMods,
  humanityCapacity,
  humanityStage,
  humanityUsed,
} from './progression';
import { Profile } from './profile';
import { GUN_IDS, NAMED_WEAPONS, WEAPONS } from './weapons';
import { WEAPON_ECONOMY } from './economy';

describe('expanded build content', () => {
  it('ships the promised cyberware/perk/weapon counts with valid ranks', () => {
    expect(CYBERWARE_DEFS).toHaveLength(22);
    expect(PERK_DEFS).toHaveLength(19);
    expect(GUN_IDS).toHaveLength(12);
    expect(NAMED_WEAPONS).toHaveLength(8);
    for (const def of CYBERWARE_DEFS) {
      expect(def.costs).toHaveLength(def.maxRank);
      expect(def.humanity).toHaveLength(def.maxRank);
    }
    for (const id of GUN_IDS) {
      expect(WEAPONS[id].melee).toBe(false);
      expect(WEAPON_ECONOMY[id].price).toBeGreaterThan(0);
      expect(WEAPONS[id].mag).toBeGreaterThan(0);
    }
  });

  it('derives neural capacity, load and strain stages', () => {
    const attrs = { body: 3, reflexes: 3, cool: 3, tech: 3 };
    expect(humanityCapacity(attrs, 1)).toBe(24);
    expect(humanityCapacity({ ...attrs, body: 8 }, 5)).toBe(52);

    const ware = { ...EMPTY_CYBERWARE, subdermal: 3, heart: 1 };
    expect(humanityUsed(ware)).toBe(20);
    expect(humanityStage(10, 16)).toBe(1);
    expect(humanityStage(14, 16)).toBe(2);
    expect(humanityStage(16, 16)).toBe(3);
  });

  it('turns new cyberware and perks into concrete run modifiers', () => {
    const ware = {
      ...EMPTY_CYBERWARE,
      reloadTuner: 2,
      targeting: 2,
      microgenerator: 2,
      berserk: 1,
      overclock: 2,
      cyberdeck: 1,
      kerenzikov: 2,
      lynx: 2,
      adrenaline: 2,
      neuralLink: 2,
    };
    const perks = {
      ...EMPTY_PERKS,
      executioner: 3,
      marksman: 2,
      shadow: 2,
      gunsmith: 2,
      vulture: 2,
      demolitionist: 2,
      bladeDancer: 1,
    };
    const mods = computeMods(ware, perks, { body: 3, reflexes: 3, cool: 3, tech: 3 });
    expect(mods.reload).toBeCloseTo(0.4);
    expect(mods.pierce).toBe(2);
    expect(mods.emp).toBe(2);
    expect(mods.berserk).toBe(1);
    expect(mods.overclock).toBe(2);
    expect(mods.deck).toBe(1);
    expect(mods.kerenzikov).toBe(2);
    expect(mods.heatMult).toBeCloseTo(0.6);
    expect(mods.killSpeed).toBeCloseTo(0.16);
    expect(mods.precisionSpread).toBeCloseTo(0.6);
    expect(mods.takedownReach).toBeCloseTo(1.4);
    expect(mods.lootMult).toBeCloseTo(1.16);
    expect(mods.grenadeRadius).toBeCloseTo(1.3);
    expect(mods.meleeKillReset).toBe(1);
    expect(mods.abilityCd).toBeCloseTo(0.7);
  });

  it('applies critical strain as an armor/vision penalty', () => {
    const ware = { ...EMPTY_CYBERWARE, subdermal: 2 };
    const stable = computeMods(ware, EMPTY_PERKS, undefined, 0);
    const critical = computeMods(ware, EMPTY_PERKS, undefined, 2);
    expect(stable.armor).toBe(2);
    expect(critical.armor).toBe(1);
    expect(critical.vision).toBeLessThan(stable.vision);
    expect(critical.abilityCd).toBeGreaterThan(stable.abilityCd);
  });
});

describe('ripperdoc risk', () => {
  it('blocks installs over capacity and rejects risky installs without advancing rank', () => {
    const profile = new Profile(1, null);
    profile.data.money = 100_000;
    profile.data.attributes.body = 8;
    profile.data.level = 10;
    profile.data.cyberware.subdermal = 2;
    profile.data.cyberware.heart = 1;
    profile.data.cyberware.painEditor = 1;
    profile.data.cyberware.biomonitor = 2;
    profile.data.cyberware.reflex = 2;

    expect(profile.humanityUsed).toBe(37);
    expect(profile.humanityMax).toBe(62);
    expect(profile.cyberwareRisk('berserk')).toBeGreaterThan(0);

    const before = profile.data.money;
    const error = profile.installCyberware('berserk', () => 0);
    expect(error).toContain('REJECTED');
    expect(profile.data.cyberware.berserk).toBe(0);
    expect(profile.data.money).toBeLessThan(before);

    profile.data.cyberware.microgenerator = 2;
    profile.data.cyberware.cyberdeck = 2;
    profile.data.cyberware.neuralLink = 2;
    expect(profile.installCyberware('berserk')).toContain('CAPACITY');
  });
});

describe('modifier defaults', () => {
  it('leaves the base build unchanged', () => {
    expect(baseMods()).toMatchObject({
      armor: 0,
      speed: 1,
      reload: 1,
      abilityCd: 1,
      pierce: 0,
      humanityStage: 0,
      dashCd: 1,
      comboWindow: 0,
    });
  });

  it('turns the new mobility perks into run modifiers', () => {
    const mods = computeMods(
      EMPTY_CYBERWARE,
      { ...EMPTY_PERKS, slipstream: 2, chainKiller: 2 },
    );
    expect(mods.dashCd).toBeCloseTo(0.8);
    expect(mods.dashInvuln).toBeCloseTo(0.04);
    expect(mods.comboWindow).toBe(1);
  });
});
