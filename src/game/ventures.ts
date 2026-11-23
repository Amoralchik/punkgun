export type VentureId = 'noodle' | 'clinic' | 'bar' | 'haven' | 'chop' | 'courier';

export interface VentureDef {
  id: VentureId;
  name: string;
  tagline: string;
  desc: string;
  color: string;
  maxLevel: number;
  baseCost: number;
  incomePerLevel: number;
  effect: string;
}

export const VENTURES: VentureDef[] = [
  {
    id: 'noodle',
    name: 'NOODLE STAND',
    tagline: 'Street food, clean books.',
    desc: 'A neon counter that never closes. Passive credits after every clear.',
    color: '#ffc46b',
    maxLevel: 3,
    baseCost: 220,
    incomePerLevel: 18,
    effect: '+$18 per clear / level',
  },
  {
    id: 'clinic',
    name: 'BACK-ALLEY CLINIC',
    tagline: 'No questions, no receipts.',
    desc: 'A ripperdoc front that bulk-buys supplies and implants.',
    color: '#7dffcf',
    maxLevel: 3,
    baseCost: 320,
    incomePerLevel: 12,
    effect: '-2% clinic/supply prices / level',
  },
  {
    id: 'bar',
    name: 'THE GREY MARKET',
    tagline: 'Everyone talks after midnight.',
    desc: 'A bar with a back room. Faction standing moves faster here.',
    color: '#ff2f8e',
    maxLevel: 3,
    baseCost: 400,
    incomePerLevel: 22,
    effect: '+1 faction rep per clear at level 2+',
  },
  {
    id: 'haven',
    name: 'DATA HAVEN',
    tagline: 'Cold racks, warm money.',
    desc: 'A server closet that brokers contract data.',
    color: '#5ef1ff',
    maxLevel: 3,
    baseCost: 480,
    incomePerLevel: 16,
    effect: '+2% contract pay / level',
  },
  {
    id: 'chop',
    name: 'CHOP SHOP',
    tagline: 'Every corpse is a parts bin.',
    desc: 'Salvage operation that strips the sector after you leave.',
    color: '#b38cff',
    maxLevel: 3,
    baseCost: 360,
    incomePerLevel: 10,
    effect: '+1 fabrication component per clear / level',
  },
  {
    id: 'courier',
    name: 'COURIER ROUTE',
    tagline: 'The city moves through you.',
    desc: 'A dispatch network that buys and moves hardware at scale.',
    color: '#ff7a4c',
    maxLevel: 3,
    baseCost: 300,
    incomePerLevel: 14,
    effect: '-2% weapon prices / level',
  },
];

export const VENTURE_MAP: Record<VentureId, VentureDef> = Object.fromEntries(
  VENTURES.map((venture) => [venture.id, venture]),
) as Record<VentureId, VentureDef>;

export type VentureRanks = Record<VentureId, number>;

export const EMPTY_VENTURES: VentureRanks = {
  noodle: 0,
  clinic: 0,
  bar: 0,
  haven: 0,
  chop: 0,
  courier: 0,
};

export function ventureCost(def: VentureDef, rank: number): number {
  return def.baseCost * (rank + 1);
}

export function ventureIncome(ranks: VentureRanks): number {
  return VENTURES.reduce(
    (sum, def) => sum + def.incomePerLevel * (ranks[def.id] ?? 0),
    0,
  );
}

export function venturePayMult(ranks: VentureRanks): number {
  return 1 + (ranks.haven ?? 0) * 0.02;
}

export function ventureClinicDiscount(ranks: VentureRanks): number {
  return (ranks.clinic ?? 0) * 0.02;
}

export function ventureMarketDiscount(ranks: VentureRanks): number {
  return (ranks.bar ?? 0) * 0.02;
}

export function ventureCourierDiscount(ranks: VentureRanks): number {
  return (ranks.courier ?? 0) * 0.02;
}

export function ventureComponentBonus(ranks: VentureRanks): number {
  return ranks.chop ?? 0;
}

export function ventureRepBonus(ranks: VentureRanks): number {
  return (ranks.bar ?? 0) >= 2 ? 1 : 0;
}
