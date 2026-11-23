import { describe, expect, it } from 'vitest';
import type { Input } from '../core/input';
import type { RunLoadout } from './profile';
import { EMPTY_ATTRIBUTES } from './attributes';
import { EMPTY_CYBERWARE, EMPTY_PERKS, computeMods } from './progression';
import { GYM_KINDS, gymLevel } from './gym';
import type { EnemyKind } from './world-types';
import { World } from './world';

interface BuildSpec {
  id: string;
  weapon: RunLoadout['weapon'];
  ammo: number;
  attachment: RunLoadout['attachment'];
  melee: boolean;
  mods: ReturnType<typeof computeMods>;
  ability: boolean;
}

function build(
  id: string,
  weapon: RunLoadout['weapon'],
  ammo: number,
  attachment: RunLoadout['attachment'],
  cyberware: Partial<typeof EMPTY_CYBERWARE>,
  perks: Partial<typeof EMPTY_PERKS>,
  attributes: Partial<typeof EMPTY_ATTRIBUTES>,
  ability = false,
): BuildSpec {
  return {
    id,
    weapon,
    ammo,
    attachment,
    melee: weapon === 'bat' || weapon === 'fists',
    mods: computeMods(
      { ...EMPTY_CYBERWARE, ...cyberware },
      { ...EMPTY_PERKS, ...perks },
      { ...EMPTY_ATTRIBUTES, ...attributes },
    ),
    ability,
  };
}

const BUILDS: BuildSpec[] = [
  build(
    'LONGSHOT',
    'dmr',
    36,
    'laser',
    { subdermal: 2, smartlink: 2, reloadTuner: 2, painEditor: 1, targeting: 1 },
    { gunslinger: 3, marksman: 2, gunsmith: 2 },
    { body: 4, reflexes: 5, cool: 4, tech: 6 },
  ),
  build(
    'BLADE',
    'bat',
    0,
    null,
    { mantis: 2, gorilla: 2, reflex: 2, subdermal: 2, adrenaline: 2, biomonitor: 2 },
    { brawler: 3, bladeDancer: 1, sprinter: 2 },
    { body: 7, reflexes: 6, cool: 4, tech: 3 },
  ),
  build(
    'GHOST',
    'pistol',
    60,
    'suppressor',
    { camo: 2, sandevistan: 2, ocular: 2, reloadTuner: 1, neuralLink: 2, subdermal: 2 },
    { ghost: 3, shadow: 2, gunslinger: 2 },
    { body: 3, reflexes: 5, cool: 7, tech: 4 },
    true,
  ),
];

class PilotInput {
  keymap: Record<string, string> = {};
  setKeymap(map: Record<string, string>): void {
    this.keymap = map;
  }
  readonly keys = new Set<string>();
  readonly pressed = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  rightDown = false;
  mousePressed = false;
  rightPressed = false;

  held(code: string): boolean {
    return this.keys.has(code);
  }
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }
  endFrame(): void {}
  clear(): void {
    this.keys.clear();
    this.pressed.clear();
    this.mousePressed = false;
    this.rightPressed = false;
  }
}

function duel(spec: BuildSpec, kind: EnemyKind, seed: number): { won: boolean; time: number } {
  const level = gymLevel(kind);
  const input = new PilotInput();
  const world = new World(
    level,
    input as unknown as Input,
    () => {},
    {
      weapon: spec.weapon,
      ammo: spec.ammo,
      attachment: spec.attachment,
      variant: null,
      supplyType: null,
      supplyCharges: 0,
    },
    { objective: 'purge', requiredLoot: 0 },
    spec.mods,
    seed,
  );
  const player = world.player;
  const enemy = world.enemies[0];
  enemy.state = 'chase';
  enemy.lastSeenX = player.x;
  enemy.lastSeenY = player.y;
  enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);

  let time = 0;
  while (time < 20 && enemy.alive && player.alive) {
    input.clear();
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const d = Math.hypot(dx, dy);
    const aim = { x: enemy.x, y: enemy.y };
    if (spec.melee) {
      if (d > 40) {
        if (Math.abs(dx) > 4) input.keys.add(dx > 0 ? 'KeyD' : 'KeyA');
        if (Math.abs(dy) > 4) input.keys.add(dy > 0 ? 'KeyW' : 'KeyS');
      }
      if (d < 82) input.mousePressed = true;
    } else {
      if (d < 160) {
        if (Math.abs(dx) > 4) input.keys.add(dx > 0 ? 'KeyA' : 'KeyD');
      } else if (d > 330) {
        if (Math.abs(dx) > 4) input.keys.add(dx > 0 ? 'KeyD' : 'KeyA');
      } else if (Math.floor(time * 2) % 2 === 0) {
        input.keys.add('KeyA');
      } else {
        input.keys.add('KeyD');
      }
      if (d > 400) input.keys.add(dy > 0 ? 'KeyW' : 'KeyS');
      if (player.reloadT <= 0 && player.clip <= 0) input.pressed.add('KeyR');
      if (player.clip > 0) {
        input.mouseDown = true;
        input.mousePressed = true;
      }
    }
    if (spec.ability) {
      if (player.slowCd <= 0) input.pressed.add('ShiftLeft');
      if (player.camoCloakCd <= 0) input.pressed.add('KeyC');
    }
    world.update(0.05, aim, true);
    time += 0.05;
  }
  return { won: !enemy.alive && player.alive, time };
}

describe('three-build clear-rate matrix', () => {
  it('records every build against every archetype', () => {
    const rows: Array<{ build: string; archetype: string; clear: number }> = [];
    const perBuild = new Map<string, number>();
    const perKind = new Map<string, number>();
    for (const spec of BUILDS) {
      for (const kind of GYM_KINDS) {
        let wins = 0;
        for (const seed of [1, 2, 3]) {
          if (duel(spec, kind, seed).won) wins++;
        }
        rows.push({ build: spec.id, archetype: kind, clear: wins / 3 });
        perBuild.set(spec.id, (perBuild.get(spec.id) ?? 0) + wins / 3);
        perKind.set(kind, (perKind.get(kind) ?? 0) + wins / 3);
      }
    }
    console.table(rows);
    const rates = [...perBuild.values()].map((value) => value / GYM_KINDS.length);
    expect(rates.every((rate) => rate > 0.15)).toBe(true);
    expect([...perKind.values()].every((value) => value > 0)).toBe(true);
    expect(Math.max(...rates) - Math.min(...rates)).toBeLessThan(0.55);
  });
});
