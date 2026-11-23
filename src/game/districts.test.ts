import { describe, expect, it } from 'vitest';
import { weatherForLevel } from '../render/weather';
import { DISTRICTS, districtFor } from './districts';
import { LAYOUTS } from './map';

describe('district presentation data', () => {
  it('defines every layout with valid colors and weather', () => {
    for (const layout of LAYOUTS) {
      const def = districtFor(layout.id);
      expect(DISTRICTS[layout.id]).toBe(def);
      expect(def.floor.length).toBeGreaterThan(0);
      expect(def.neon.length).toBeGreaterThan(0);
      expect(def.wall).toMatch(/^#/);
      expect(weatherForLevel(layout.id)).toBe(def.weather);
    }
  });

  it('gives the new districts their own palettes', () => {
    expect(districtFor('rooftops').floor).toEqual(['#101820', '#0c1218', '#15232c']);
    expect(districtFor('neon_alley').neon).toContain('#ff2f8e');
    expect(districtFor('safehouse').weather).toBe('none');
  });
});
