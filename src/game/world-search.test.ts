import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { loadLevel } from './map';
import { baseMods } from './progression';
import { World } from './world';
import { createBarkState, bark, barkForEvent, tickBarks } from './world-barks';
import { predictLostPosition, recordSighting } from './world-search';
import type { Enemy } from './world-types';

function makeWorld() {
  const input = {
    held: () => false,
    wasPressed: () => false,
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
  return new World(
    loadLevel('sector07'),
    input,
    () => {},
    { weapon: 'pistol', ammo: 20, attachment: null, variant: null, supplyType: null, supplyCharges: 0 },
    { objective: 'purge', requiredLoot: 0 },
    baseMods(),
    5,
  );
}

describe('lost-contact search', () => {
  it('tracks where the player was heading, not where they stood', () => {
    const w = makeWorld();
    const e = w.enemies[0];
    const host = { level: w.level, enemies: w.enemies, rand: () => 0.5, lineClear: () => true };
    recordSighting(e, w.level.spawn.x, w.level.spawn.y, 200, 0);
    predictLostPosition(host, e);
    expect(e.lastSeenX).toBeGreaterThan(w.level.spawn.x);
  });

  it('searchers split up across rooms and eventually stand down', () => {
    const w = makeWorld();
    w.player.camoT = 999; // unseen for the whole test
    w.player.invulnT = 999;
    // Infantry search; drones/hounds/netrunners run their own archetype loops.
    const infantry = ['grunt', 'gunner', 'rusher', 'stalker', 'heavy', 'marksman', 'shield', 'blade', 'medic', 'breacher'];
    const searchers = w.enemies.filter((e) => e.alive && infantry.includes(e.kind)).slice(0, 3);
    for (const e of w.enemies) if (!searchers.includes(e)) e.stunT = 999;
    const origin = searchers[0];
    for (const e of searchers) {
      e.stunT = 0;
      e.state = 'chase';
      recordSighting(e, origin.x, origin.y, 0, 0);
      e.searchT = 10;
    }
    const roomsClaimed = new Set<string>();
    let split = false;
    const aim = { x: w.player.x + 10, y: w.player.y };
    for (let i = 0; i < 60 * 40; i++) {
      w.update(1 / 60, aim, false);
      const sweeping = searchers.filter((e) => e.searchLeg === 'sweep' && e.searchRoom !== undefined);
      if (sweeping.length >= 2 && new Set(sweeping.map((e) => e.searchRoom)).size >= 2) split = true;
      for (const e of sweeping) roomsClaimed.add(`${e.id}:${e.searchRoom}`);
      if (searchers.every((e) => e.state === 'idle')) break;
    }
    expect(split).toBe(true);
    expect(searchers.every((e) => e.state === 'idle')).toBe(true);
  });
});

describe('barks', () => {
  const enemy = (id: number, x = 0, y = 0): Enemy =>
    ({ id, x, y, alive: true, kind: 'grunt', state: 'chase' }) as unknown as Enemy;

  it('calls contact on an alert and respects per-enemy cooldown', () => {
    const s = createBarkState();
    const e = enemy(1);
    barkForEvent(s, [e], { type: 'alert', x: 0, y: 0, angle: 0 }, { x: 500, y: 0 }, () => 0);
    expect(s.barks.map((b) => b.key)).toEqual(['contact']);
    expect(bark(s, e, 'flanking', () => 0, true)).toBe(false);
    tickBarks(s, 4);
    expect(s.barks).toHaveLength(0);
    expect(bark(s, e, 'flanking', () => 0)).toBe(true);
  });

  it('ignores the player\'s own grenades and voiceless units', () => {
    const s = createBarkState();
    barkForEvent(s, [enemy(1, 100, 0)], { type: 'fragThrow', x: 0, y: 0, angle: 0 }, { x: 0, y: 0 }, () => 0);
    expect(s.barks).toHaveLength(0);
    const drone = { ...enemy(2), kind: 'drone' } as Enemy;
    expect(bark(s, drone, 'contact', () => 0, true)).toBe(false);
  });
});
