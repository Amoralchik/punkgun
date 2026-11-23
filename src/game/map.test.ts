import { describe, expect, it } from 'vitest';
import { LAYOUTS, loadLevel, worldToTile } from './map';
import { Pathfinder } from './path';

describe('layout connectivity', () => {
  const combat = LAYOUTS.filter((layout) => layout.id !== 'safehouse');

  it('opens a spawn-to-exit path on every combat layout', () => {
    for (const layout of combat) {
      const level = loadLevel(layout.id);
      const from = worldToTile(level.spawn.x, level.spawn.y, level.h);
      const exit = worldToTile(level.exit.x, level.exit.y, level.h);
      const pathfinder = new Pathfinder(level.w, level.h);
      const exitNeighbours = [
        { cx: exit.cx - 1, cy: exit.cy },
        { cx: exit.cx + 1, cy: exit.cy },
        { cx: exit.cx, cy: exit.cy - 1 },
        { cx: exit.cx, cy: exit.cy + 1 },
      ];
      const reachable = exitNeighbours.some(
        (to) => pathfinder.find(level, from.cx, from.cy, to.cx, to.cy) !== null,
      );
      expect(reachable, `${layout.id} exit is sealed`).toBe(true);
    }
  });

  it('keeps every cache and weapon spawn reachable', () => {
    for (const layout of combat) {
      const level = loadLevel(layout.id);
      const from = worldToTile(level.spawn.x, level.spawn.y, level.h);
      const pathfinder = new Pathfinder(level.w, level.h);
      for (const spawn of [...level.loot, ...level.weapons]) {
        const to = worldToTile(spawn.x, spawn.y, level.h);
        expect(
          pathfinder.find(level, from.cx, from.cy, to.cx, to.cy),
          `${layout.id} unreachable pickup at ${to.cx},${to.cy}`,
        ).not.toBeNull();
      }
    }
  });

  it('ships the expanded ten-layout combat set', () => {
    expect(combat).toHaveLength(10);
    expect(combat.map((layout) => layout.id)).toEqual(
      expect.arrayContaining(['transit', 'arcology', 'freighter', 'nightclub']),
    );
  });
});
