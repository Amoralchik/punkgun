import type { Input } from '../core/input';
import type { Level, Station } from './map';
import type { RunMods } from './progression';
import { World } from './world';
import type { WorldEvent } from './world-types';

/** Safehouse world and nearest-station interaction. */
export function createHubWorld(
  level: Level,
  input: Input,
  emit: (event: WorldEvent) => void,
  mods: RunMods,
): World {
  return new World(
    level,
    input,
    emit,
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
    0,
  );
}

export function nearestStation(world: {
  player: { x: number; y: number };
  level: { stations: Station[] };
}): Station | null {
  let best: Station | null = null;
  let bestD = 74;
  for (const station of world.level.stations) {
    const d = Math.hypot(station.x - world.player.x, station.y - world.player.y);
    if (d < bestD) {
      bestD = d;
      best = station;
    }
  }
  return best;
}
