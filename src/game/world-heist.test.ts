import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { loadLevel } from './map';
import { baseMods } from './progression';
import { heistMult } from './settlement';
import { World } from './world';
import type { WorldEvent } from './world-types';

function makeWorld(events: WorldEvent[] = []) {
  const input = { held: () => false, wasPressed: () => false } as unknown as Input;
  return new World(
    loadLevel('megatower', 21),
    input,
    (e) => events.push(e),
    { weapon: 'pistol', ammo: 20, attachment: null, variant: null, supplyType: null, supplyCharges: 0 },
    { objective: 'heist', requiredLoot: 0 },
    baseMods(),
    3,
  );
}

describe('heist', () => {
  it('a clean lift opens the exit without heat or a response', () => {
    const events: WorldEvent[] = [];
    const w = makeWorld(events);
    const core = w.objectives[0];
    expect(core.kind).toBe('case');
    const enemies = w.enemies.length;
    (w as unknown as { completeObjectiveNode(n: typeof core): void }).completeObjectiveNode(core);
    expect(w.exitOpen).toBe(true);
    expect(w.heat).toBe(0);
    expect(w.player.caseCarried).toBe(false);
    expect(w.enemies.length).toBe(enemies);
    expect(events.some((e) => e.type === 'coreStolen')).toBe(true);
  });

  it('being spotted blows the job once: heat, response team, pay cut', () => {
    const events: WorldEvent[] = [];
    const w = makeWorld(events);
    for (const e of w.enemies) e.stunT = 99;
    const enemies = w.enemies.length;
    w.detections = 1;
    w.update(1 / 60, { x: w.player.x + 10, y: w.player.y }, false);
    w.update(1 / 60, { x: w.player.x + 10, y: w.player.y }, false);
    expect(w.heistBlown).toBe(true);
    expect(w.heat).toBeGreaterThanOrEqual(55);
    expect(w.enemies.length).toBe(enemies + 3);
    expect(events.filter((e) => e.type === 'heistBlown')).toHaveLength(1);
    expect(heistMult('heist', false)).toBe(1.6);
    expect(heistMult('heist', true)).toBe(0.8);
    expect(heistMult('purge', true)).toBe(1);
  });
});
