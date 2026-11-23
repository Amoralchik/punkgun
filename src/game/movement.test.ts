import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { gymLevel } from './gym';
import { playerMoveSpeed } from './world-player';
import { baseMods } from './progression';
import { World } from './world';

function fakeInput(pressed = new Set<string>()) {
  return {
    held: () => false,
    wasPressed: (code: string) => pressed.has(code),
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

function makeWorld(pressed = new Set<string>(), mods = baseMods()) {
  return new World(
    gymLevel('grunt'),
    fakeInput(pressed),
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
    mods,
    42,
  );
}

describe('combat kit', () => {
  it('dashes in the aim direction, then cools down', () => {
    const pressed = new Set(['Space']);
    const world = makeWorld(pressed);
    world.player.invulnT = 9999;
    const startX = world.player.x;
    world.update(0.05, { x: world.player.x + 200, y: world.player.y }, true);
    expect(world.player.x).toBeGreaterThan(startX + 20);
    expect(world.player.dashCd).toBeGreaterThan(0);
    pressed.clear();
    world.update(0.05, { x: world.player.x + 200, y: world.player.y }, false);
    expect(world.player.dashT).toBeLessThanOrEqual(0.16);
  });

  it('executes a stunned enemy and starts a combo', () => {
    const pressed = new Set(['KeyE']);
    const world = makeWorld(pressed);
    const enemy = world.enemies[0];
    world.player.invulnT = 9999;
    enemy.stunT = 2;
    enemy.x = world.player.x + 30;
    enemy.y = world.player.y;
    world.update(1 / 120, { x: enemy.x, y: enemy.y }, true);
    expect(enemy.alive).toBe(false);
    expect(world.stealthKills).toBe(1);
    expect(world.combo).toBe(1);
    expect(world.player.dashCd).toBe(0);
  });

  it('quickhacks the visible target without a target cooldown', () => {
    const pressed = new Set(['KeyZ']);
    const mods = { ...baseMods(), deck: 1 };
    const world = makeWorld(pressed, mods);
    const enemy = world.enemies[0];
    enemy.x = world.player.x + 120;
    enemy.y = world.player.y;
    world.update(1 / 120, { x: enemy.x, y: enemy.y }, true);
    expect(enemy.stunT).toBeGreaterThan(1);
    expect(world.player.quickhackCd).toBeGreaterThan(0);

    pressed.clear();
    world.player.quickhackCd = 0;
    pressed.add('KeyZ');
    world.update(1 / 120, { x: world.player.x - 400, y: world.player.y }, true);
    expect(world.player.quickhackCd).toBe(0);
  });

  it('expires the combo window and keeps the best streak', () => {
    const pressed = new Set(['KeyE']);
    const world = makeWorld(pressed);
    const enemy = world.enemies[0];
    world.player.invulnT = 9999;
    enemy.stunT = 2;
    enemy.x = world.player.x + 30;
    enemy.y = world.player.y;
    world.update(1 / 120, { x: enemy.x, y: enemy.y }, true);
    expect(world.combo).toBe(1);
    pressed.clear();
    world.update(4, { x: world.player.x + 100, y: world.player.y }, false);
    expect(world.combo).toBe(0);
    expect(world.bestCombo).toBe(1);
  });

  it('locks dash and slows movement while carrying the extraction case', () => {
    const events: string[] = [];
    const pressed = new Set(['KeyE']);
    const world = new World(
      gymLevel('grunt'),
      fakeInput(pressed),
      (e) => events.push(e.type),
      {
        weapon: 'fists',
        ammo: 0,
        attachment: null,
        variant: null,
        supplyType: null,
        supplyCharges: 0,
      },
      { objective: 'extraction', requiredLoot: 0 },
      baseMods(),
      42,
    );
    const node = world.objectives[0];
    expect(node.kind).toBe('case');
    node.x = 400;
    node.y = 300;
    const freeSpeed = playerMoveSpeed(baseMods(), { ...world.player, caseCarried: false });
    world.player.x = node.x;
    world.player.y = node.y;
    world.update(1 / 120, { x: node.x + 100, y: node.y }, true);
    expect(node.completed).toBe(true);
    expect(world.player.caseCarried).toBe(true);
    expect(playerMoveSpeed(baseMods(), world.player)).toBeCloseTo(freeSpeed * 0.78, 5);

    pressed.clear();
    pressed.add('Space');
    const x0 = world.player.x;
    world.update(0.05, { x: world.player.x + 200, y: world.player.y }, true);
    expect(world.player.dashT).toBeLessThanOrEqual(0);
    expect(world.player.x).toBeLessThan(x0 + 30);
    expect(events).toContain('caseHeavy');
  });
});
