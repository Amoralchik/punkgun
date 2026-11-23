import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../core/audio';
import type { Hud } from '../ui/hud';
import type { WorldEvent } from './world-types';
import { WorldEventHud } from './world-event-hud';

const event = (type: string): WorldEvent => ({ type, x: 0, y: 0, angle: 0 });

describe('world event HUD', () => {
  it('handles HUD/audio-only events', () => {
    const hud = {
      subtitle: vi.fn(),
      logLine: vi.fn(),
      flashDamage: vi.fn(),
    } as unknown as Hud;
    const audio = { exitOpen: vi.fn(), secondHeart: vi.fn() } as unknown as AudioEngine;
    const handler = new WorldEventHud(hud, audio);
    expect(handler.handle(event('exitOpen'))).toBe(true);
    expect(handler.handle(event('secondHeart'))).toBe(true);
    expect(handler.handle(event('playerDeath'))).toBe(false);
    expect(audio.exitOpen).toHaveBeenCalled();
    expect(hud.subtitle).toHaveBeenCalled();
  });
});
