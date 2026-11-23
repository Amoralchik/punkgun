import { BossId } from './bosses';
import { FactionId } from './lore';
import { LAYOUTS, LayoutId } from './map';
import {
  Contract,
  ObjectiveKind,
  Risk,
  createBossContract,
  createFinalContract,
  rollContracts,
  createBossRushContract,
} from './missions';
import { ModifierId } from './modifiers';
import type { Profile } from './profile';

export type ChapterNumber = 1 | 2 | 3;

export interface ChapterDef {
  id: ChapterNumber;
  name: string;
  kicker: string;
  blurb: string;
  gateBoss: BossId;
  requiredClears: number;
}

export const CHAPTERS: Record<ChapterNumber, ChapterDef> = {
  1: {
    id: 1,
    name: 'STREET LEVEL',
    kicker: '// CHAPTER 01',
    blurb: 'Rent, rain and small crimes. Learn the block before the block learns you.',
    gateBoss: 'psycho',
    requiredClears: 3,
  },
  2: {
    id: 2,
    name: 'THE SUBLEVEL',
    kicker: '// CHAPTER 02',
    blurb: 'Helix buried the first PUNKGUN. The Teeth and Low Orbit are digging it back up.',
    gateBoss: 'grin',
    requiredClears: 6,
  },
  3: {
    id: 3,
    name: 'THE SPIRE',
    kicker: '// CHAPTER 03',
    blurb: 'Every contract now points up. The board is waiting at the top.',
    gateBoss: 'crane',
    requiredClears: 9,
  },
};

type AuthoredChapter = ChapterNumber;

export interface AuthoredContractDef {
  id: string;
  chapter: AuthoredChapter;
  title: string;
  layoutId: LayoutId;
  objective: ObjectiveKind;
  requiredLoot: number;
  reward: number;
  risk: Risk;
  tagline: string;
  taglineEs?: string;
  faction: FactionId;
  modifiers: ModifierId[];
}

