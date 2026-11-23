import { describe, expect, it } from 'vitest';
import { authoredDialogue, dialogueCheckLabel, dialogueCheckMet, FACTIONS } from './lore';
import type { Contract } from './missions';

const contract: Contract = {
  id: 'authored-a01-dead-drop',
  title: 'DEAD DROP',
  layoutId: 'sector07',
  layoutName: 'SECTOR 07',
  objective: 'recover',
  requiredLoot: 2,
  reward: 135,
  risk: 'MED',
  tagline: 'Two caches. One stairwell.',
  faction: 'helix',
  chapter: 1,
  authored: true,
  modifiers: [],
  seed: 42,
};

describe('authored dialogue', () => {
  it('builds a faction beat with attribute, reputation, and safe choices', () => {
    const lines = authoredDialogue(contract);
    expect(lines).toHaveLength(3);
    expect(lines[0].speaker).toBe('KESTREL');
    expect(lines[0].text).toContain('ledger');
    expect(lines[2].choices?.map((choice) => choice.id)).toEqual([
      'attribute',
      'faction',
      'armor',
      'components',
    ]);
  });

  it('checks attributes and reputation against the player build', () => {
    const attributeCheck = { kind: 'attribute' as const, attribute: 'tech' as const, value: 4 };
    expect(dialogueCheckMet(attributeCheck, { body: 3, reflexes: 3, cool: 3, tech: 4 }, { ...profileRep, market: 0, helix: 0, teeth: 0, orbit: 0, sublevel: 0 })).toBe(true);
    expect(dialogueCheckMet(attributeCheck, { body: 3, reflexes: 3, cool: 3, tech: 3 }, { ...profileRep, market: 0, helix: 0, teeth: 0, orbit: 0, sublevel: 0 })).toBe(false);
    expect(dialogueCheckLabel(attributeCheck)).toBe('TECH 4');

    const repCheck = { kind: 'reputation' as const, faction: 'helix' as const, value: 5 };
    expect(dialogueCheckMet(repCheck, { body: 3, reflexes: 3, cool: 3, tech: 3 }, { ...profileRep, market: 0, helix: 5, teeth: 0, orbit: 0, sublevel: 0 })).toBe(true);
    expect(dialogueCheckLabel(repCheck)).toBe(`${FACTIONS.helix.name} 5 REP`);
  });
});

const profileRep = {
  helix: 0,
  teeth: 0,
  orbit: 0,
  sublevel: 0,
  market: 0,
};
