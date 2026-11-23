import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../core/audio';
import type { WorldEvent } from './world-types';
import { playWorldEventAudio } from './world-event-audio';

function audio() {
  return {
    shot: vi.fn(),
    shieldHit: vi.fn(),
    enemyShot: vi.fn(),
    alert: vi.fn(),
    explosion: vi.fn(),
  } as unknown as AudioEngine;
}

const event = (type: string): WorldEvent => ({ type, x: 0, y: 0, angle: 0 });

describe('world event audio', () => {
  it('handles audio-only events', () => {
    const a = audio();
    expect(playWorldEventAudio(event('pistol'), a)).toBe(true);
    expect(playWorldEventAudio(event('cameraBroken'), a)).toBe(true);
    expect(playWorldEventAudio(event('operatorDeploy'), a)).toBe(true);
    expect(playWorldEventAudio(event('bossShock'), a)).toBe(true);
    expect(playWorldEventAudio(event('kill'), a)).toBe(false);
    expect(a.alert).toHaveBeenCalled();
  });
});
