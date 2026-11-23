import { describe, expect, it } from 'vitest';
import { edgeMarkerPosition } from './threat-marker';

describe('off-screen threat markers', () => {
  it('hides threats already inside the safe viewport box', () => {
    expect(edgeMarkerPosition(640, 360, 1280, 720).visible).toBe(false);
  });

  it('clamps an off-screen target to the nearest edge', () => {
    const left = edgeMarkerPosition(-100, 360, 1280, 720);
    expect(left.visible).toBe(true);
    expect(left.x).toBeCloseTo(54);
    expect(left.y).toBeCloseTo(360);
    expect(left.angle).toBeCloseTo(Math.PI);

    const top = edgeMarkerPosition(640, -100, 1280, 720);
    expect(top.y).toBeCloseTo(54);
    expect(top.x).toBeCloseTo(640);
  });

  it('clamps corners inside the margin without overshooting', () => {
    const corner = edgeMarkerPosition(2000, 2000, 1280, 720);
    expect(corner.x).toBeLessThanOrEqual(1226);
    expect(corner.y).toBeLessThanOrEqual(666);
    expect(corner.x).toBeGreaterThan(640);
    expect(corner.y).toBeGreaterThan(360);
  });
});
