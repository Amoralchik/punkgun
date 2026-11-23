import { describe, expect, it } from 'vitest';
import { DOSSIERS } from './lore';

describe('archive localization', () => {
  it('provides Spanish bodies for every dossier', () => {
    for (const dossier of DOSSIERS) {
      expect(dossier.bodyEs).toHaveLength(dossier.body.length);
      for (const paragraph of dossier.bodyEs) expect(paragraph.length).toBeGreaterThan(0);
    }
  });
});
