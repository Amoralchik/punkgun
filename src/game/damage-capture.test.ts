import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { ENEMY_LABELS } from './damage-report';
import { loadLevel } from './map';
import { baseMods } from './progression';
import type { Turret } from './world-types';
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

function makeWorld() {
  return new World(
    loadLevel('docks'),
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
}

describe('lethal damage capture', () => {
  it('resolves enemy and turret attackers for the death report', () => {
    const world = makeWorld();
    const enemy = world.enemies[0];
    const source = world.damageSourceFor(enemy.id, enemy.x, enemy.y, 'LMG');
    expect(source.label).toBe(ENEMY_LABELS[enemy.kind]);
    expect(source.attack).toBe('LMG');
    expect(source.cause).toBe('gunfire');

    const turret: Turret = {
      id: 9001,
      x: 10,
      y: 20,
      angle: 0,
      alive: true,
      aiming: false,
      fireCd: 0,
      aimT: 0,
      flashT: 0,
      disabledT: 0,
    };
    world.turrets.push(turret);
    expect(world.damageSourceFor(turret.id, 0, 0).label).toBe('SECURITY TURRET');
    expect(world.damageSourceFor(-1, 0, 0).label).toBe('STRAY FIRE');
  });

  it('stores the lethal source and dash state, but not on armor absorption', () => {
    const world = makeWorld();
    const enemy = world.enemies[0];
    world.player.invulnT = 0;
    world.player.armor = 1;
    world.killPlayer(0, world.damageSourceFor(enemy.id, enemy.x, enemy.y));
    expect(world.player.alive).toBe(true);
    expect(world.lastDamage).toBeNull();

    world.player.armor = 0;
    world.player.invulnT = 0;
    world.player.dashCd = 0;
    world.killPlayer(0, world.damageSourceFor(enemy.id, enemy.x, enemy.y));
    expect(world.player.alive).toBe(false);
    expect(world.lastDamage?.label).toBe(ENEMY_LABELS[enemy.kind]);
    expect(world.deathDashReady).toBe(true);
  });
});
