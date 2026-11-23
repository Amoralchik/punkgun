import type { Level } from './map';
import { tileCenter } from './map';
import type { EnemyKind } from './world-types';

export const GYM_KINDS: EnemyKind[] = [
  'grunt',
  'shield',
  'sniper',
  'rusher',
  'gunner',
  'marksman',
  'heavy',
  'grenadier',
  'blade',
  'netrunner',
  'operator',
  'stalker',
  'breacher',
  'drone',
];

/** A flat, sealed arena used by the deterministic combat gym and balance matrix. */
export function gymLevel(kind: EnemyKind): Level {
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
