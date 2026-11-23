import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { tileCenter } from './map';
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

describe('environmental noise sources', () => {
  it('glass breaks pull nearby patrols', () => {
    const level = loadLevel('neon_alley');
    const world = new World(
      level,
      fakeInput(),
      () => {},
      null,
      { objective: 'purge', requiredLoot: 0 },
      baseMods(),
      7,
    );
    let glass = -1;
    for (let i = 0; i < level.glass.length; i++) {
      if (level.glass[i] === 1) {
        glass = i;
        break;
      }
    }
    expect(glass).toBeGreaterThanOrEqual(0);
    const cx = glass % level.w;
    const cy = Math.floor(glass / level.w);
    const point = tileCenter(cx, cy, level.h);
    const enemy = world.enemies[0];
    enemy.x = point.x + 20;
    enemy.y = point.y;
    expect(world.breakGlassAt(point.x, point.y)).toBe(true);
    expect(enemy.state).toBe('chase');
  });
});
