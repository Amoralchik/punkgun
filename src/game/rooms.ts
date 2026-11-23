import type { RunMods } from './progression';

export type RoomId = 'window' | 'medbay' | 'armory' | 'server' | 'range' | 'vault';

export interface RoomUpgradeDef {
  id: RoomId;
  name: string;
  kicker: string;
  desc: string;
  effect: string;
  color: string;
  maxRank: 3;
  costs: [number, number, number];
}

export type RoomRanks = Record<RoomId, number>;

export const ROOM_UPGRADES: RoomUpgradeDef[] = [
  {
    id: 'window',
    name: 'PENTHOUSE VIEW',
    kicker: '// THE WINDOW',
    desc: 'Replace the sealed shutter with a floor-to-ceiling view of the rain and the tower lights.',
    effect: 'RANK 3: +1 ARMOR PLATE',
    color: '#5ef1ff',
    maxRank: 3,
    costs: [150, 300, 550],
  },
  {
    id: 'medbay',
    name: 'MED BAY',
    kicker: '// THE COT',
    desc: 'A clean cot, a stolen monitor, and a ripperdoc who owes you a favor.',
    effect: 'RANK 1: +1 PLATE · RANK 2: REGEN · RANK 3: +1 SUPPLY',
    color: '#7dffcf',
    maxRank: 3,
    costs: [180, 360, 650],
  },
  {
    id: 'armory',
    name: 'ARMORY',
    kicker: '// THE RACK',
    desc: 'Locked cases and a cleaning bench. The room smells of oil and cold metal.',
    effect: 'RELOAD -5% PER RANK',
    color: '#ffc46b',
    maxRank: 3,
    costs: [200, 400, 700],
  },
  {
    id: 'server',
    name: 'DATA SERVER',
    kicker: '// THE RACKS',
    desc: 'A humming stack that watches the market and the contract board for you.',
    effect: 'MARKET -$10/ROTATE · BOARD -$15/REFRESH PER RANK',
    color: '#b38cff',
    maxRank: 3,
    costs: [220, 440, 760],
  },
  {
    id: 'range',
    name: 'SHOOTING RANGE',
    kicker: '// THE LANE',
    desc: 'A narrow lane, a paper target, and a wall thick enough to keep the neighbors quiet.',
    effect: 'DASH CD -8% · SPREAD -3% PER RANK',
    color: '#ff2f8e',
    maxRank: 3,
    costs: [170, 340, 600],
  },
  {
    id: 'vault',
    name: 'VAULT',
    kicker: '// THE DOOR',
    desc: 'A salvaged bank door and a fence who trusts you with the good hardware.',
    effect: 'SELL +5% · INSURANCE -20% PER RANK',
    color: '#ff7a4c',
    maxRank: 3,
    costs: [240, 480, 820],
  },
];

export const ROOM_MAP: Record<RoomId, RoomUpgradeDef> = Object.fromEntries(
  ROOM_UPGRADES.map((upgrade) => [upgrade.id, upgrade]),
) as Record<RoomId, RoomUpgradeDef>;

export const EMPTY_ROOM: RoomRanks = {
  window: 0,
  medbay: 0,
  armory: 0,
  server: 0,
  range: 0,
  vault: 0,
};

export function roomCost(def: RoomUpgradeDef, rank: number): number {
  return def.costs[Math.min(def.maxRank - 1, Math.max(0, rank))];
}

export function applyRoomMods(mods: RunMods, rooms: RoomRanks): RunMods {
  const out = { ...mods };
  const armor = (rooms.window >= 3 ? 1 : 0) + (rooms.medbay >= 1 ? 1 : 0);
  out.armor = Math.max(0, Math.min(6, out.armor + armor));
  out.reload = Math.max(0.35, out.reload * (1 - rooms.armory * 0.05));
  out.spread = Math.max(0.25, out.spread * (1 - rooms.range * 0.03));
  out.dashCd = Math.max(0.55, out.dashCd * (1 - rooms.range * 0.08));
  out.regenBoost += rooms.medbay >= 2 ? 1 : 0;
  return out;
}
