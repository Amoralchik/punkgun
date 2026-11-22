export type ConsumableId = 'stim' | 'smoke' | 'flash' | 'frag';

export interface ConsumableDef {
  id: ConsumableId;
  name: string;
  desc: string;
  cost: number;
}

export const SUPPLY_MAX = 2;

export const CONSUMABLES: ConsumableDef[] = [
  {
    id: 'stim',
    name: 'STIM',
    desc: 'GRANT OR RESTORE 1 ARMOR PLATE (MAX 3).',
    cost: 45,
  },
  {
    id: 'smoke',
    name: 'SMOKE',
    desc: '5s VISION-BLOCKING CLOUD AT YOUR POSITION.',
    cost: 35,
  },
  {
    id: 'flash',
    name: 'FLASHBANG',
    desc: 'STUN HOSTILES WITHIN 300 UNITS FOR 2.5s.',
    cost: 40,
  },
  {
    id: 'frag',
    name: 'FRAG',
    desc: 'THROW A GRENADE. KILLS IN A 115 BLAST.',
    cost: 60,
  },
];

export const CONSUMABLE_MAP: Record<ConsumableId, ConsumableDef> = {
  stim: CONSUMABLES[0],
  smoke: CONSUMABLES[1],
  flash: CONSUMABLES[2],
  frag: CONSUMABLES[3],
};
