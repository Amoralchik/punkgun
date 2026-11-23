import { describe, expect, it, vi } from 'vitest';
import type { Level } from './map';
import { runSquadMovement, type SquadHost } from './world-squad-ai';
import type { Enemy, Grenade, Player } from './world-types';

function enemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: 0,
    kind: 'grunt',
    x: 0,
    y: 0,
    speedMult: 1,
    squad: -1,
    suppressT: 0,
    coverT: 0,
    coverX: 0,
    coverY: 0,
    flankT: 0,
    flankX: 0,
    flankY: 0,
    path: [],
    alive: true,
    ...overrides,
  } as unknown as Enemy;
}

function host(overrides: Partial<SquadHost> = {}): SquadHost {
  return {
    player: { x: 500, y: 500 } as unknown as Player,
    enemies: [],
    grenades: [],
    level: { w: 20, h: 20 } as unknown as Level,
    steer: vi.fn(),
    lineClear: () => true,
    solidAt: () => false,
    ...overrides,
  };
}

describe('squad movement', () => {
  it('sidesteps a live grenade', () => {
    const h = host();
    const e = enemy();
    const grenade = { x: 30, y: 0, life: 1 } as Grenade;
    h.grenades = [grenade];
    expect(runSquadMovement(h, e, 0.016)).toBe(true);
    expect(h.steer).toHaveBeenCalled();
  });

  it('runs to cover when suppressed and unharmed by melee', () => {
    const h = host();
    const e = enemy({ suppressT: 1 });
    h.lineClear = (_ax, _ay, bx, by) => !(bx === 500 && by === 500);
    expect(runSquadMovement(h, e, 0.016)).toBe(true);
    expect(e.coverT).toBe(1.4);
    expect(e.coverX).not.toBe(0);
    expect(h.steer).toHaveBeenCalled();

    const blade = host();
    const melee = enemy({ kind: 'blade', suppressT: 1 });
    expect(runSquadMovement(blade, melee, 0.016)).toBe(false);
    expect(melee.coverT).toBe(0);
  });

  it('sends the second squad member wide', () => {
    const h = host();
    const leader = enemy({ id: 1, x: 0, y: 0, squad: 0 });
    const flanker = enemy({ id: 2, x: 40, y: 0, squad: 0 });
    const third = enemy({ id: 3, x: 80, y: 0, squad: 0 });
    h.enemies = [third, leader, flanker];
    h.player = { x: 200, y: 0 } as unknown as Player;
    expect(runSquadMovement(h, flanker, 0.016)).toBe(true);
    expect(flanker.flankT).toBe(1.6);
    expect(h.steer).toHaveBeenCalled();
  });

  it('leaves bosses to the boss branch', () => {
    const h = host();
    expect(runSquadMovement(h, enemy({ kind: 'boss' }), 0.016)).toBe(false);
  });
});
