import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../core/audio';
import type { Hud } from '../ui/hud';
import type { Profile } from './profile';
import type { World } from './world';
import type { WorldEvent } from './world-types';
import { RunStateEvents } from './run-state-events';

const event = (type: string, angle = 0): WorldEvent => ({ type, x: 0, y: 0, angle });

describe('run state events', () => {
  it('records death and forwards win', () => {
    const audio = { death: vi.fn(), win: vi.fn() } as unknown as AudioEngine;
    const hud = { flashDamage: vi.fn(), damageDirection: vi.fn() } as unknown as Hud;
    const profile = {
      data: { insurance: null },
      claimInsurance: vi.fn(() => false),
      recordRun: vi.fn(),
    } as unknown as Profile;
    const world = { time: 12, kills: 4 } as unknown as World;
    const onDeath = vi.fn();
    const onWin = vi.fn();
    const events = new RunStateEvents(profile, audio, hud, {
      world: () => world,
      contract: () => null,
      challenge: () => 'glass',
      onDeath,
      onWin,
    });
    expect(events.handle(event('playerDeath', 1))).toBe(true);
    expect(profile.recordRun).toHaveBeenCalled();
    expect(events.deathInsured).toBe(false);
    expect(events.handle(event('win'))).toBe(true);
    expect(onDeath).toHaveBeenCalled();
    expect(onWin).toHaveBeenCalled();
    expect(events.handle(event('kill'))).toBe(false);
  });
});
