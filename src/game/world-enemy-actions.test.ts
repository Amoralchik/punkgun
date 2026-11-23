import { describe, expect, it, vi } from 'vitest';
import type { Level } from './map';
import type { Pathfinder } from './path';
import { baseMods } from './progression';
import type { Enemy, Player } from './world-types';
import { runEnemyArchetype, type EnemyActionHost } from './world-enemy-actions';

function enemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    kind: 'grunt',
    x: 0,
    y: 0,
    angle: 0,
    speedMult: 1,
    strafeSign: 1,
    path: [],
    pathT: 0,
    fireCd: 0,
    aiming: false,
    ammo: 0,
    weapon: 'fists',
    meleeCd: 0,
    leapT: 0,
    leapCd: 0,
    markT: 0,
    medicCharges: 1,
    healCd: 0,
    armor: 0,
    maxArmor: 1,
    alive: true,
    hackT: 0,
    hackCd: 0,
    grenadeCd: 0,
    flashT: 0,
    deployCd: 0,
    r: 15,
    ...overrides,
  } as unknown as Enemy;
}

function host(overrides: Partial<EnemyActionHost> = {}): EnemyActionHost {
  return {
    player: { x: 0, y: 0, vx: 0, vy: 0, hackedT: 0 } as unknown as Player,
    enemies: [],
    turrets: [],
    grenades: [],
    level: { w: 20, h: 20 } as unknown as Level,
    pathfinder: { find: () => [] } as unknown as Pathfinder,
    mods: baseMods(),
    hackMultiplier: 1,
    rand: () => 0.5,
    nextId: () => 99,
    emit: vi.fn(),
    steer: vi.fn(),
    followPath: vi.fn(),
    lineClear: () => true,
    deployTurret: vi.fn(),
    enemyPunch: vi.fn(),
    enemyShoot: vi.fn(),
    ...overrides,
  };
}

describe('enemy archetype actions', () => {
  it('leaves generic archetypes to the caller', () => {
    const e = enemy({ kind: 'sniper' });
    expect(runEnemyArchetype(host(), e, 0.016, true, 100)).toBe(false);
  });

  it('starts and resolves a hound leap', () => {
    const h = host();
    const e = enemy({ kind: 'hound' });
    h.player.x = 100;
    expect(runEnemyArchetype(h, e, 0.016, true, 100)).toBe(true);
    expect(e.leapT).toBe(0.35);
    expect(e.leapCd).toBe(2.2);
    expect(e.markT).toBeGreaterThan(0);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'houndLeap' }));

    const landing = enemy({ kind: 'hound', leapT: 0.2 });
    h.player.x = 40;
    runEnemyArchetype(h, landing, 0.016, true, 40);
    expect(h.enemyPunch).toHaveBeenCalledWith(landing);
  });

  it('heals the lowest-armor ally and then fires', () => {
    const h = host();
    const patient = enemy({ kind: 'grunt', armor: 0, maxArmor: 1, x: 50 });
    const e = enemy({
      kind: 'medic',
      weapon: 'pistol',
      ammo: 4,
      medicCharges: 1,
      x: 0,
    });
    h.enemies = [patient, e];
    h.player.x = 300;
    expect(runEnemyArchetype(h, e, 0.016, true, 300)).toBe(true);
    expect(patient.armor).toBe(1);
    expect(e.medicCharges).toBe(0);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'medicHeal' }));
    expect(h.enemyShoot).toHaveBeenCalledWith(e);
  });

  it('deploys an operator turret without consuming the turn', () => {
    const h = host();
    const e = enemy({ kind: 'operator' });
    expect(runEnemyArchetype(h, e, 0.016, true, 300)).toBe(false);
    expect(h.deployTurret).toHaveBeenCalledWith(e);
    expect(e.deployCd).toBe(9);

    const capped = host({ turrets: Array.from({ length: 6 }, () => ({ alive: true })) as never[] });
    const blocked = enemy({ kind: 'operator' });
    runEnemyArchetype(capped, blocked, 0.016, true, 300);
    expect(capped.deployTurret).not.toHaveBeenCalled();
  });

  it('channels a netrunner hack with black-ice multiplier', () => {
    const h = host();
    h.mods.hackResist = 0.2;
    h.hackMultiplier = 2;
    const e = enemy({ kind: 'netrunner', hackT: 0, hackCd: 0 });
    h.player.x = 300;
    expect(runEnemyArchetype(h, e, 0.016, true, 300)).toBe(true);
    expect(h.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'netrunnerChannel' }),
    );
    expect(e.aiming).toBe(true);
    runEnemyArchetype(h, e, 1.2, true, 300);
    expect(h.player.hackedT).toBeCloseTo(4 * (1 - 0.2) * 2);
    expect(e.hackCd).toBe(6);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'netrunnerHack' }));
  });

  it('throws a grenade on cooldown and keeps distance', () => {
    const h = host();
    const e = enemy({ kind: 'grenadier' });
    h.player.x = 300;
    expect(runEnemyArchetype(h, e, 0.016, true, 300)).toBe(true);
    expect(h.grenades).toHaveLength(1);
    expect(h.grenades[0].owner).toBe('enemy');
    expect(h.grenades[0].life).toBe(0.85);
    expect(e.grenadeCd).toBeGreaterThan(0);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'fragThrow' }));
    expect(h.steer).toHaveBeenCalled();
  });

  it('paths a hound around blocked sightlines', () => {
    const find = vi.fn(() => [{ x: 10, y: 10 }]);
    const h = host({
      pathfinder: { find } as unknown as Pathfinder,
      lineClear: () => false,
    });
    const e = enemy({ kind: 'hound', path: [], pathT: 0 });
    h.player.x = 100;
    runEnemyArchetype(h, e, 0.016, true, 100);
    expect(find).toHaveBeenCalled();
    expect(h.followPath).toHaveBeenCalledWith(e, 0.016);
  });
});
