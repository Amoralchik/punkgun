import { describe, expect, it, vi } from 'vitest';
import type { Level } from './map';
import { baseMods } from './progression';
import { addHeat, spawnReinforcements, type EncounterHost } from './world-encounters';
import type { Enemy, Player } from './world-types';

function enemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: 1,
    x: 0,
    y: 0,
    alive: true,
    squad: -1,
    ...overrides,
  } as unknown as Enemy;
}

function host(overrides: Partial<EncounterHost> = {}): EncounterHost {
  return {
    player: { x: 0, y: 0 } as unknown as Player,
    level: {
      enemies: [
        { x: 300, y: 0, kind: 'gunner' },
        { x: 200, y: 0, kind: 'rusher' },
        { x: 100, y: 0, kind: 'grunt' },
      ],
    } as unknown as Level,
    enemies: [],
    mods: baseMods(),
    heat: 0,
    peakHeat: 0,
    reinforcementWave: 0,
    heatShift: 0,
    modifierHeat: 1,
    exitOpen: false,
    addEnemy: vi.fn(() => enemy()),
    emit: vi.fn(),
    ...overrides,
  };
}

describe('encounter heat', () => {
  it('clamps heat, tracks peak, and fires both authored waves once', () => {
    const h = host();
    addHeat(h, 10);
    expect(h.heat).toBe(10);
    expect(h.peakHeat).toBe(10);
    expect(h.reinforcementWave).toBe(0);

    addHeat(h, 50);
    expect(h.heat).toBe(60);
    expect(h.reinforcementWave).toBe(1);
    expect(h.addEnemy).toHaveBeenCalledTimes(2);

    addHeat(h, 30);
    expect(h.heat).toBe(90);
    expect(h.reinforcementWave).toBe(2);
    expect(h.addEnemy).toHaveBeenCalledTimes(4);

    addHeat(h, 50);
    expect(h.heat).toBe(100);
    expect(h.addEnemy).toHaveBeenCalledTimes(4);
  });

  it('applies build and modifier heat multipliers', () => {
    const h = host();
    h.mods.heatMult = 0.5;
    h.modifierHeat = 2;
    addHeat(h, 20);
    expect(h.heat).toBe(20);
  });

  it('does not call waves after the exit opens', () => {
    const h = host({ exitOpen: true });
    addHeat(h, 90);
    expect(h.heat).toBe(90);
    expect(h.reinforcementWave).toBe(0);
    expect(h.addEnemy).not.toHaveBeenCalled();
  });

  it('spawns the farthest points and emits a siren', () => {
    const h = host();
    spawnReinforcements(h, 2);
    expect(h.addEnemy).toHaveBeenNthCalledWith(1, 300, 0, 1, 'chase', 'gunner');
    expect(h.addEnemy).toHaveBeenNthCalledWith(2, 200, 0, 1, 'chase', 'rusher');
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'siren' }));
  });

  it('honours a forced wave archetype', () => {
    const h = host();
    spawnReinforcements(h, 1, 'rusher');
    expect(h.addEnemy).toHaveBeenCalledWith(300, 0, 1, 'chase', 'rusher');
  });
});
