import { describe, expect, it } from 'vitest';
import { nearestStation } from './hub-flow';

describe('hub flow', () => {
  it('selects the nearest station inside interaction range', () => {
    const world = {
      player: { x: 0, y: 0 },
      level: {
        stations: [
          { x: 20, y: 0, kind: 'contracts' },
          { x: 70, y: 0, kind: 'market' },
        ],
      },
    } as unknown as Parameters<typeof nearestStation>[0];
    expect(nearestStation(world)?.kind).toBe('contracts');
    world.player.x = 500;
    expect(nearestStation(world)).toBeNull();
  });
});
