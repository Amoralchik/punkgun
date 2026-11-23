export type ModifierId =
  | 'alarm'
  | 'elite'
  | 'rush'
  | 'hotLoot'
  | 'fog'
  | 'sirens'
  | 'swarm'
  | 'blackIce'
  | 'noArmor'
  | 'overclocked'
  | 'cyberpsycho'
  | 'lockdown';

export interface ModifierDef {
  id: ModifierId;
  name: string;
  desc: string;
  color: string;
  payBonus: number;
}

export const MODIFIERS: ModifierDef[] = [
  {
    id: 'alarm',
    name: 'ALARM',
    desc: 'Every hostile starts alerted and hunting. +18% pay.',
    color: '#ff3b4e',
    payBonus: 0.18,
  },
  {
    id: 'elite',
    name: 'ELITE',
    desc: 'Every hostile gains one armor plate. +22% pay.',
    color: '#ffc46b',
    payBonus: 0.22,
  },
  {
    id: 'rush',
    name: 'RUSH',
    desc: 'A 90-second contract clock. Time out and the run fails. +20% pay.',
    color: '#ff2f8e',
    payBonus: 0.2,
  },
  {
    id: 'hotLoot',
    name: 'HOT LOOT',
    desc: 'Cache values are 50% higher. +8% pay.',
    color: '#5ef1ff',
    payBonus: 0.08,
  },
  {
    id: 'fog',
    name: 'FOG',
    desc: 'Enemy vision range -30%. Long sightlines disappear. +10% pay.',
    color: '#9bb6c9',
    payBonus: 0.1,
  },
  {
    id: 'sirens',
    name: 'SIRENS',
    desc: 'Heat gain +50%. Reinforcements arrive sooner. +12% pay.',
    color: '#ff7a4c',
    payBonus: 0.12,
  },
  {
    id: 'swarm',
    name: 'SWARM',
    desc: 'Three extra hostiles are already in the sector. +20% pay.',
    color: '#b38cff',
    payBonus: 0.2,
  },
  {
    id: 'blackIce',
    name: 'BLACK ICE',
    desc: 'Netrunner hacks last twice as long. +18% pay.',
    color: '#5ef1ff',
    payBonus: 0.18,
  },
  {
    id: 'noArmor',
    name: 'NO PLATES',
    desc: 'Start the run with zero armor plates. +30% pay.',
    color: '#ff2f8e',
    payBonus: 0.3,
  },
  {
    id: 'overclocked',
    name: 'OVERCLOCKED',
    desc: 'Hostiles fire 25% faster. +20% pay.',
    color: '#ffc46b',
    payBonus: 0.2,
  },
  {
    id: 'cyberpsycho',
    name: 'CYBERPSYCHO',
    desc: 'Two hostiles are replaced by blade psychos. +22% pay.',
    color: '#ff3b4e',
    payBonus: 0.22,
  },
  {
    id: 'lockdown',
    name: 'LOCKDOWN',
    desc: 'The sector starts hot and doors seal behind you. +25% pay.',
    color: '#7dffcf',
    payBonus: 0.25,
  },
];

export const MODIFIER_MAP: Record<ModifierId, ModifierDef> = Object.fromEntries(
  MODIFIERS.map((def) => [def.id, def]),
) as Record<ModifierId, ModifierDef>;

export function modifierPayBonus(ids: ModifierId[]): number {
  return ids.reduce((sum, id) => sum + (MODIFIER_MAP[id]?.payBonus ?? 0), 0);
}

export function rollModifiers(rng: () => number = Math.random): ModifierId[] {
  const roll = rng();
  const count = roll < 0.5 ? 0 : roll < 0.84 ? 1 : 2;
  const pool = MODIFIERS.map((def) => def.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
