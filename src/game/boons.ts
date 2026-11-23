export type RunBoon = 'armor' | 'pay' | 'quiet' | 'components';

export interface BoonDef {
  id: RunBoon;
  label: string;
  desc: string;
  color: string;
}

export const BOONS: Record<RunBoon, BoonDef> = {
  armor: {
    id: 'armor',
    label: 'EXTRA PLATE',
    desc: 'Start the contract with one additional armor plate.',
    color: '#ff7a4c',
  },
  pay: {
    id: 'pay',
    label: 'FIXER CUT',
    desc: '+12% contract payout.',
    color: '#ffc46b',
  },
  quiet: {
    id: 'quiet',
    label: 'ACCESS CODES',
    desc: 'Enemy vision range -15% for the run.',
    color: '#5ef1ff',
  },
  components: {
    id: 'components',
    label: 'SALVAGE CLAIM',
    desc: 'Extract with 3 bonus fabrication components.',
    color: '#b38cff',
  },
};
