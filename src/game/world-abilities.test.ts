import { describe, expect, it, vi } from 'vitest';
import type { Input } from '../core/input';
import { baseMods } from './progression';
import type { Camera, Enemy, Laser, Player, Turret } from './world-types';
import { activateAbilities, type AbilityHost } from './world-abilities';

function player(): Player {
  return {
    x: 0,
    y: 0,
    angle: 0,
    aimX: 100,
    aimY: 0,
    hackedT: 0,
    slowT: 0,
    slowCd: 0,
    camoT: 0,
    camoCloakCd: 0,
    empCd: 0,
    berserkT: 0,
    berserkCd: 0,
    overclockT: 0,
    overclockCd: 0,
    deckCd: 0,
    quickhackCd: 0,
  } as unknown as Player;
}

function enemy(): Enemy {
  return {
    alive: true,
    kind: 'grunt',
    x: 50,
    y: 0,
    aimX: 50,
    aimY: 0,
    stunT: 0,
    aiming: true,
    hackT: 1,
    flashT: 0,
    hackCd: 0,
    deployCd: 0,
  } as unknown as Enemy;
}

function input(keys: string[]): Input {
  return { wasPressed: (code: string) => keys.includes(code) } as unknown as Input;
}

function makeHost(overrides: Partial<AbilityHost> = {}): AbilityHost {
  return {
    player: player(),
    enemies: [],
    cameras: [],
    turrets: [],
    lasers: [],
    mods: baseMods(),
    shake: 0,
    quickhackFxT: 0,
    quickhackX: 0,
    quickhackY: 0,
    emit: vi.fn(),
    lineClear: () => true,
    smokeBlocks: () => false,
    addHeat: vi.fn(),
    ...overrides,
  };
}

describe('active cyberware', () => {
  it('starts Sandevistan on its cooldown and emits the activation', () => {
    const h = makeHost();
    h.mods.sandevistan = 1;
    activateAbilities(h, input(['ShiftLeft']));
    expect(h.player.slowT).toBeGreaterThan(0);
    expect(h.player.slowCd).toBeGreaterThan(0);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'sandevistan' }));

    h.player.slowT = 0;
    h.player.slowCd = 5;
    activateAbilities(h, input(['ShiftLeft']));
    expect(h.player.slowT).toBe(0);
  });

  it('blocks every active while a netrunner hack is applied', () => {
    const h = makeHost();
    h.mods.sandevistan = 1;
    h.player.hackedT = 1;
    activateAbilities(h, input(['ShiftLeft']));
    expect(h.player.slowT).toBe(0);
    expect(h.emit).not.toHaveBeenCalled();
  });

  it('EMP stuns enemies and disables security in radius', () => {
    const e = enemy();
    const camera = { alive: true, x: 40, y: 0, disabledT: 0 } as Camera;
    const turret = { alive: true, x: 40, y: 0, disabledT: 0 } as Turret;
    const laser = { alive: true, x: 40, y: 0, disabledT: 0 } as Laser;
    const h = makeHost({
      enemies: [e],
      cameras: [camera],
      turrets: [turret],
      lasers: [laser],
    });
    h.mods.emp = 1;
    activateAbilities(h, input(['KeyX']));
    expect(h.player.empCd).toBeGreaterThan(0);
    expect(e.stunT).toBeGreaterThan(0);
    expect(e.aiming).toBe(false);
    expect(e.hackT).toBe(0);
    expect(camera.disabledT).toBe(7);
    expect(turret.disabledT).toBe(7);
    expect(laser.disabledT).toBe(7);
    expect(h.shake).toBeGreaterThan(0);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'emp' }));
  });

  it('quickhacks the aimed target, or reports no target', () => {
    const e = enemy();
    const h = makeHost({ enemies: [e] });
    h.mods.deck = 1;
    activateAbilities(h, input(['KeyZ']));
    expect(e.stunT).toBeGreaterThan(0);
    expect(h.quickhackFxT).toBe(0.3);
    expect(h.quickhackX).toBe(e.x);
    expect(h.addHeat).toHaveBeenCalledWith(3);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'quickhack' }));

    const miss = makeHost({ enemies: [enemy()] });
    miss.mods.deck = 1;
    miss.player.aimX = 1000;
    activateAbilities(miss, input(['KeyZ']));
    expect(miss.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'quickhackFail' }));
    expect(miss.addHeat).not.toHaveBeenCalled();
  });

  it('intrusion deck shuts down cameras, turrets and lasers', () => {
    const camera = { alive: true, x: 100, y: 0, disabledT: 0 } as Camera;
    const turret = { alive: true, x: 100, y: 0, disabledT: 0 } as Turret;
    const laser = { alive: true, x: 100, y: 0, disabledT: 0 } as Laser;
    const h = makeHost({ cameras: [camera], turrets: [turret], lasers: [laser] });
    h.mods.deck = 1;
    activateAbilities(h, input(['KeyH']));
    expect(camera.disabledT).toBe(9);
    expect(turret.disabledT).toBe(9);
    expect(laser.disabledT).toBe(9);
    expect(h.player.deckCd).toBeGreaterThan(0);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'deck' }));
  });
});
