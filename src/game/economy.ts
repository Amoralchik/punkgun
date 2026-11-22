import { GunId, WeaponId } from './weapons';

export interface WeaponEconomy {
  price: number;
  sell: number;
  /** Rounds included when buying this weapon. Melee weapons carry 0. */
  ammo: number;
}

export const WEAPON_ECONOMY: Record<Exclude<WeaponId, 'fists'>, WeaponEconomy> = {
  bat: { price: 40, sell: 20, ammo: 0 },
  pistol: { price: 70, sell: 35, ammo: 8 },
  shotgun: { price: 140, sell: 70, ammo: 6 },
  smg: { price: 190, sell: 95, ammo: 24 },
  rifle: { price: 260, sell: 130, ammo: 10 },
  ak: { price: 300, sell: 150, ammo: 30 },
  lmg: { price: 420, sell: 210, ammo: 60 },
};

export interface AmmoPack {
  add: number;
  cost: number;
  max: number;
}

export const AMMO_PACKS: Record<GunId, AmmoPack> = {
  pistol: { add: 8, cost: 25, max: 24 },
  shotgun: { add: 6, cost: 35, max: 18 },
  smg: { add: 24, cost: 20, max: 72 },
  rifle: { add: 10, cost: 30, max: 30 },
  ak: { add: 30, cost: 25, max: 90 },
  lmg: { add: 60, cost: 40, max: 180 },
};

/** Time bonus decays from 90 seconds; faster exits pay more. */
export function timeBonus(seconds: number): number {
  return Math.max(0, Math.round((90 - seconds) * 0.75));
}

export const LOOT_DEFS = {
  shard: { name: 'DATASHARD', value: 60, color: '#5ef1ff' },
  chip: { name: 'CREDCHIP', value: 45, color: '#ffc46b' },
  optic: { name: 'OPTIC', value: 90, color: '#ff2f8e' },
} as const;

export type LootKind = keyof typeof LOOT_DEFS;
