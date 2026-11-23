import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { gymLevel } from './gym';
import { baseMods } from './progression';
import { World } from './world';
import { aimPlayer, dashDirection, movementAxes, playerMoveSpeed } from './world-player';

function fakeInput(keys: string[] = []) {
  return {
    held: (code: string) => keys.includes(code),
    wasPressed: () => false,
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

function player() {
  const world = new World(
    gymLevel('grunt'),
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
  return world.player;
}

describe('player movement helpers', () => {
  it('normalizes movement axes and aims at a meaningful target', () => {
    const p = player();
    const axes = movementAxes(fakeInput(['KeyD', 'KeyS']));
    expect(axes.x).toBeCloseTo(Math.SQRT1_2);
    expect(axes.y).toBeCloseTo(-Math.SQRT1_2);
    aimPlayer(p, p.x + 50, p.y + 50);
    expect(p.angle).toBeCloseTo(Math.PI / 4);
  });

  it('derives dash direction from movement or aim', () => {
    const p = player();
    const moving = dashDirection(fakeInput(['KeyA']), p);
    expect(moving.x).toBeLessThan(0);
    p.angle = Math.PI;
    const aimed = dashDirection(fakeInput(), p);
    expect(aimed.x).toBeCloseTo(-1);
    expect(aimed.y).toBeCloseTo(0);
  });

  it('applies low-armor and berserk speed modifiers', () => {
    const p = player();
    p.armor = 0;
    const low = playerMoveSpeed(baseMods(), p);
    p.berserkT = 1;
    expect(playerMoveSpeed(baseMods(), p)).toBeGreaterThan(low);
  });
});
