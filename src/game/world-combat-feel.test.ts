import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { loadLevel } from './map';
import { baseMods } from './progression';
import { OVERTIME_WAVE, World } from './world';

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
    11,
  );
}

describe('combat weight', () => {
  it('armor hits stagger the target and open an execution', () => {
    const w = makeWorld();
    const e = w.enemies[0];
    e.kind = 'heavy';
    e.armor = 2;
    e.maxArmor = 2;
    e.stunT = 0;
    w.damageHeavy(e, 0);
    expect(e.alive).toBe(true);
    expect(e.staggerT).toBeGreaterThan(0);
    expect(e.stunT).toBeGreaterThan(0);
    w.player.x = e.x - 40;
    w.player.y = e.y;
    expect(w.executionTarget()).toBe(e);
  });

  it('bosses never stagger', () => {
    const w = makeWorld();
    const e = w.enemies[0];
    e.kind = 'boss';
    e.stunT = 0;
    w.stagger(e, 1);
    expect(e.stunT).toBe(0);
  });

  it('planting steadies the gun; moving throws it off', () => {
    const w = makeWorld();
    for (const e of w.enemies) e.stunT = 99;
    const aim = { x: w.player.x + 100, y: w.player.y };
    for (let i = 0; i < 60; i++) w.update(1 / 60, aim, false);
    expect(w.player.steady ?? 0).toBeGreaterThan(0.9);
    w.player.vx = 300;
    w.update(1 / 60, aim, false);
    w.player.vx = 300;
    w.update(1 / 60, aim, false);
    expect(w.player.steady ?? 0).toBeLessThan(0.9);
  });

  it('lingering past an open exit drops hunters on a clock', () => {
    const w = makeWorld();
    w.player.invulnT = 999;
    for (const e of w.enemies) w.killEnemy(e, 'player', true);
    const aim = { x: w.player.x + 50, y: w.player.y };
    w.update(1 / 60, aim, false);
    expect(w.exitOpen).toBe(true);
    expect(w.objectiveText()).toContain('HUNTERS IN');
    for (let t = 0; t < OVERTIME_WAVE + 0.5; t += 0.25) w.update(0.25, aim, false);
    expect(w.overtimeWaves).toBe(1);
    expect(w.enemies.filter((e) => e.alive).map((e) => e.kind).sort()).toEqual(['rusher', 'stalker']);
  });
});
