import { describe, expect, it, vi } from 'vitest';
import type { AudioEngine } from '../core/audio';
import type { Renderer } from '../render/renderer';
import type { Hud } from '../ui/hud';
import type { Profile } from './profile';
import type { World } from './world';
import { syncHud } from './hud-sync';

function make() {
  const hud = new Proxy(
    {},
    { get: () => vi.fn() },
  ) as unknown as Hud;
  const world = {
    player: {
      weapon: 'smg',
      variant: null,
      attachment: null,
      clip: 10,
      ammo: 20,
      reloadT: 0,
      armor: 1,
      maxArmor: 2,
      hackedT: 0,
      supplyType: null,
      supplyCharges: 0,
      attackCd: 0,
      alive: true,
      x: 10,
      y: 10,
    },
    aliveEnemies: 2,
    time: 30,
    lootValue: 0,
    exitOpen: false,
    boss: null,
    bossName: '',
    shotsHit: 4,
    kills: 2,
    heat: 20,
    abilitySlots: () => [],
    combo: 1,
    comboT: 0,
    comboMax: 2,
    objectiveText: () => 'PURGE',
    promptText: () => null,
    level: { exit: { x: 100, y: 100 } },
  } as unknown as World;
  const profile = {
    humanityStage: 0,
    humanityInfo: () => ({ label: 'STABLE' }),
  } as unknown as Profile;
  const renderer = { worldToScreen: vi.fn(() => ({ x: 1, y: 2 })) } as unknown as Renderer;
  const audio = { setIntensity: vi.fn() } as unknown as AudioEngine;
  return { hud, world, profile, renderer, audio };
}

describe('HUD sync', () => {
  it('projects world state and advances hit/kill marks', () => {
    const { hud, world, profile, renderer, audio } = make();
    const out = syncHud({
      state: 'playing',
      world,
      profile,
      contract: null,
      approach: 'standard',
      mouseX: 5,
      mouseY: 6,
      lastShotsHit: 0,
      lastKills: 0,
      hud,
      renderer,
      audio,
      setVignettePoint: vi.fn(),
    });
    expect(out).toEqual({ lastShotsHit: 4, lastKills: 2 });
    expect(audio.setIntensity).toHaveBeenCalledWith(0.2);
  });
});
