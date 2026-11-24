import { describe, expect, it } from 'vitest';
import { BIOMES, generateLayout } from './levelgen';
import { loadLevel, worldToTile } from './map';
import { Pathfinder } from './path';

describe('procedural levels', () => {
  it('is deterministic per seed and varies across seeds', () => {
    for (const biome of BIOMES) {
      expect(generateLayout(biome, 42).rows).toEqual(generateLayout(biome, 42).rows);
      expect(generateLayout(biome, 42).rows).not.toEqual(generateLayout(biome, 43).rows);
    }
  });

  it.each(BIOMES)('%s: 25 seeds are fully connected and populated', (biome) => {
    for (let seed = 100; seed < 125; seed++) {
      const level = loadLevel(biome, seed);
      expect(level.generated).toBe(true);
      expect(level.enemies.length).toBeGreaterThanOrEqual(6);
      expect(level.loot.length).toBeGreaterThanOrEqual(3);
      const from = worldToTile(level.spawn.x, level.spawn.y, level.h);
      const pf = new Pathfinder(level.w, level.h);
      // Every floor tile reachable: no sealed rooms.
      const exit = worldToTile(level.exit.x, level.exit.y, level.h);
      const exitOk = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(
        ([dx, dy]) => pf.find(level, from.cx, from.cy, exit.cx + dx, exit.cy + dy) !== null,
      );
      expect(exitOk, `${biome}#${seed} exit sealed`).toBe(true);
      for (const p of [...level.enemies, ...level.loot]) {
        const to = worldToTile(p.x, p.y, level.h);
        expect(pf.find(level, from.cx, from.cy, to.cx, to.cy), `${biome}#${seed} ${to.cx},${to.cy}`).not.toBeNull();
      }
    }
  });

  it('furniture is cover: solid but see-through', () => {
    const level = loadLevel('megatower', 7);
    const i = level.low!.findIndex((v) => v === 1);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(level.walls[i]).toBe(1);
    expect(level.propKind![i]).toBeGreaterThan(0);
  });
});