/** Twelve authored beats across three chapters; generated work fills the gaps. */
export const AUTHORED_CONTRACTS: AuthoredContractDef[] = [
  {
    id: 'a01-dead-drop',
    chapter: 1,
    title: 'DEAD DROP',
    layoutId: 'sector07',
    objective: 'recover',
    requiredLoot: 2,
    reward: 135,
    risk: 'MED',
    tagline: 'Two caches. One stairwell. Helix is already counting the cameras.',
    taglineEs: 'Dos cachés. Una escalera. Helix ya cuenta las cámaras.',
    faction: 'helix',
    modifiers: [],
  },
  {
    id: 'a02-glass-house',
    chapter: 1,
    title: 'GLASS HOUSE',
    layoutId: 'nightmarket',
    objective: 'hunt',
    requiredLoot: 0,
    reward: 150,
    risk: 'MED',
    tagline: 'The broker runs at the first shot. Catch him before the market closes.',
    taglineEs: 'El corredor huye al primer disparo. Atrápalo antes de que cierre el mercado.',
    faction: 'market',
    modifiers: ['alarm'],
  },
  {
    id: 'a03-bad-signal',
    chapter: 1,
    title: 'BAD SIGNAL',
    layoutId: 'tenements',
    objective: 'sabotage',
    requiredLoot: 2,
    reward: 145,
    risk: 'MED',
    tagline: 'Two relay taps under Teeth rent control. Make the floor deaf.',
    taglineEs: 'Dos taps de relé bajo el control de alquiler de los Dientes. Deja sorda la planta.',
    faction: 'teeth',
    modifiers: [],
  },
  {
    id: 'a04-cold-snap',
    chapter: 1,
    title: 'COLD SNAP',
    layoutId: 'docks',
    objective: 'defense',
    requiredLoot: 0,
    reward: 160,
    risk: 'HIGH',
    tagline: 'Hold the manifest cage while Low Orbit decides who owns the rain.',
    taglineEs: 'Mantén la jaula del manifiesto mientras Low Orbit decide quién posee la lluvia.',
    faction: 'orbit',
    modifiers: ['rush'],
  },
  {
    id: 'a05-last-call',
    chapter: 2,
    title: 'LAST CALL',
    layoutId: 'nightmarket',
    objective: 'extraction',
    requiredLoot: 1,
    reward: 185,
    risk: 'HIGH',
    tagline: 'The case is warm. Every fixer in the market knows you picked it up.',
    taglineEs: 'El maletín está caliente. Todos los fixers del mercado saben que lo cogiste.',
    faction: 'market',
    modifiers: ['alarm'],
  },
  {
    id: 'a06-black-ice',
    chapter: 2,
    title: 'BLACK ICE',
    layoutId: 'sector07',
    objective: 'sabotage',
    requiredLoot: 3,
    reward: 195,
    risk: 'HIGH',
    tagline: 'Three Helix relays. One netrunner already inside the wire.',
    taglineEs: 'Tres relés de Helix. Un netrunner ya está dentro del cable.',
    faction: 'helix',
    modifiers: ['elite'],
  },
  {
    id: 'a07-hard-line',
    chapter: 2,
    title: 'HARD LINE',
    layoutId: 'tenements',
    objective: 'hunt',
    requiredLoot: 0,
    reward: 205,
    risk: 'HIGH',
    tagline: 'A Teeth courier with a chrome jaw and a head start. Run him down.',
    taglineEs: 'Un mensajero de los Dientes con mandíbula de cromo y ventaja. Alcánzalo.',
    faction: 'teeth',
    modifiers: ['alarm', 'elite'],
  },
  {
    id: 'a08-chrome-teeth',
    chapter: 2,
    title: 'PORCELAIN',
    layoutId: 'nightclub',
    objective: 'target',
    requiredLoot: 0,
    reward: 210,
    risk: 'HIGH',
    tagline: 'GRIN is holding court in the VIP room. The champagne is warm.',
    taglineEs: 'GRIN celebra en la sala VIP. El champán está caliente.',
    faction: 'teeth',
    modifiers: ['elite'],
  },
  {
    id: 'a09-night-shift',
    chapter: 3,
    title: 'NIGHT SHIFT',
    layoutId: 'docks',
    objective: 'recover',
    requiredLoot: 2,
    reward: 240,
    risk: 'HIGH',
    tagline: 'Two caches of Helix serials. Low Orbit wants them gone before dawn.',
    taglineEs: 'Dos cachés de seriales de Helix. Low Orbit quiere que desaparezcan antes del amanecer.',
    faction: 'orbit',
    modifiers: ['hotLoot'],
  },
  {
    id: 'a10-splice',
    chapter: 3,
    title: 'SPLICE',
    layoutId: 'spire',
    objective: 'sabotage',
    requiredLoot: 3,
    reward: 265,
    risk: 'HIGH',
    tagline: 'Three executive relays. The board is watching the floors below.',
    taglineEs: 'Tres relés ejecutivos. El consejo vigila los pisos de abajo.',
    faction: 'helix',
    modifiers: ['elite', 'alarm'],
  },
  {
    id: 'a11-low-orbit',
    chapter: 3,
    title: 'LOW ORBIT',
    layoutId: 'freighter',
    objective: 'defense',
    requiredLoot: 0,
    reward: 275,
    risk: 'HIGH',
    tagline: 'Hold the freighter cargo deck while the syndicate burns its own manifest.',
    taglineEs: 'Mantén la cubierta de carga del carguero mientras el sindicato quema su propio manifiesto.',
    faction: 'orbit',
    modifiers: ['rush', 'elite'],
  },
  {
    id: 'a12-red-static',
    chapter: 3,
    title: 'RED STATIC',
    layoutId: 'spire',
    objective: 'hunt',
    requiredLoot: 0,
    reward: 290,
    risk: 'HIGH',
    tagline: 'The last witness is running for the executive lift. Do not let it close.',
    taglineEs: 'El último testigo corre hacia el ascensor ejecutivo. No dejes que cierre.',
    faction: 'helix',
    modifiers: ['alarm', 'elite'],
  },
];

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function currentChapter(profile: Profile): ChapterNumber | 'final' {
  if (profile.data.bossesCleared.crane || profile.data.finalCleared) return 'final';
  if (profile.data.bossesCleared.grin) return 3;
  if (profile.data.bossesCleared.psycho) return 2;
  return 1;
}

