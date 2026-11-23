import { describe, expect, it } from 'vitest';
import { ATTACHMENTS, attachmentMag, attachmentPellets } from './attachments';

describe('attachment effects', () => {
  it('expands magazines and pellets', () => {
    expect(attachmentMag('pistol', null)).toBe(6);
    expect(attachmentMag('pistol', 'extended')).toBe(9);
    expect(attachmentMag('pistol', 'drum')).toBe(12);
    expect(attachmentPellets('shotgun', null)).toBe(7);
    expect(attachmentPellets('shotgun', 'flechette')).toBe(9);
    expect(attachmentPellets('pistol', 'flechette')).toBe(3);
  });

  it('ships eleven attachments with the expected modifier surface', () => {
    expect(ATTACHMENTS).toHaveLength(11);
    expect(new Set(ATTACHMENTS.map((def) => def.id)).size).toBe(11);
    expect(ATTACHMENTS.filter((def) => def.spreadMult !== undefined).length).toBeGreaterThan(3);
    expect(ATTACHMENTS.filter((def) => def.reloadMult !== undefined).length).toBeGreaterThan(1);
  });
});
