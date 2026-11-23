import type { WeaponId } from './weapons';

export const CASE_COLS = 10;
export const CASE_ROWS = 6;
export const CASE_CELL = 50;

export interface CasePlacement {
  cellX: number;
  cellY: number;
  turned: boolean;
}

export interface CaseEntry extends CasePlacement {
  id: string;
  weapon: WeaponId;
}

export function baseSize(weapon: WeaponId): { w: number; h: number } {
  if (weapon === 'lmg' || weapon === 'railgun' || weapon === 'plasma') return { w: 4, h: 1 };
  if (
    weapon === 'rifle' ||
    weapon === 'dmr' ||
    weapon === 'ak' ||
    weapon === 'shotgun' ||
    weapon === 'carbine' ||
    weapon === 'bat'
  ) {
    return { w: 3, h: 1 };
  }
  if (weapon === 'pistol' || weapon === 'revolver' || weapon === 'smg' || weapon === 'needler') {
    return { w: 2, h: 1 };
  }
  return { w: 1, h: 1 };
}

export function caseSize(weapon: WeaponId, turned: boolean): { w: number; h: number } {
  const s = baseSize(weapon);
  return turned ? { w: s.h, h: s.w } : s;
}

export function canPlace(
  items: CaseEntry[],
  id: string,
  weapon: WeaponId,
  x: number,
  y: number,
  turned: boolean,
): boolean {
  const size = caseSize(weapon, turned);
  if (x < 0 || y < 0 || x + size.w > CASE_COLS || y + size.h > CASE_ROWS) return false;
  const occupied = new Set<number>();
  for (const other of items) {
    if (other.id === id) continue;
    const os = caseSize(other.weapon, other.turned);
    if (other.cellX < 0 || other.cellY < 0) continue;
    for (let yy = 0; yy < os.h; yy++) {
      for (let xx = 0; xx < os.w; xx++) {
        occupied.add((other.cellY + yy) * CASE_COLS + (other.cellX + xx));
      }
    }
  }
  for (let yy = 0; yy < size.h; yy++) {
    for (let xx = 0; xx < size.w; xx++) {
      if (occupied.has((y + yy) * CASE_COLS + (x + xx))) return false;
    }
  }
  return true;
}

export function findFree(
  items: CaseEntry[],
  id: string,
  weapon: WeaponId,
): CasePlacement | null {
  for (const turned of [false, true]) {
    for (let y = 0; y < CASE_ROWS; y++) {
      for (let x = 0; x < CASE_COLS; x++) {
        if (canPlace(items, id, weapon, x, y, turned)) return { cellX: x, cellY: y, turned };
      }
    }
  }
  return null;
}
