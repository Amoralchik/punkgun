import { describe, expect, it } from 'vitest';
import { segmentHitsCircle } from './world-geometry';

describe('segmentHitCircle', () => {
  it('detects crossing, endpoint, and miss cases', () => {
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 10, 12)).toBe(true);
    expect(segmentHitsCircle(0, 0, 100, 0, 0, 5, 10)).toBe(true);
    expect(segmentHitsCircle(0, 0, 100, 0, 50, 40, 10)).toBe(false);
    expect(segmentHitsCircle(0, 0, 100, 0, 140, 0, 10)).toBe(false);
  });
});
