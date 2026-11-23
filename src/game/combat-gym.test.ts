import { describe, expect, it } from 'vitest';
import { ENEMY_TRAITS, rollEnemyLoadout } from './enemy-data';
import type { Level } from './map';
import type { EnemyKind } from './world-types';
import type { Input } from '../core/input';
import { loadLevel, tileCenter } from './map';
import { baseMods } from './progression';
import { World } from './world';

const ATTACK_EVENTS = new Set([
  'enemyShot',
  'enemyShotgun',
  'sniperShot',
  'enemyPunch',
  'fragThrow',
  'operatorDeploy',
  'turretShot',
  'netrunnerHack',
]);

function fakeInput() {
  return {
    held: () => false,
    wasPressed: () => false,
    mousePressed: false,
    mouseDown: false,
    rightPressed: false,
  } as unknown as Input;
}

function gym(kind: EnemyKind): Level {
  const w = 24;
  const h = 18;
  const walls = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    walls[x] = 1;
    walls[(h - 1) * w + x] = 1;
  }
  for (let y = 0; y < h; y++) {
    walls[y * w] = 1;
    walls[y * w + w - 1] = 1;
  }
  const spawn = tileCenter(10, 9, h);
  return {
    id: 'sector07',
    name: 'GYM',
    w,
    h,
    walls,
    doors: [],
    spawn,
    enemies: [{ x: spawn.x + 190, y: spawn.y, kind }],
    weapons: [],
    loot: [],
    barrels: [],
    cameras: [],
    turrets: [],
    lasers: [],
    stations: [],
    exit: tileCenter(w - 3, h - 3, h),
    boss: null,
  };
}

function exercise(kind: EnemyKind) {
  const events: string[] = [];
  const level = gym(kind);
  const world = new World(
    level,
    fakeInput(),
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
  const player = world.player;
  const enemy = world.enemies[0];
  player.invulnT = 9999;
  enemy.state = 'chase';
  enemy.lastSeenX = player.x;
  enemy.lastSeenY = player.y;
  enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const startDist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
  let minDist = startDist;
  for (let i = 0; i < 100; i++) {
    world.update(0.05, { x: player.x + 100, y: player.y }, false);
    minDist = Math.min(minDist, Math.hypot(enemy.x - player.x, enemy.y - player.y));
  }
  return { world, enemy, events, startDist, minDist, player };
}

describe('combat gym', () => {
  it('has fourteen combat archetypes plus the boss', () => {
    const kinds = Object.keys(ENEMY_TRAITS).filter((kind) => kind !== 'boss');
    expect(kinds).toHaveLength(14);
  });

  it('makes every archetype engage a close, committed target', () => {
    const kinds = (Object.keys(ENEMY_TRAITS) as EnemyKind[]).filter(
      (kind) => kind !== 'boss',
    );
    for (const kind of kinds) {
      const { enemy, events, world, minDist } = exercise(kind);
      expect(enemy.alive, `${kind} died in the gym`).toBe(true);
      expect(enemy.state, `${kind} lost interest`).not.toBe('idle');
      expect(
        events.some((type) => ATTACK_EVENTS.has(type)),
        `${kind} never attacked; events=${events.join(',')}`,
      ).toBe(true);
      if (kind === 'rusher' || kind === 'blade' || kind === 'stalker') {
        expect(minDist, `${kind} failed to close`).toBeLessThan(130);
      }
      expect(world.player.alive).toBe(true);
    }
  });

  it('keeps the boss archetype in the arena with its own armor', () => {
    const { world } = exercise('boss');
    expect(world.boss?.maxArmor).toBe(3);
  });

  it('gives ranged archetypes a gun and melee archetypes fists', () => {
    for (const kind of ['sniper', 'marksman', 'gunner', 'heavy', 'operator', 'drone', 'breacher'] as const) {
      const loadout = rollEnemyLoadout(kind, () => 0.99);
      expect(loadout.weapon, `${kind} should be armed`).not.toBe('fists');
    }
    for (const kind of ['rusher', 'blade', 'stalker'] as const) {
      expect(rollEnemyLoadout(kind, () => 0.99).weapon).toBe('fists');
    }
  });
});
