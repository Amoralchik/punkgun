import { describe, expect, it } from 'vitest';
import { setLocale } from '../core/i18n';
import { epilogueConsequences } from './endings';

describe('epilogue consequences', () => {
  it('adds highest-faction, role and lifepath lines', () => {
    const lines = epilogueConsequences({
      reputation: { sublevel: 7, helix: 2, teeth: 0, orbit: 0, market: 0 },
      role: 'netrunner',
      lifepath: 'street',
    });
    expect(lines[0]).toContain('Sublevel');
    expect(lines[1]).toContain('ghost');
    expect(lines[2]).toContain('block');
  });

  it('localizes consequence lines', () => {
    setLocale('es');
    try {
      const lines = epilogueConsequences({
        reputation: { market: 6 },
        role: 'fixer',
        lifepath: 'nomad',
      });
      expect(lines[0]).toContain('mercado');
      expect(lines[1]).toContain('intereses');
      expect(lines[2]).toContain('convoy');
    } finally {
      setLocale('en');
    }
  });
});
