import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { loadLevel, type LayoutId } from './map';
import { baseMods } from './progression';
import { World } from './world';
import { alertAt, type PerceptionHost } from './world-perception';
import type { MissionSpec, WorldEvent } from './world-types';

function fakeInput() {
  return {
    held: () => false,
    wasPressed: () => false,
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

function makeWorld(layout: LayoutId, mission: MissionSpec, events: WorldEvent[] = []) {
  return new World(
    loadLevel(layout),
    fakeInput(),
    (e) => events.push(e),
    { weapon: 'pistol', ammo: 20, attachment: null, variant: null, supplyType: null, supplyCharges: 0 },
    mission,
    baseMods(),
    7,
  );
}

describe('world setpieces', () => {
  it('blackout floor kills the cameras, narrows vision and adds two stalkers', () => {
    const plain = makeWorld('spire', { objective: 'purge', requiredLoot: 0 });
    const dark = makeWorld('spire', { objective: 'purge', requiredLoot: 0, setpiece: 'blackoutFloor' });
    expect(dark.enemies.length).toBe(plain.enemies.length + 2);
    expect(dark.enemies.filter((e) => e.kind === 'stalker').length).toBeGreaterThanOrEqual(2);
    expect(dark.modifierVision).toBeLessThan(plain.modifierVision);
    for (const cam of dark.cameras) expect(cam.disabledT).toBeGreaterThan(1000);
  });

  it('market patrol fills the street; a player round on a bystander costs heat', () => {
    const events: WorldEvent[] = [];
    const w = makeWorld('nightmarket', { objective: 'recover', requiredLoot: 1, setpiece: 'marketPatrol' }, events);
    expect(w.civilians.length).toBeGreaterThanOrEqual(7);
    const hostiles = w.aliveEnemies;
    const c = w.civilians[0];
    const heat = w.heat;
    w.bullets.push({
      x: c.x - 30, y: c.y, px: c.x - 30, py: c.y, vx: 1600, vy: 0,
      life: 1, ownerId: w.player.id, ownerKind: 'player', pierce: 0,
    });
    w.update(1 / 60, { x: w.player.x + 10, y: w.player.y }, false);
    expect(c.alive).toBe(false);
    expect(w.civiliansKilled).toBe(1);
    expect(w.heat).toBeGreaterThan(heat);
    expect(w.aliveEnemies).toBe(hostiles);
    expect(events.some((e) => e.type === 'civilianDown')).toBe(true);
  });

  it('civilians scatter from noise', () => {
    const w = makeWorld('nightmarket', { objective: 'recover', requiredLoot: 1, setpiece: 'marketPatrol' });
    const c = w.civilians[0];
    // Same noise path gunfire and explosions use.
    alertAt((w as unknown as { perceptionHost: PerceptionHost }).perceptionHost, c.x + 20, c.y, 300);
    expect(c.fleeT).toBeGreaterThan(0);
  });

  it('defended extraction digs a squad in at the exit once it opens', () => {
    const events: WorldEvent[] = [];
    const w = makeWorld('docks', { objective: 'purge', requiredLoot: 0, setpiece: 'defendedExtraction' }, events);
    for (const e of w.enemies) w.killEnemy(e, 'player', true);
    w.update(1 / 60, { x: w.player.x + 10, y: w.player.y }, false);
    expect(w.exitOpen).toBe(true);
    w.update(1 / 60, { x: w.player.x + 10, y: w.player.y }, false);
    const guards = w.enemies.filter((e) => e.alive);
    expect(guards.map((e) => e.kind).sort()).toEqual(['gunner', 'heavy', 'marksman']);
    expect(w.exitContested).toBe(true);
    for (const g of guards) {
      expect(Math.hypot(g.x - w.level.exit.x, g.y - w.level.exit.y)).toBeLessThanOrEqual(64 * 4.5 + 1);
    }
    for (const e of guards) w.killEnemy(e, 'player', true);
    expect(w.exitContested).toBe(false);
  });
});
