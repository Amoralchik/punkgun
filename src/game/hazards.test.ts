import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { LAYOUTS, loadLevel } from './map';
import { baseMods } from './progression';
import { World } from './world';

function fakeInput() {
  return {
    held: () => false,
    wasPressed: () => false,
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

describe('explosive barrels', () => {
  it('parses barrels from every combat layout without breaking map widths', () => {
    const combat = LAYOUTS.filter((layout) => layout.id !== 'safehouse');
    for (const layout of combat) {
      const level = loadLevel(layout.id);
      expect(level.barrels.length).toBeGreaterThan(0);
    }
  });

  it('parses security cameras on the camera-enabled layouts', () => {
    for (const id of ['sector07', 'docks', 'spire'] as const) {
      expect(loadLevel(id).cameras.length).toBeGreaterThan(0);
    }
  });

  it('parses automated turrets on the turret-enabled layouts', () => {
    for (const id of ['sector07', 'docks'] as const) {
      expect(loadLevel(id).turrets.length).toBeGreaterThan(0);
    }
  });

  it('parses laser grids on the laser-enabled layouts', () => {
    for (const id of ['sector07', 'docks'] as const) {
      expect(loadLevel(id).lasers.length).toBeGreaterThan(0);
    }
  });

  it('an active laser kills an exposed player', () => {
    const level = loadLevel('sector07');
    const world = new World(
      level,
      fakeInput(),
      () => {},
      {
        weapon: 'fists',
        ammo: 0,
        attachment: null,
        variant: null,
        supplyType: null,
        supplyCharges: 0,
      },
      { objective: 'purge', requiredLoot: 0 },
      baseMods(),
      42,
    );
    const laser = world.lasers[0];
    expect(laser).toBeDefined();
    world.player.x = laser.x;
    world.player.y = laser.y;
    world.player.armor = 0;
    world.player.maxArmor = 0;
    world.player.revived = true;
    world.player.invulnT = 0;
    laser.phase = 0;
    world.time = 0;
    world.update(1 / 120, { x: laser.x + 100, y: laser.y }, false);
    expect(world.deathCause).toBe('LASER');
    expect(world.player.alive).toBe(false);
    expect(world.state).toBe('dead');
  });

  it('a grenade detonates a nearby barrel', () => {
    const level = loadLevel('sector07');
    const barrelSpawn = level.barrels[0];
    const world = new World(
      level,
      fakeInput(),
      () => {},
      {
        weapon: 'fists',
        ammo: 0,
        attachment: null,
        variant: null,
        supplyType: null,
        supplyCharges: 0,
      },
      { objective: 'purge', requiredLoot: 0 },
      baseMods(),
      42,
    );
    const barrel = world.barrels[0];
    expect(barrel).toBeDefined();
    world.grenades.push({
      id: 9999,
      x: barrelSpawn.x,
      y: barrelSpawn.y,
      vx: 0,
      vy: 0,
      life: 0,
      owner: 'player',
    });
    world.update(1 / 120, { x: world.player.x + 100, y: world.player.y }, false);
    expect(barrel.alive).toBe(false);
    expect(world.explosions.length).toBeGreaterThan(0);
  });
});
