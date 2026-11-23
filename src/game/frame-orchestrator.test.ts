import { describe, expect, it, vi } from 'vitest';
import { advanceFrame } from './frame-orchestrator';

function world(time = 10) {
  return { time, hitstop: 0, update: vi.fn() };
}

const clock = { acc: 0, briefT: 0, overlayT: 0, overlayShown: false };

describe('frame orchestrator', () => {
  it('freezes the brief and marks overlay readiness', () => {
    const w = world();
    const brief = advanceFrame(w, 0.016, { x: 0, y: 0 }, 'playing', {
      ...clock,
      briefT: 0.01,
    }, false, false);
    expect(brief.briefT).toBe(0);
    expect(brief.briefHidden).toBe(true);
    const dead = advanceFrame(w, 0.8, { x: 0, y: 0 }, 'dead', clock, false, false);
    expect(dead.overlayReady).toBe(true);
    expect(dead.overlayShown).toBe(true);
  });

  it('reports rush expiry and steps as dead', () => {
    const w = world(90);
    const out = advanceFrame(w, 0.016, { x: 0, y: 0 }, 'playing', clock, false, true);
    expect(out.rushExpired).toBe(true);
    expect(w.update).toHaveBeenCalled();
  });
});
