import { describe, expect, it } from 'vitest';
import { DialogueSession } from './dialogue-session';
import { availableEndings, endingUnlocked } from './endings';
import { authoredDialogue, BOSS_DIALOGUE, dialogueCheckMet, dossierUnlocked, DOSSIERS } from './lore';
import { Profile } from './profile';
import type { Contract } from './missions';

const contract: Contract = {
  id: 'authored-test',
  title: 'TEST',
  layoutId: 'sector07',
  layoutName: 'SECTOR 07',
  objective: 'purge',
  requiredLoot: 0,
  reward: 100,
  risk: 'MED',
  tagline: 'Test.',
  faction: 'helix',
  chapter: 1,
  authored: true,
  modifiers: [],
  seed: 1,
};

describe('lifepaths', () => {
  it('sets starting money, standing and gear', () => {
    const street = new Profile(3, null);
    street.startNewGame('street');
    expect(street.data.lifepath).toBe('street');
    expect(street.data.money).toBe(60);
    expect(street.data.reputation.teeth).toBe(2);
    expect(street.equipped?.weapon).toBe('bat');

    const corp = new Profile(3, null);
    corp.startNewGame('corp');
    expect(corp.data.money).toBe(300);
    expect(corp.data.reputation.helix).toBe(2);
    expect(corp.equipped?.weapon).toBe('pistol');

    const nomad = new Profile(3, null);
    nomad.startNewGame('nomad');
    expect(nomad.data.reputation.orbit).toBe(2);
    expect(nomad.equipped?.weapon).toBe('revolver');
  });
});

describe('story checks and endings', () => {
  it('adds role and lifepath choices and checks them', () => {
    const lines = authoredDialogue(contract, {}, 'netrunner', 'street');
    const ids = lines[2].choices?.map((choice) => choice.id) ?? [];
    expect(ids).toContain('role-netrunner');
    expect(ids).toContain('path-street');
    expect(
      dialogueCheckMet(
        { kind: 'role', role: 'netrunner' },
        { body: 3, reflexes: 3, cool: 3, tech: 3 },
        { helix: 0, teeth: 0, orbit: 0, sublevel: 0, market: 0 },
        'netrunner',
        'street',
      ),
    ).toBe(true);
    expect(
      dialogueCheckMet(
        { kind: 'lifepath', lifepath: 'corp' },
        { body: 3, reflexes: 3, cool: 3, tech: 3 },
        { helix: 0, teeth: 0, orbit: 0, sublevel: 0, market: 0 },
        'netrunner',
        'street',
      ),
    ).toBe(false);
  });

  it('unlocks the secret ending only for the REMEMBER choice', () => {
    const eraseProfile = new Profile(3, null);
    const eraseSession = new DialogueSession(BOSS_DIALOGUE);
    eraseSession.index = BOSS_DIALOGUE.length - 1;
    expect(eraseSession.choose('sublevel-erase', eraseProfile, 'sublevel').ok).toBe(true);
    expect(endingUnlocked('remember', eraseProfile.data)).toBe(false);

    const rememberProfile = new Profile(3, null);
    const rememberSession = new DialogueSession(BOSS_DIALOGUE);
    rememberSession.index = BOSS_DIALOGUE.length - 1;
    expect(
      rememberSession.choose('sublevel-remember', rememberProfile, 'sublevel').ok,
    ).toBe(true);
    expect(endingUnlocked('remember', rememberProfile.data)).toBe(true);
    expect(availableEndings(rememberProfile.data)).toContain('remember');
  });

  it('preserves the ending archive across a new game', () => {
    const profile = new Profile(3, null);
    profile.recordEnding('broadcast');
    profile.startNewGame('corp');
    expect(profile.data.endingsSeen).toContain('broadcast');
    const dossier = DOSSIERS.find((entry) => entry.id === 'ending-broadcast');
    expect(dossier).toBeDefined();
    expect(
      dossierUnlocked(dossier!, {
        clears: profile.data.clears,
        level: profile.data.level,
        bossCleared: false,
        finalCleared: false,
        ending: profile.data.ending,
        endingsSeen: profile.data.endingsSeen,
      }),
    ).toBe(true);
  });

  it('starts NG+ with the build but a fresh campaign', () => {
    const profile = new Profile(3, null);
    profile.data.finalCleared = true;
    profile.data.level = 7;
    profile.data.cyberware.subdermal = 2;
    profile.data.story['faction:helix'] = 'attribute';
    profile.data.bossesCleared.psycho = true;
    profile.data.money = 900;
    profile.startNewGame('corp', true);
    expect(profile.data.ngPlus).toBe(1);
    expect(profile.data.level).toBe(7);
    expect(profile.data.cyberware.subdermal).toBe(2);
    expect(profile.data.money).toBe(900);
    expect(profile.data.finalCleared).toBe(false);
    expect(profile.data.story).toEqual({});
    expect(profile.data.bossesCleared.psycho).toBe(false);
  });

  it('applies teeth sell and sublevel clinic standing', () => {
    const profile = new Profile(3, null);
    const item = profile.equipped!;
    const base = profile.sellValue(item);
    profile.data.reputation.teeth = 5;
    expect(profile.sellValue(item)).toBeGreaterThan(base);
    const cyber = profile.cyberwarePrice('subdermal');
    profile.data.reputation.sublevel = 5;
    expect(profile.cyberwarePrice('subdermal')).toBeLessThan(cyber);
  });
});
