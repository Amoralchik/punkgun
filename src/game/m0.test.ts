import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { loadLevel, type LayoutId } from './map';
import { baseMods } from './progression';
import { World } from './world';
import type { MissionSpec } from './world-types';

function fakeInput() {
  return {
    held: () => false,
    wasPressed: () => false,
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

function makeWorld(mission: MissionSpec, input = fakeInput(), layoutId: LayoutId = 'sector07') {
  return new World(
    loadLevel(layoutId),
    input,
    () => {},
    {
      weapon: 'fists',
      ammo: 0,
      attachment: null,
      variant: null,
      supplyType: null,
      supplyCharges: 0,
    },
    mission,
    baseMods(),
    42,
  );
}

describe('lockdown doors', () => {
  it('seals behind the player and only a kick reopens it', () => {
    const world = makeWorld({ objective: 'purge', requiredLoot: 0, modifiers: ['lockdown'] });
    const door = world.doors[0];
    expect(door).toBeDefined();
    world.player.invulnT = 9999;
    world.openDoor(door, true);
    expect(door.open).toBe(true);

    world.player.x = door.x + 100;
    world.player.y = door.y;
    world.player.vx = 100;
    world.player.vy = 0;
    world.update(0, { x: door.x + 200, y: door.y }, false);
    expect(door.locked).toBe(true);
    expect(door.open).toBe(false);

    world.openDoor(door, false);
    expect(door.open).toBe(false);
    expect(door.locked).toBe(true);

    world.openDoor(door, true);
    expect(door.locked).toBe(false);
    expect(door.open).toBe(true);
  });
});

describe('sirens modifier', () => {
  it('brings the first reinforcement wave at heat 40', () => {
    const input = fakeInput() as unknown as { mousePressed: boolean };
    input.mousePressed = true;
    const world = makeWorld(
      { objective: 'purge', requiredLoot: 0, modifiers: ['sirens'] },
      input as unknown as Input,
    );
    const before = world.enemies.length;
    world.player.weapon = 'pistol';
    world.player.clip = 1;
    world.player.attackCd = 0;
    world.heat = 39;
    world.player.invulnT = 9999;
    world.update(1 / 120, { x: world.player.x + 100, y: world.player.y }, true);
    expect(world.reinforcementWave).toBe(1);
    expect(world.enemies.length).toBeGreaterThan(before);
  });
});
