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

describe('committed enemy pursuit', () => {
  it('keeps a close rusher interested after its facing cone slips off the player', () => {
    const level = loadLevel('docks');
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
    const player = world.player;
    let enemy = world.enemies.find((entry) => entry.alive);
    expect(enemy).toBeDefined();
    world.enemies.splice(0, world.enemies.length, enemy!);
    player.invulnT = 999;

    // Put the enemy in clear space near the player, committed but facing away.
    let placed = false;
    for (const dx of [90, 120, 150, 180]) {
      if (!world.solidAt(player.x + dx, player.y)) {
        enemy!.x = player.x + dx;
        enemy!.y = player.y;
        placed = true;
        break;
      }
    }
    expect(placed).toBe(true);
    enemy!.state = 'chase';
    enemy!.angle = Math.atan2(enemy!.y - player.y, enemy!.x - player.x);
    enemy!.searchT = 0.1;

    for (let i = 0; i < 30; i++) {
      world.update(0.1, { x: player.x + 100, y: player.y }, false);
    }

    expect(enemy!.alive).toBe(true);
    expect(enemy!.state).not.toBe('idle');
  });
});
