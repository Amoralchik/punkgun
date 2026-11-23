import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import { BOSSES, BOSS_ORDER } from './bosses';
import { loadLevel, worldToTile, type LayoutId } from './map';
import { Pathfinder } from './path';
import { baseMods } from './progression';
import { World } from './world';
import type { MissionSpec } from './world-types';

function fakeInput(pressed = new Set<string>()) {
  return {
    held: () => false,
    wasPressed: (code: string) => pressed.has(code),
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

function makeWorld(
  mission: MissionSpec,
  pressed = new Set<string>(),
  layoutId: LayoutId = 'safehouse',
) {
  return new World(
    loadLevel(layoutId),
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
    mission,
    baseMods(),
    42,
  );
}

describe('mission objectives', () => {
  it('creates and completes sabotage terminals', () => {
    const pressed = new Set<string>();
    const world = makeWorld({ objective: 'sabotage', requiredLoot: 2 }, pressed);
    expect(world.objectives).toHaveLength(2);
    expect(world.objectiveText()).toContain('SABOTAGE 0/2');

    for (const node of world.objectives) {
      world.player.x = node.x;
      world.player.y = node.y;
      pressed.add('KeyE');
      world.update(1 / 120, { x: node.x + 50, y: node.y }, true);
      pressed.clear();
      world.resolveBreach(node.id, true);
    }

    expect(world.objectives.every((node) => node.completed)).toBe(true);
    expect(world.exitOpen).toBe(true);
    expect(world.objectiveText()).toBe('EXIT OPEN — GET OUT');
  });

  it('opens a breach before completing a sabotage terminal', () => {
    const pressed = new Set<string>();
    const events: string[] = [];
    const world = new World(
      loadLevel('safehouse'),
      fakeInput(pressed),
      (event) => events.push(event.type),
      {
        weapon: 'fists',
        ammo: 0,
        attachment: null,
        variant: null,
        supplyType: null,
        supplyCharges: 0,
      },
      { objective: 'sabotage', requiredLoot: 1 },
      baseMods(),
      42,
    );
    const node = world.objectives[0];
    world.player.x = node.x;
    world.player.y = node.y;
    pressed.add('KeyE');
    world.update(1 / 120, { x: node.x + 50, y: node.y }, true);
    expect(node.completed).toBe(false);
    expect(events).toContain('breachStart');
    world.resolveBreach(node.id, true);
    expect(node.completed).toBe(true);
    expect(world.exitOpen).toBe(true);
  });

  it('breaches a camera and disables it', () => {
    const pressed = new Set<string>();
    const events: string[] = [];
    const world = new World(
      loadLevel('sector07'),
      fakeInput(pressed),
      (event) => events.push(event.type),
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
    world.enemies.length = 0;
    const camera = world.cameras[0];
    world.player.x = camera.x;
    world.player.y = camera.y;
    pressed.add('KeyE');
    world.update(1 / 120, { x: camera.x + 50, y: camera.y }, true);
    expect(events).toContain('breachStart');
    expect(world.promptText()).toBe('E — BREACH CAMERA');
    world.resolveHazardBreach('camera', camera.id, true);
    expect(camera.alive).toBe(false);
  });

  it('secures an extraction case and applies pressure', () => {
    const pressed = new Set<string>();
    const world = makeWorld({ objective: 'extraction', requiredLoot: 1 }, pressed);
    const node = world.objectives[0];
    expect(node?.kind).toBe('case');
    world.player.x = node.x;
    world.player.y = node.y;
    pressed.add('KeyE');
    world.update(1 / 120, { x: node.x + 50, y: node.y }, true);

    expect(node.completed).toBe(true);
    expect(world.exitOpen).toBe(true);
    expect(world.objectiveText()).toBe('EXIT OPEN — GET OUT');
  });

  it('holds a defense zone until the timer completes', () => {
    const world = makeWorld({ objective: 'defense', requiredLoot: 0 });
    const zone = world.objectives[0];
    expect(zone?.kind).toBe('zone');
    world.player.x = zone.x;
    world.player.y = zone.y;
    for (let i = 0; i < 200; i++) {
      world.update(0.25, { x: zone.x + 50, y: zone.y }, false);
    }
    expect(zone.completed).toBe(true);
    expect(world.exitOpen).toBe(true);
    expect(world.defenseT).toBeGreaterThanOrEqual(45);
  });

  it('applies dialogue boons to the run', () => {
    const world = makeWorld({
      objective: 'purge',
      requiredLoot: 0,
      boons: ['armor', 'quiet'],
    });
    expect(world.player.maxArmor).toBe(1);
    expect(world.player.armor).toBe(1);
    expect(world.modifierVision).toBeCloseTo(0.85);
  });

  it('spawns each boss archetype in a reachable arena tile', () => {
    for (const id of BOSS_ORDER) {
      const layoutId = BOSSES[id].layoutId;
      const world = makeWorld(
        {
          objective: 'boss',
          requiredLoot: 0,
          bossId: id,
        },
        new Set<string>(),
        layoutId,
      );
      const boss = world.boss;
      expect(boss).not.toBeNull();
      expect(boss?.maxArmor).toBe(BOSSES[id].armor);
      expect(world.bossName).toBe(BOSSES[id].name);

      const level = world.level;
      const from = worldToTile(world.player.x, world.player.y, level.h);
      const to = worldToTile(boss!.x, boss!.y, level.h);
      const path = new Pathfinder(level.w, level.h).find(
        level,
        from.cx,
        from.cy,
        to.cx,
        to.cy,
      );
      expect(path).not.toBeNull();
    }
  });
});
