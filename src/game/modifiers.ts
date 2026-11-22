export type ModifierId = 'alarm' | 'elite' | 'rush' | 'hotLoot';

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
];

export const MODIFIER_MAP: Record<ModifierId, ModifierDef> = {
  alarm: MODIFIERS[0],
  elite: MODIFIERS[1],
  rush: MODIFIERS[2],
  hotLoot: MODIFIERS[3],
};

export function modifierPayBonus(ids: ModifierId[]): number {
  return ids.reduce((sum, id) => sum + (MODIFIER_MAP[id]?.payBonus ?? 0), 0);
}

export function rollModifiers(rng: () => number = Math.random): ModifierId[] {
  const roll = rng();
  const count = roll < 0.5 ? 0 : roll < 0.84 ? 1 : 2;
  const pool: ModifierId[] = ['alarm', 'elite', 'rush', 'hotLoot'];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
