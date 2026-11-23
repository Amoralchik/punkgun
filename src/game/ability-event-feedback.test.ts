import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../core/audio';
import type { AbilityFlash } from '../ui/ability-flash';
import type { WorldEvent } from './world-types';
import { AbilityEventFeedback } from './ability-event-feedback';

const event = (type: string): WorldEvent => ({ type, x: 0, y: 0, angle: 0 });

describe('ability event feedback', () => {
  it('plays audio and flashes for active cyberware', () => {
    const audio = { sandevistan: vi.fn(), emp: vi.fn(), berserk: vi.fn() } as unknown as AudioEngine;
    const flash = { flash: vi.fn() } as unknown as AbilityFlash;
    const feedback = new AbilityEventFeedback(audio, flash);
    expect(feedback.handle(event('sandevistan'))).toBe(true);
    expect(feedback.handle(event('emp'))).toBe(true);
    expect(feedback.handle(event('kill'))).toBe(false);
    expect(flash.flash).toHaveBeenCalledTimes(2);
  });
});
