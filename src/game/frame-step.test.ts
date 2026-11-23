import { describe, expect, it, vi } from 'vitest';
import { FIXED_STEP, stepWorld } from './frame-step';

function world(hitstop = 0) {
  return { hitstop, update: vi.fn() };
}

describe('frame step', () => {
  it('runs fixed steps and consumes edges once', () => {
    const w = world();
    const out = stepWorld(w, 0, FIXED_STEP * 2.5, { x: 0, y: 0 }, {
      state: 'playing',
      reducedMotion: false,
    });
    expect(w.update).toHaveBeenCalledTimes(2);
    expect(out.edges).toBe(true);
    expect(out.acc).toBeGreaterThan(0);
  });

  it('runs a slow hitstop step and freezes briefing time', () => {
    const w = world(0.1);
    const out = stepWorld(w, 0, 0.016, { x: 0, y: 0 }, {
      state: 'playing',
      reducedMotion: false,
    });
    expect(w.update).toHaveBeenCalledWith(0.016 * 0.08, { x: 0, y: 0 }, true);
    expect(out.edges).toBe(true);
    expect(
      stepWorld(w, 0, 0.016, { x: 0, y: 0 }, {
        state: 'playing',
        reducedMotion: false,
        briefActive: true,
      }),
    ).toEqual({ acc: 0, edges: true });
  });
});
