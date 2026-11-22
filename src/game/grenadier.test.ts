import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { loadLevel } from './map';
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

function makeWorld() {
  return new World(
    loadLevel('safehouse'),
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

function detonate(world: World, owner: 'player' | 'enemy'): void {
  world.grenades.push({
    id: 999,
    x: world.player.x,
    y: world.player.y,
    vx: 0,
    vy: 0,
    life: 0,
    owner,
  });
  world.update(1 / 120, { x: world.player.x + 100, y: world.player.y }, false);
}

describe('enemy grenades', () => {
  it('an enemy grenade kills an unarmored player', () => {
    const world = makeWorld();
    world.player.armor = 0;
    world.player.maxArmor = 0;
    detonate(world, 'enemy');
    expect(world.deathCause).toBe('EXPLOSION');
    expect(world.player.alive).toBe(false);
    expect(world.state).toBe('dead');
  });

  it('the player does not damage themselves with their own frag', () => {
    const world = makeWorld();
    world.player.armor = 0;
    world.player.maxArmor = 0;
    detonate(world, 'player');
    expect(world.player.alive).toBe(true);
    expect(world.state).toBe('playing');
  });
});
