import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../core/audio';
import type { BossIntro } from '../ui/boss-intro';
import type { BossPhaseOverlay } from '../ui/boss-phase';
import type { Hud } from '../ui/hud';
import type { WorldEvent } from './world-types';
import { BossEventFeedback } from './boss-event-feedback';

const event = (type: string, extra: Partial<WorldEvent> = {}): WorldEvent => ({ type, x: 0, y: 0, angle: 0, ...extra });

describe('boss event feedback', () => {
  it('handles phase and rush presentation', () => {
    const audio = { bossPhase: vi.fn(), alert: vi.fn(), setBossMode: vi.fn() } as unknown as AudioEngine;
    const hud = { subtitle: vi.fn(), logLine: vi.fn() } as unknown as Hud;
    const phase = { flash: vi.fn() } as unknown as BossPhaseOverlay;
    const intro = { show: vi.fn() } as unknown as BossIntro;
    const events = new BossEventFeedback(audio, hud, phase, intro, () => 'SERAPH');
    expect(events.handle(event('bossPhase'))).toBe(true);
    expect(events.handle(event('bossRushWave', { wave: 2, total: 6 }))).toBe(true);
    expect(intro.show).toHaveBeenCalledWith('// NEXT BOSS', 'SERAPH', 'WAVE 2/6');
    expect(events.handle(event('kill'))).toBe(false);
  });
});
