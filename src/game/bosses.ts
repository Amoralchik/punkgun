import type { FactionId } from './lore';
import type { EnemyKind } from './world-types';
import type { LayoutId } from './map';

export type BossId = 'psycho' | 'grin' | 'crane' | 'board';

export interface BossDef {
  id: BossId;
  name: string;
  title: string;
  layoutId: LayoutId;
  faction: FactionId;
  blurb: string;
  armor: number;
  speedMult: number;
  charge: boolean;
  shock: boolean;
  adds: number;
  addKind: EnemyKind;
  reward: number;
  color: string;
}

export const BOSSES: Record<BossId, BossDef> = {
  psycho: {
    id: 'psycho',
    name: 'AUGMENTED PSYCHO',
    title: 'THE SUBLEVEL',
    layoutId: 'sublevel',
    faction: 'sublevel',
    blurb: 'Subject 06. Three plates, a stolen voice, and a hook where a hand should be.',
    armor: 3,
    speedMult: 0.95,
    charge: true,
    shock: true,
    adds: 2,
    addKind: 'grunt',
    reward: 230,
    color: '#ff2f8e',
  },
  grin: {
    id: 'grin',
    name: 'GRIN',
    title: 'PORCELAIN SMILE',
    layoutId: 'tenements',
    faction: 'teeth',
    blurb: 'The Teeth landlord. Porcelain veneers, a chrome jaw, and a body count filed as rent.',
    armor: 4,
    speedMult: 1.12,
    charge: true,
    shock: true,
    adds: 2,
    addKind: 'rusher',
    reward: 310,
    color: '#ff7a4c',
  },
  crane: {
    id: 'crane',
    name: 'DEADWEIGHT',
    title: 'CRANE OPERATOR',
    layoutId: 'docks',
    faction: 'orbit',
    blurb: 'Low Orbit enforcer. Half forklift, half man, fully convinced the manifest is scripture.',
    armor: 4,
    speedMult: 0.9,
    charge: true,
    shock: true,
    adds: 2,
    addKind: 'gunner',
    reward: 380,
    color: '#ffc46b',
  },
  board: {
    id: 'board',
    name: 'THE BOARD',
    title: 'LAST LIGHT',
    layoutId: 'spire',
    faction: 'helix',
    blurb: 'The signature at the bottom of Project PUNKGUN. It wears an executive chassis and a committee of voices.',
    armor: 5,
    speedMult: 1.02,
    charge: true,
    shock: true,
    adds: 3,
    addKind: 'marksman',
    reward: 520,
    color: '#5ef1ff',
  },
};

export const BOSS_ORDER: BossId[] = ['psycho', 'grin', 'crane', 'board'];
