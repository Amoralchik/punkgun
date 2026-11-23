import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../core/audio';
import type { Hud } from '../ui/hud';
import type { Profile } from './profile';
import type { World } from './world';
import type { WorldEvent } from './world-types';
import { CombatEventFeedback } from './combat-event-feedback';

const event = (type: string, angle = 0): WorldEvent => ({ type, x: 0, y: 0, angle });

describe('combat event feedback', () => {
  it('handles kills and armor hits', () => {
    const audio = { kill: vi.fn(), combo: vi.fn(), armorHit: vi.fn() } as unknown as AudioEngine;
    const hud = { flashDamage: vi.fn(), damageDirection: vi.fn() } as unknown as Hud;
    const profile = {
      data: { perks: { scavenger: 0 } },
      addComponent: vi.fn(),
    } as unknown as Profile;
    const world = { combo: 3 } as unknown as World;
    const feedback = new CombatEventFeedback(audio, hud, profile, () => world);
    expect(feedback.handle(event('kill'))).toBe(true);
    expect(feedback.handle(event('armorHit', 1))).toBe(true);
    expect(feedback.handle(event('playerDeath'))).toBe(false);
    expect(audio.combo).toHaveBeenCalledWith(3);
    expect(profile.addComponent).toHaveBeenCalledWith(1);
    expect(hud.flashDamage).toHaveBeenCalledWith('armor');
  });
});
