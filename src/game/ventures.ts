export type VentureId = 'noodle' | 'clinic' | 'bar' | 'haven' | 'chop' | 'courier';

export interface VentureDef {
  id: VentureId;
  name: string;
  tagline: string;
  taglineEs: string;
  desc: string;
  descEs: string;
  color: string;
  maxLevel: number;
  baseCost: number;
  incomePerLevel: number;
  effect: string;
  effectEs: string;
}

export const VENTURES: VentureDef[] = [
  {
    id: 'noodle',
    name: 'NOODLE STAND',
    tagline: 'Street food, clean books.',
    taglineEs: 'Comida callejera, libros limpios.',
    desc: 'A neon counter that never closes. Passive credits after every clear.',
    descEs: 'Una barra de neón que nunca cierra. Créditos pasivos tras cada limpieza.',
    color: '#ffc46b',
    maxLevel: 3,
    baseCost: 220,
    incomePerLevel: 18,
    effect: '+$18 per clear / level',
    effectEs: '+$18 por limpieza / nivel',
  },
  {
    id: 'clinic',
    name: 'BACK-ALLEY CLINIC',
    tagline: 'No questions, no receipts.',
    taglineEs: 'Sin preguntas, sin recibos.',
    desc: 'A ripperdoc front that bulk-buys supplies and implants.',
    descEs: 'Una tapadera de ripperdoc que compra suministros e implantes al por mayor.',
    color: '#7dffcf',
    maxLevel: 3,
    baseCost: 320,
    incomePerLevel: 12,
    effect: '-2% clinic/supply prices / level',
    effectEs: '-2% precios de clínica/suministros / nivel',
  },
  {
    id: 'bar',
    name: 'THE GREY MARKET',
    tagline: 'Everyone talks after midnight.',
    taglineEs: 'Todos hablan después de medianoche.',
    desc: 'A bar with a back room. Faction standing moves faster here.',
    descEs: 'Un bar con trastienda. La reputación de facción se mueve más rápido aquí.',
    color: '#ff2f8e',
    maxLevel: 3,
    baseCost: 400,
    incomePerLevel: 22,
    effect: '+1 faction rep per clear at level 2+',
    effectEs: '+1 reputación de facción por limpieza en nivel 2+',
  },
  {
    id: 'haven',
    name: 'DATA HAVEN',
    tagline: 'Cold racks, warm money.',
    taglineEs: 'Racks fríos, dinero caliente.',
    desc: 'A server closet that brokers contract data.',
    descEs: 'Un armario de servidores que comercia con datos de contratos.',
    color: '#5ef1ff',
    maxLevel: 3,
    baseCost: 480,
    incomePerLevel: 16,
    effect: '+2% contract pay / level',
    effectEs: '+2% pago de contrato / nivel',
  },
  {
    id: 'chop',
    name: 'CHOP SHOP',
    tagline: 'Every corpse is a parts bin.',
    taglineEs: 'Cada cadáver es una caja de piezas.',
    desc: 'Salvage operation that strips the sector after you leave.',
    descEs: 'Operación de salvamento que desvalija el sector después de que te vas.',
    color: '#b38cff',
    maxLevel: 3,
    baseCost: 360,
    incomePerLevel: 10,
    effect: '+1 fabrication component per clear / level',
    effectEs: '+1 componente de fabricación por limpieza / nivel',
  },
  {
    id: 'courier',
    name: 'COURIER ROUTE',
    tagline: 'The city moves through you.',
    taglineEs: 'La ciudad se mueve a través de ti.',
    desc: 'A dispatch network that buys and moves hardware at scale.',
    descEs: 'Una red de reparto que compra y mueve hardware a escala.',
    color: '#ff7a4c',
    maxLevel: 3,
    baseCost: 300,
    incomePerLevel: 14,
    effect: '-2% weapon prices / level',
    effectEs: '-2% precios de armas / nivel',
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
