import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { loadLevel } from './map';
import { baseMods } from './progression';
import { World } from './world';

function fakeInput(pressed: Set<string>) {
  return {
    held: () => false,
    wasPressed: (code: string) => pressed.has(code),
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

function makeWorld(set: Set<string>) {
  const level = loadLevel('safehouse');
  return new World(
    level,
    fakeInput(set),
    () => {},
    {
      weapon: 'smg',
      ammo: 24,
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

describe('player magazine reload', () => {
  it('splits carried ammo into magazine and reserve', () => {
    const world = makeWorld(new Set());
    expect(world.player.clip).toBe(18);
    expect(world.player.ammo).toBe(6);
    expect(world.player.reloadT).toBe(0);
  });

  it('reloads from reserve after the weapon reload time', () => {
    const pressed = new Set<string>();
    const world = makeWorld(pressed);
    const aim = { x: world.player.x + 100, y: world.player.y };
    world.player.clip = 12;
    pressed.add('KeyR');
    world.update(1 / 120, aim, true);
    expect(world.player.reloadT).toBeCloseTo(1.15);
    expect(world.player.clip).toBe(12);
    pressed.clear();
    for (let i = 0; i < 150; i++) world.update(1 / 120, aim, false);
    expect(world.player.reloadT).toBe(0);
    expect(world.player.clip).toBe(18);
    expect(world.player.ammo).toBe(0);
  });

  it('cancels a reload when R is pressed again', () => {
    const pressed = new Set<string>();
    const world = makeWorld(pressed);
    const aim = { x: world.player.x + 100, y: world.player.y };
    world.player.clip = 12;
    pressed.add('KeyR');
    world.update(1 / 120, aim, true);
    expect(world.player.reloadT).toBeGreaterThan(0);
    world.update(1 / 120, aim, true);
    expect(world.player.reloadT).toBe(0);
    expect(world.player.clip).toBe(12);
  });

  it('clicks empty instead of firing an empty magazine', () => {
    const pressed = new Set<string>();
    const input = fakeInput(pressed) as unknown as {
      mousePressed: boolean;
      mouseDown: boolean;
    };
    const level = loadLevel('safehouse');
    const events: string[] = [];
    const world = new World(
      level,
      input as unknown as Input,
      (event) => events.push(event.type),
      {
        weapon: 'smg',
        ammo: 18,
        attachment: null,
        variant: null,
        supplyType: null,
        supplyCharges: 0,
      },
      { objective: 'purge', requiredLoot: 0 },
      baseMods(),
      42,
    );
    world.player.clip = 0;
    world.player.ammo = 0;
    input.mousePressed = true;
    world.update(1 / 120, { x: world.player.x + 100, y: world.player.y }, true);
    expect(world.shotsFired).toBe(0);
    expect(events).toContain('empty');
    expect(world.player.clip).toBe(0);
  });

  it('does not start a reload with an empty reserve', () => {
    const pressed = new Set<string>();
    const level = loadLevel('safehouse');
    const world = new World(
      level,
      fakeInput(pressed),
      () => {},
      {
        weapon: 'pistol',
        ammo: 6,
        attachment: null,
        variant: null,
        supplyType: null,
        supplyCharges: 0,
      },
      { objective: 'purge', requiredLoot: 0 },
      baseMods(),
      42,
    );
    const aim = { x: world.player.x + 100, y: world.player.y };
    pressed.add('KeyR');
    world.update(1 / 120, aim, true);
    expect(world.player.reloadT).toBe(0);
    expect(world.player.clip).toBe(6);
    expect(world.player.ammo).toBe(0);
  });
});
