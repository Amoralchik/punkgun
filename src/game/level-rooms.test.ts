import { describe, expect, it } from 'vitest';
import { gymLevel } from './gym';
import { LAYOUTS, loadLevel, worldToTile, type LayoutId } from './map';
import { Pathfinder } from './path';
import { findRooms, pickCaseTile, pickTerminalTiles, pickZoneTile, roomAt } from './level-rooms';

const combat = LAYOUTS.filter((layout) => layout.id !== 'safehouse');

describe('room detection', () => {
  it('sees the sealed gym arena as a single room', () => {
    const level = gymLevel('grunt');
    const map = findRooms(level);
    expect(map.rooms).toHaveLength(1);
    expect(roomAt(map, level, level.spawn.x, level.spawn.y)).toBe(0);
  });

  it('partitions every combat layout into door-bounded rooms that cover all floor tiles', () => {
    for (const layout of combat) {
      const level = loadLevel(layout.id);
      const map = findRooms(level);
      const doors = new Set(level.doors.map((d) => d.cy * level.w + d.cx));
      let floor = 0;
      for (let i = 0; i < level.w * level.h; i++) {
        if (level.walls[i] === 1) continue;
        if (doors.has(i)) continue;
        floor++;
        expect(map.tileRoom[i], `${layout.id} tile ${i} missing a room`).toBeGreaterThanOrEqual(0);
      }
      expect(
        map.rooms.reduce((sum, room) => sum + room.tiles, 0),
        `${layout.id} room tiles must sum to floor tiles`,
      ).toBe(floor);
      // Every room anchor is a standable floor tile.
      for (const room of map.rooms) {
        const { cx, cy } = worldToTile(room.ax, room.ay, level.h);
        expect(level.walls[cy * level.w + cx], `${layout.id} room ${room.id} anchor in a wall`).toBe(0);
      }
    }
  });

  it('places the extraction case far from spawn and off the exit room', () => {
    for (const layout of combat) {
      const level = loadLevel(layout.id);
      const map = findRooms(level);
      const tile = pickCaseTile(level, map);
      const exitRoom = roomAt(map, level, level.exit.x, level.exit.y);
      const tileRoom = roomAt(map, level, tile.x, tile.y);
      expect(tileRoom).toBeGreaterThanOrEqual(0);
      if (map.rooms.length > 1) expect(tileRoom).not.toBe(exitRoom);
      // Reachable from spawn through doors.
      const from = worldToTile(level.spawn.x, level.spawn.y, level.h);
      const to = worldToTile(tile.x, tile.y, level.h);
      expect(new Pathfinder(level.w, level.h).find(level, from.cx, from.cy, to.cx, to.cy)).not.toBeNull();
    }
  });

  it('spreads sabotage terminals across distinct guarded rooms', () => {
    const level = loadLevel('sector07' as LayoutId);
    const map = findRooms(level);
    const tiles = pickTerminalTiles(level, map, 3, []);
    expect(tiles).toHaveLength(3);
    const rooms = tiles.map((tile) => roomAt(map, level, tile.x, tile.y));
    expect(new Set(rooms).size).toBe(3);
  });

  it('puts the defense zone at the largest room anchor, reachable from spawn', () => {
    for (const layout of combat) {
      const level = loadLevel(layout.id);
      const map = findRooms(level);
      const zone = pickZoneTile(level, map);
      const { cx, cy } = worldToTile(zone.x, zone.y, level.h);
      expect(level.walls[cy * level.w + cx]).toBe(0);
      const from = worldToTile(level.spawn.x, level.spawn.y, level.h);
      expect(new Pathfinder(level.w, level.h).find(level, from.cx, from.cy, cx, cy)).not.toBeNull();
    }
  });
});
