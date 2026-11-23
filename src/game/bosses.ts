import type { FactionId } from './lore';
import type { EnemyKind } from './world-types';
import type { LayoutId } from './map';

export type BossId = 'psycho' | 'grin' | 'crane' | 'board' | 'seraph' | 'archivist';

export interface BossDef {
  id: BossId;
  name: string;
  title: string;
  layoutId: LayoutId;
  faction: FactionId;
  blurb: string;
  blurbEs: string;
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
    blurbEs: 'Sujeto 06. Tres placas, una voz robada y un gancho donde debería haber una mano.',
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
    blurbEs: 'El casero de los Dientes. Carillas de porcelana, mandíbula de cromo y un recuento de cuerpos archivado como alquiler.',
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
    blurbEs: 'Ejecutor de Low Orbit. Mitad montacargas, mitad hombre, totalmente convencido de que el manifiesto es sagrado.',
    armor: 4,
    speedMult: 0.9,
    charge: true,
    shock: true,
    adds: 2,
    addKind: 'gunner',
    reward: 380,
    color: '#ffc46b',
  },
  seraph: {
    id: 'seraph',
    name: 'SERAPH',
    title: 'NEON ALLEY',
    layoutId: 'neon_alley',
    faction: 'market',
    blurb: 'A rogue netrunner wearing a dead woman’s face. It has been inside the alley since before the district had a name.',
    blurbEs: 'Una netrunner renegada con la cara de una mujer muerta. Está dentro del callejón desde antes de que el distrito tuviera nombre.',
    armor: 4,
    speedMult: 1.18,
    charge: false,
    shock: true,
    adds: 2,
    addKind: 'netrunner',
    reward: 600,
    color: '#b38cff',
  },
  archivist: {
    id: 'archivist',
    name: 'THE ARCHIVIST',
    title: 'ROOFTOP ARCHIVE',
    layoutId: 'rooftops',
    faction: 'helix',
    blurb: 'A memory broker with a server for a heart. It remembers every version of you and calls them inventory.',
    blurbEs: 'Un corredor de memorias con un servidor por corazón. Recuerda cada versión de ti y las llama inventario.',
    armor: 5,
    speedMult: 0.86,
    charge: true,
    shock: true,
    adds: 3,
    addKind: 'drone',
    reward: 650,
    color: '#5ef1ff',
  },
  board: {
    id: 'board',
    name: 'THE BOARD',
    title: 'LAST LIGHT',
    layoutId: 'spire',
    faction: 'helix',
    blurb: 'The signature at the bottom of Project PUNKGUN. It wears an executive chassis and a committee of voices.',
    blurbEs: 'La firma al pie del Proyecto PUNKGUN. Viste un chasis ejecutivo y una comitiva de voces.',
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

export const BOSS_ORDER: BossId[] = [
  'psycho',
  'grin',
  'crane',
  'board',
  'seraph',
  'archivist',
];
