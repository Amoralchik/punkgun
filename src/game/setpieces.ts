import { mulberry32 } from '../core/math';
import { districtFor, type DistrictTheme } from './districts';
import type { Contract, ObjectiveKind } from './missions';

/**
 * District setpieces: a contract-level situation that reshapes the
 * encounter around the district's identity. Unlike modifiers (rolled stat
 * knobs), a setpiece changes *what the room is doing* when you walk in.
 *
 * Setpieces are derived, not stored: the same contract always yields the same
 * setpiece, existing saves and seeded boards keep their RNG order, and the
 * board, world and settlement all read one pure function.
 */
export type SetpieceId = 'blackoutFloor' | 'marketPatrol' | 'defendedExtraction';

export interface SetpieceDef {
  id: SetpieceId;
  name: string;
  nameEs: string;
  desc: string;
  descEs: string;
  color: string;
  payBonus: number;
  themes: DistrictTheme[];
  objectives: ObjectiveKind[];
}

export const SETPIECES: Record<SetpieceId, SetpieceDef> = {
  blackoutFloor: {
    id: 'blackoutFloor',
    name: 'BLACKOUT FLOOR',
    nameEs: 'PISO APAGADO',
    desc: 'Grid power is cut. Cameras are dark, guards hunt by flashlight, two stalkers sweep the floor. +16% pay.',
    descEs: 'Sin energía. Cámaras apagadas, guardias con linterna, dos acechadores barren el piso. +16% de pago.',
    color: '#8b6bff',
    payBonus: 0.16,
    themes: ['corporate', 'blackSite', 'housing', 'megatower'],
    objectives: ['purge', 'target', 'recover', 'sabotage', 'extraction', 'hunt', 'heist'],
  },
  marketPatrol: {
    id: 'marketPatrol',
    name: 'MARKET PATROL',
    nameEs: 'PATRULLA DEL MERCADO',
    desc: 'The stalls are open and the street is full. Civilians scatter at gunfire; every one you drop adds heat and docks 8% pay. +12% pay.',
    descEs: 'Los puestos están abiertos y la calle llena. Los civiles huyen de los disparos; cada uno que derribes suma calor y resta 8% de pago. +12% de pago.',
    color: '#ffc46b',
    payBonus: 0.12,
    themes: ['market', 'alley', 'street'],
    objectives: ['purge', 'target', 'recover', 'sabotage', 'extraction', 'hunt', 'heist'],
  },
  defendedExtraction: {
    id: 'defendedExtraction',
    name: 'DEFENDED EXTRACTION',
    nameEs: 'EXTRACCIÓN DEFENDIDA',
    desc: 'The exit is a kill zone. When it opens, a heavy-led squad digs in around it. Clear the way or run the gauntlet. +18% pay.',
    descEs: 'La salida es una zona de muerte. Al abrirse, un escuadrón pesado se atrinchera alrededor. Despéjala o corre el riesgo. +18% de pago.',
    color: '#ff3b4e',
    payBonus: 0.18,
    themes: ['docks', 'transit', 'rooftop', 'desert', 'motel'],
    objectives: ['purge', 'target', 'recover', 'sabotage', 'extraction', 'hunt'],
  },
};

/** Chance an eligible generated contract carries its district setpiece. */
const SETPIECE_CHANCE = 0.45;

type SetpieceSource = Pick<Contract, 'layoutId' | 'objective' | 'seed'> &
  Partial<Pick<Contract, 'bossRush' | 'chapter' | 'challenge'>>;

/** The setpiece a contract runs under, or null. Pure and deterministic. */
export function setpieceFor(contract: SetpieceSource | null | undefined): SetpieceId | null {
  if (!contract) return null;
  if (contract.objective === 'boss' || contract.bossRush || contract.chapter === 'final') return null;
  if (contract.layoutId === 'safehouse') return null;
  const theme = districtFor(contract.layoutId).theme;
  const def = Object.values(SETPIECES).find(
    (entry) => entry.themes.includes(theme) && entry.objectives.includes(contract.objective),
  );
  if (!def) return null;
  // Independent stream so board RNG order is untouched.
  const roll = mulberry32((contract.seed ^ 0x5e7b1ece) >>> 0)();
  return roll < SETPIECE_CHANCE ? def.id : null;
}

export function setpiecePayBonus(id: SetpieceId | null | undefined): number {
  return id ? SETPIECES[id].payBonus : 0;
}

/** Collateral penalty: 8% of base pay per civilian, capped at 40%. */
export function collateralPenalty(civiliansKilled: number): number {
  return Math.min(0.4, Math.max(0, civiliansKilled) * 0.08);
}
