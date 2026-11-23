import { describe, expect, it } from 'vitest';
import { dist } from '../core/math';
import { LAYOUTS, TILE, loadLevel, worldToTile, type Level } from './map';
import { isStandable, offsetSpawn, pickSpawnPoints, snapToFloor } from './level-spawns';

const COMBAT = LAYOUTS.filter((l) => l.id !== 'safehouse');

function standable(level: Level, p: { x: number; y: number }): boolean {
  const { cx, cy } = worldToTile(p.x, p.y, level.h);
  return isStandable(level, cx, cy);
}

/** Grid-stepping sight test equivalent to World.lineClear for walls. */
function lineClear(level: Level) {
  return (ax: number, ay: number, bx: number, by: number): boolean => {
    const steps = Math.ceil(dist(ax, ay, bx, by) / 14);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const { cx, cy } = worldToTile(ax + (bx - ax) * t, ay + (by - ay) * t, level.h);
      if (level.walls[cy * level.w + cx] === 1 && level.glass[cy * level.w + cx] !== 1) return false;
    }
    return true;
  };
}

describe('level spawns', () => {
  it.each(COMBAT.map((l) => l.id))('%s: waves land on distinct standable floor away from the player', (id) => {
    const level = loadLevel(id);
    const points = pickSpawnPoints(level, { from: level.spawn, count: 4, lineClear: lineClear(level) });
    expect(points).toHaveLength(4);
    for (const p of points) {
      expect(standable(level, p)).toBe(true);
      expect(dist(p.x, p.y, level.spawn.x, level.spawn.y)).toBeGreaterThanOrEqual(TILE * 2);
    }
    const keys = new Set(points.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}`));
    expect(keys.size).toBe(points.length);
  });

  it.each(COMBAT.map((l) => l.id))('%s: risk extras never spawn inside geometry', (id) => {
    const level = loadLevel(id);
    for (const base of level.enemies) {
      for (let i = 0; i < 3; i++) expect(standable(level, offsetSpawn(level, base, i))).toBe(true);
    }
  });

  it('prefers points the player cannot see', () => {
    const level = loadLevel('sector07');
    const sight = lineClear(level);
    const points = pickSpawnPoints(level, { from: level.spawn, count: 2, lineClear: sight });
    for (const p of points) expect(sight(level.spawn.x, level.spawn.y, p.x, p.y)).toBe(false);
  });

  it('converges on an anchor when one is given', () => {
    const level = loadLevel('sector07');
    const free = pickSpawnPoints(level, { from: level.spawn, count: 2 });
    const anchored = pickSpawnPoints(level, { from: level.spawn, count: 2, anchor: level.exit });
    const mean = (ps: { x: number; y: number }[]) =>
      ps.reduce((s, p) => s + dist(p.x, p.y, level.exit.x, level.exit.y), 0) / ps.length;
    expect(mean(anchored)).toBeLessThanOrEqual(mean(free));
  });

  it('hosts no waves on levels without authored spawns', () => {
    const level = loadLevel('safehouse');
    expect(pickSpawnPoints(level, { from: level.spawn, count: 3 })).toEqual([]);
  });

  it('snaps wall points to the nearest floor tile', () => {
    const level = loadLevel('sector07');
    const p = snapToFloor(level, TILE * 0.5, TILE * 0.5); // corner wall tile
    expect(standable(level, p)).toBe(true);
  });
});
