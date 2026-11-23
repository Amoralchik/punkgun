import { describe, expect, it } from 'vitest';
import { CYBERWARE_DEFS, PERK_DEFS } from './progression';

describe('augment localization', () => {
  it('provides Spanish descriptions for every cyberware and perk', () => {
    for (const def of [...CYBERWARE_DEFS, ...PERK_DEFS]) {
      expect(def.descEs.length).toBeGreaterThan(0);
      expect(def.descEs).not.toBe(def.desc);
    }
  });
});
