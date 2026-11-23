import { describe, expect, it } from 'vitest';
import { NARRATION, Narrator, beatForEvent, type NarrationBeat } from './narration';

describe('narration', () => {
  it('has short English and Spanish lines for every beat', () => {
    for (const [beat, lines] of Object.entries(NARRATION)) {
      expect(lines.length, beat).toBeGreaterThan(0);
      for (const l of lines) {
        expect(l.en.length).toBeLessThanOrEqual(90);
        expect(l.es.length).toBeLessThanOrEqual(100);
        expect(l.es).not.toBe(l.en);
      }
    }
  });

  it('respects the cooldown but lets urgent beats cut through', () => {
    const n = new Narrator(1, 12);
    expect(n.line('insertion', 'en')).not.toBeNull();
    expect(n.line('exitOpen', 'en')).toBeNull();
    expect(n.line('overtime', 'en')).not.toBeNull();
    n.tick(13);
    expect(n.line('exitOpen', 'en')).not.toBeNull();
  });

  it('never repeats a line within a run', () => {
    const n = new Narrator(7, 0);
    const seen = new Set<string>();
    for (let i = 0; i < NARRATION.insertion.length; i++) {
      const line = n.line('insertion', 'en')!;
      expect(seen.has(line)).toBe(false);
      seen.add(line);
    }
    expect(n.line('insertion', 'en')).toBeNull();
  });

  it('maps world events to beats', () => {
    const at = (type: string, kills = 0, armor = 1): NarrationBeat | null => beatForEvent(type, { kills, armor });
    expect(at('kill', 1)).toBe('firstKill');
    expect(at('kill', 2)).toBeNull();
    expect(at('armorHit', 0, 1)).toBe('plateLost');
    expect(at('armorHit', 0, 0)).toBe('lastStand');
    expect(at('overtime')).toBe('overtime');
    expect(at('pistol')).toBeNull();
  });
});
