import type { AttachmentId } from './attachments';
import type { ConsumableId } from './consumables';
import type { WeaponId } from './weapons';

export type ComponentId = 'scrap' | 'circuit' | 'polymer' | 'biogel';

export const COMPONENT_IDS: ComponentId[] = ['scrap', 'circuit', 'polymer', 'biogel'];

export interface ComponentDef {
  name: string;
  color: string;
  desc: string;
}

export const COMPONENTS: Record<ComponentId, ComponentDef> = {
  scrap: { name: 'SCRAP', color: '#ffc46b', desc: 'Salvaged alloy and gun steel.' },
  circuit: { name: 'CIRCUIT', color: '#5ef1ff', desc: 'Boards, optics, and smartlink chips.' },
  polymer: { name: 'POLYMER', color: '#b38cff', desc: 'Printed frames, grips, and casings.' },
  biogel: { name: 'BIOGEL', color: '#ff2f8e', desc: 'Medical gel for stims and field kits.' },
};

export type RecipeOutput =
  | { kind: 'weapon'; weapon: Exclude<WeaponId, 'fists'> }
  | { kind: 'ammo' }
  | { kind: 'attachment'; attachment: AttachmentId }
  | { kind: 'supply'; supply: ConsumableId };

export interface Recipe {
  id: string;
  name: string;
  desc: string;
  cost: Partial<Record<ComponentId, number>>;
  output: RecipeOutput;
}

export const RECIPES: Recipe[] = [
  {
    id: 'ammo',
    name: 'FIELD AMMO',
    desc: 'One ammo pack for the equipped firearm.',
    cost: { scrap: 2, polymer: 1 },
    output: { kind: 'ammo' },
  },
  {
    id: 'suppressor',
    name: 'SUPPRESSOR',
    desc: 'Install a suppressor on the equipped firearm.',
    cost: { circuit: 3, polymer: 2 },
    output: { kind: 'attachment', attachment: 'suppressor' },
  },
  {
    id: 'stim',
    name: 'STIM CHARGE',
    desc: 'Add one charge to the packed kit. Defaults to stim.',
    cost: { biogel: 2, scrap: 1 },
    output: { kind: 'supply', supply: 'stim' },
  },
  {
    id: 'smg',
    name: 'VECTOR-9 SMG',
    desc: 'Fabricate a VECTOR-9 and stow it in the case.',
    cost: { scrap: 8, circuit: 5, polymer: 3 },
    output: { kind: 'weapon', weapon: 'smg' },
  },
  {
    id: 'ak',
    name: 'VOSTOK AK',
    desc: 'Fabricate a VOSTOK AK and stow it in the case.',
    cost: { scrap: 10, circuit: 6, polymer: 4 },
    output: { kind: 'weapon', weapon: 'ak' },
  },
  {
    id: 'lmg',
    name: 'RIPPER LMG',
    desc: 'Fabricate a RIPPER LMG and stow it in the case.',
    cost: { scrap: 14, circuit: 8, polymer: 5 },
    output: { kind: 'weapon', weapon: 'lmg' },
  },
];

export function costText(recipe: Recipe): string {
  return (Object.keys(recipe.cost) as ComponentId[])
    .map((id) => `${COMPONENTS[id].name} ×${recipe.cost[id] ?? 0}`)
    .join(' · ');
}

export function outputText(recipe: Recipe): string {
  if (recipe.output.kind === 'weapon') return 'FABRICATED WEAPON';
  if (recipe.output.kind === 'ammo') return 'AMMO PACK';
  if (recipe.output.kind === 'attachment') return 'WEAPON ATTACHMENT';
  return 'KIT CHARGE';
}
