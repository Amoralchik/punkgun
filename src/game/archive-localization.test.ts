import { describe, expect, it } from 'vitest';
import archiveRaw from './archive.json?raw';
import { parseArchive } from './archive';

const dossiers = parseArchive(JSON.parse(archiveRaw));

describe('archive localization', () => {
  it('ships a valid archive asset with Spanish bodies for every dossier', () => {
    expect(dossiers.length).toBe(17);
    for (const dossier of dossiers) {
      expect(dossier.bodyEs).toHaveLength(dossier.body.length);
      for (const paragraph of dossier.bodyEs) expect(paragraph.length).toBeGreaterThan(0);
    }
  });

  it('rejects malformed archive payloads', () => {
    expect(() => parseArchive(null)).toThrow('INVALID ARCHIVE');
    expect(() => parseArchive({})).toThrow('INVALID ARCHIVE');
    expect(() => parseArchive({ dossiers: 'nope' })).toThrow('INVALID ARCHIVE');
  });
});
