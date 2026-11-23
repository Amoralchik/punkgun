import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { gymLevel } from './gym';
import { baseMods } from './progression';
import { World } from './world';
import { assignSquads, flankPoint, grenadeThreat, isFlanker, squadIntent, squadLeader } from './world-ai';

function fakeInput() {
  return {
    held: () => false,
    wasPressed: () => false,
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

function worldWithThree() {
  const level = gymLevel('grunt');
  const spawn = level.spawn;
  level.enemies.push(
    { x: spawn.x + 45, y: spawn.y, kind: 'grunt' },
    { x: spawn.x + 90, y: spawn.y, kind: 'grunt' },
  );
  return new World(
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
}

describe('squad coordination', () => {
  it('clusters close enemies and identifies a leader and flanker', () => {
    const world = worldWithThree();
    assignSquads(world.enemies);
    expect(new Set(world.enemies.map((e) => e.squad)).size).toBe(1);
    const leader = squadLeader(world.enemies, world.enemies[0]);
    expect(leader?.id).toBe(world.enemies[0].id);
    expect(isFlanker(world.enemies, world.enemies[0])).toBe(false);
    expect(isFlanker(world.enemies, world.enemies[1])).toBe(true);
  });

  it('reports one visual intent, with cover ahead of flank', () => {
    const world = worldWithThree();
    const e = world.enemies[1];
    expect(squadIntent(e)).toBeNull();
    e.flankT = 1;
    expect(squadIntent(e)).toBe('flank');
    e.coverT = 1;
    expect(squadIntent(e)).toBe('cover');
    e.coverT = 0;
    expect(squadIntent(e)).toBe('flank');
    e.flankT = 0;
    expect(squadIntent(e)).toBeNull();
  });

  it('places the flank point on the requested side of the player', () => {
    const world = worldWithThree();
    const leader = world.enemies[0];
    const player = { x: leader.x + 100, y: leader.y };
    const left = flankPoint(leader, player, 1);
    const right = flankPoint(leader, player, -1);
    expect(left.x).toBeCloseTo(player.x);
    expect(left.y).toBeGreaterThan(player.y);
    expect(right.y).toBeLessThan(player.y);
  });

  it('steers away from the nearest live grenade', () => {
    const world = worldWithThree();
    const e = world.enemies[0];
    world.grenades.push({
      id: 1,
      x: e.x - 30,
      y: e.y,
      vx: 0,
      vy: 0,
      life: 1,
      owner: 'enemy',
    });
    const threat = grenadeThreat(e, world.grenades);
    expect(threat).not.toBeNull();
    expect(threat!.x).toBeGreaterThan(e.x);
    world.grenades[0].life = 0;
    expect(grenadeThreat(e, world.grenades)).toBeNull();
  });
});