export function gateBoss(profile: Profile): BossId | null {
  const chapter = currentChapter(profile);
  if (chapter === 'final') return null;
  return CHAPTERS[chapter].gateBoss;
}

export function chapterProgress(profile: Profile): {
  chapter: ChapterNumber | 'final';
  def: ChapterDef | null;
  bossDefeated: boolean;
  requiredClears: number;
  clears: number;
} {
  const chapter = currentChapter(profile);
  if (chapter === 'final') {
    return {
      chapter,
      def: null,
      bossDefeated: profile.data.bossesCleared.crane,
      requiredClears: 9,
      clears: profile.data.regularClears,
    };
  }
  const def = CHAPTERS[chapter];
  return {
    chapter,
    def,
    bossDefeated: profile.data.bossesCleared[def.gateBoss],
    requiredClears: def.requiredClears,
    clears: profile.data.regularClears,
  };
}

function materialize(def: AuthoredContractDef, profile: Profile): Contract {
  const seed = (hashString(def.id) ^ (profile.data.runs * 0x9e3779b9)) >>> 0;
  const layoutName =
    LAYOUTS.find((layout) => layout.id === def.layoutId)?.name ?? def.layoutId.toUpperCase();
  return {
    id: `authored-${def.id}`,
    title: def.title,
    layoutId: def.layoutId,
    layoutName,
    objective: def.objective,
    requiredLoot: def.requiredLoot,
    reward: def.reward,
    risk: def.risk,
    tagline: def.tagline,
    taglineEs: def.taglineEs,
    faction: def.faction,
    chapter: def.chapter,
    authored: true,
    modifiers: def.modifiers,
    seed,
  };
}

export function authoredFor(profile: Profile, limit = 2): Contract[] {
  const chapter = currentChapter(profile);
  if (chapter === 'final') return [];
  const completed = new Set(profile.data.completedContracts);
  return AUTHORED_CONTRACTS.filter(
    (def) => def.chapter === chapter && !completed.has(`authored-${def.id}`),
  )
    .slice(0, limit)
    .map((def) => materialize(def, profile));
}

/**
 * Campaign-aware board: authored beats first, generated contracts fill the
 * remaining slots, then the chapter gate (or the finale) is appended.
 */
export function buildBoard(profile: Profile, seed: number): Contract[] {
  const chapter = currentChapter(profile);
  if (chapter === 'final') {
    const board = [
      createFinalContract(seed),
      ...rollContracts(2, seed ^ 0x5f3759df),
    ];
    if (profile.data.finalCleared) {
      board.push(
        createBossContract(profile.data.level, seed ^ 0x6ac690c5, 'seraph'),
        createBossContract(profile.data.level, seed ^ 0x27d4eb2f, 'archivist'),
      );
      board.push(createBossRushContract(seed ^ 0x3c6ef372, profile.data.level));
    }
    return board;
  }

  const board = authoredFor(profile, 2);
  const generated = rollContracts(3, seed);
  for (const contract of generated) {
    if (board.length >= 3) break;
    if (board.some((entry) => entry.layoutId === contract.layoutId)) continue;
    board.push(contract);
  }
  // Fill any remaining slot even if layouts repeat; boards must not be short.
  for (const contract of generated) {
    if (board.length >= 3) break;
    if (board.some((entry) => entry.id === contract.id)) continue;
    board.push(contract);
  }

  const gate = CHAPTERS[chapter].gateBoss;
  const boss = createBossContract(profile.data.level, seed, gate);
  boss.requiredClears = CHAPTERS[chapter].requiredClears;
  boss.locked = profile.data.regularClears < boss.requiredClears;
  board.push(boss);
  return board;
}
