import type { FactionId } from './lore';

export type Reputation = Record<FactionId, number>;

export const EMPTY_REPUTATION: Reputation = {
  helix: 0,
  teeth: 0,
  orbit: 0,
  sublevel: 0,
  market: 0,
};

export interface RepRank {
  min: number;
  name: string;
  color: string;
}

export const REP_RANKS: RepRank[] = [
  { min: 0, name: 'UNKNOWN', color: '#8a97a8' },
  { min: 2, name: 'KNOWN', color: '#ffc46b' },
  { min: 5, name: 'CONNECTED', color: '#5ef1ff' },
  { min: 9, name: 'TRUSTED', color: '#ff2f8e' },
  { min: 14, name: 'LEGEND', color: '#b38cff' },
];

export function repRankIndex(value: number): number {
  let index = 0;
  for (let i = 0; i < REP_RANKS.length; i++) {
    if (value >= REP_RANKS[i].min) index = i;
  }
  return index;
}

export function repRank(value: number): RepRank {
  return REP_RANKS[repRankIndex(value)];
}

/** 3% off per rank, capped at 15%. */
export function repDiscount(value: number): number {
  return Math.min(0.15, repRankIndex(value) * 0.03);
}

/** 2% pay per rank, capped at 10%. */
export function repPayBonus(value: number): number {
  return Math.min(0.1, repRankIndex(value) * 0.02);
}

export function nextRepRank(value: number): { rank: RepRank; remaining: number } | null {
  const index = repRankIndex(value);
  const next = REP_RANKS[index + 1];
  if (!next) return null;
  return { rank: next, remaining: Math.max(0, next.min - value) };
}

export function normalizeReputation(
  raw: Partial<Record<FactionId, number>> | undefined,
): Reputation {
  const out: Reputation = { ...EMPTY_REPUTATION };
  if (!raw) return out;
  for (const key of Object.keys(out) as FactionId[]) {
    const value = raw[key];
    out[key] =
      typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  return out;
}

/** 2% better sale value per rank, capped at 10%. */
export function repSellBonus(value: number): number {
  return Math.min(0.1, repRankIndex(value) * 0.02);
}
