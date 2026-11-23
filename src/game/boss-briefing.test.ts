import { describe, expect, it } from 'vitest';
import { BOSSES, BOSS_ORDER } from './bosses';
import { BOSS_DIALOGUE, bossBriefing, localizeDialogue } from './lore';

describe('boss briefings', () => {
  it('gives every non-psycho boss unique briefing lines', () => {
    for (const id of BOSS_ORDER) {
      const lines = bossBriefing(id);
      expect(lines.length).toBeGreaterThan(0);
      if (id !== 'psycho') {
        expect(lines).not.toBe(BOSS_DIALOGUE);
        expect(lines).toHaveLength(3);
        for (const line of lines) expect(line.textEs?.length ?? 0).toBeGreaterThan(0);
      }
    }
    expect(bossBriefing('psycho')).toBe(BOSS_DIALOGUE);
    expect(bossBriefing(undefined)).toBe(BOSS_DIALOGUE);
  });

  it('localizes each boss briefing', () => {
    for (const id of BOSS_ORDER) {
      const es = localizeDialogue(bossBriefing(id), 'es');
      expect(es.every((line) => line.text.length > 0)).toBe(true);
    }
    expect(BOSSES.board.name).toBe('THE BOARD');
  });
});
