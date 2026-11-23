import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { loadLevel, tileCenter } from './map';
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
    loadLevel('rooftops'),
    fakeInput(),
    () => {},
    {
      weapon: 'pistol',
      ammo: 8,
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

describe('glass and steam', () => {
  it('parses the new hazards', () => {
    const level = loadLevel('rooftops');
    expect(level.glass.filter((value) => value === 1)).toHaveLength(2);
    expect(level.steam).toHaveLength(2);
  });

  it('breaks glass with a bullet and changes collision', () => {
    const world = makeWorld();
    const index = world.level.glass.findIndex((value) => value === 1);
    const cx = index % world.level.w;
    const cy = Math.floor(index / world.level.w);
    const center = tileCenter(cx, cy, world.level.h);
    expect(world.solidAt(center.x, center.y)).toBe(true);
    world.bullets.push({
      x: center.x,
      y: center.y,
      px: center.x - 20,
      py: center.y,
      vx: 800,
      vy: 0,
      life: 1,
      ownerId: world.player.id,
      ownerKind: 'player',
      pierce: 0,
    });
    world.update(1 / 120, { x: center.x + 100, y: center.y }, false);
    expect(world.glassBroken.has(index)).toBe(true);
    expect(world.solidAt(center.x, center.y)).toBe(false);
  });

  it('lets sight through intact glass and blocks it at active steam', () => {
    const world = makeWorld();
    const index = world.level.glass.findIndex((value) => value === 1);
    const cx = index % world.level.w;
    const cy = Math.floor(index / world.level.w);
    const center = tileCenter(cx, cy, world.level.h);
    expect(world.lineClear(center.x - 100, center.y, center.x + 100, center.y)).toBe(true);

    const steam = world.steams[0];
    steam.phase = 0;
    steam.active = true;
    expect(world.smokeBlocks(steam.x - 100, steam.y, steam.x + 100, steam.y)).toBe(true);
    expect(world.lineClear(steam.x - 100, steam.y, steam.x + 100, steam.y)).toBe(true);
    steam.phase = 2.1;
    steam.active = false;
    expect(world.smokeBlocks(steam.x - 100, steam.y, steam.x + 100, steam.y)).toBe(false);
  });
});
