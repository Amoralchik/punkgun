import type { Attributes } from './attributes';
import { EMPTY_ATTRIBUTES } from './attributes';

export type CyberwareId =
  | 'subdermal'
  | 'reflex'
  | 'smartlink'
  | 'ocular'
  | 'sandevistan'
  | 'camo'
  | 'heart'
  | 'biomonitor'
  | 'mantis'
  | 'gorilla';
export type PerkId = 'sprinter' | 'ghost' | 'brawler' | 'gunslinger';

export interface CyberwareDef {
  id: CyberwareId;
  name: string;
  desc: string;
  maxRank: number;
  costs: number[];
}

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  maxRank: number;
}

export const CYBERWARE_DEFS: CyberwareDef[] = [
  {
    id: 'subdermal',
    name: 'SUBDERMAL WEAVE',
    desc: 'ARMOR PLATE +1 PER RANK. EACH PLATE ABSORBS ONE LETHAL HIT.',
    maxRank: 3,
    costs: [300, 650, 1100],
  },
  {
    id: 'reflex',
    name: 'REFLEX SPURS',
    desc: 'MOVE SPEED +6% PER RANK.',
    maxRank: 2,
    costs: [250, 500],
  },
  {
    id: 'smartlink',
    name: 'SMARTLINK',
    desc: 'WEAPON SPREAD -12% PER RANK.',
    maxRank: 2,
    costs: [350, 700],
  },
  {
    id: 'ocular',
    name: 'OCULAR VEIL',
    desc: 'ENEMY VISION RANGE -8% PER RANK.',
    maxRank: 2,
    costs: [300, 650],
  },
  {
    id: 'sandevistan',
    name: 'SANDEVISTAN',
    desc: 'ACTIVE [SHIFT]: THE WORLD SLOWS TO 35% FOR 2.5S. COOLDOWN 14S.',
    maxRank: 2,
    costs: [550, 950],
  },
  {
    id: 'camo',
    name: 'OPTICAL CAMO',
    desc: 'ACTIVE [C]: CLOAK FOR 2.5S. FIRING OR THROWING BREAKS IT. COOLDOWN 12S.',
    maxRank: 2,
    costs: [450, 800],
  },
  {
    id: 'heart',
    name: 'SECOND HEART',
    desc: 'ONCE PER RUN: SURVIVE A LETHAL HIT WITH ONE ARMOR PLATE.',
    maxRank: 1,
    costs: [900],
  },
  {
    id: 'biomonitor',
    name: 'BIOMONITOR',
    desc: 'RESTORE 1 ARMOR AFTER 6S WITHOUT TAKING DAMAGE.',
    maxRank: 2,
    costs: [400, 750],
  },
  {
    id: 'mantis',
    name: 'MANTIS BLADES',
    desc: 'MELEE REACH +25%. MELEE KILLS ARE SILENT.',
    maxRank: 2,
    costs: [500, 850],
  },
  {
    id: 'gorilla',
    name: 'GORILLA ARMS',
    desc: 'MELEE IGNORES SHIELDS. DOOR SLAMS HIT A WIDER ARC.',
    maxRank: 2,
    costs: [450, 800],
  },
];

export const PERK_DEFS: PerkDef[] = [
  {
    id: 'sprinter',
    name: 'SPRINTER',
    desc: 'MOVE SPEED +6% PER RANK.',
    maxRank: 3,
  },
  {
    id: 'ghost',
    name: 'GHOST',
    desc: 'ENEMY VISION RANGE -7% PER RANK.',
    maxRank: 3,
  },
  {
    id: 'brawler',
    name: 'BRAWLER',
    desc: 'MELEE REACH +12%, MELEE COOLDOWN -8% PER RANK.',
    maxRank: 3,
  },
  {
    id: 'gunslinger',
    name: 'GUNSLINGER',
    desc: 'GUN COOLDOWN -8%, SPREAD -10% PER RANK.',
    maxRank: 3,
  },
];

export type CyberwareRanks = Record<CyberwareId, number>;
export type PerkRanks = Record<PerkId, number>;

export const EMPTY_CYBERWARE: CyberwareRanks = {
  subdermal: 0,
  reflex: 0,
  smartlink: 0,
  ocular: 0,
  sandevistan: 0,
  camo: 0,
  heart: 0,
  biomonitor: 0,
  mantis: 0,
  gorilla: 0,
};

export const EMPTY_PERKS: PerkRanks = {
  sprinter: 0,
  ghost: 0,
  brawler: 0,
  gunslinger: 0,
};

export interface RunMods {
  armor: number;
  speed: number;
  meleeCooldown: number;
  gunCooldown: number;
  spread: number;
  meleeReach: number;
  vision: number;
  sandevistan: number;
  camo: number;
  heart: number;
  biomonitor: number;
  mantis: number;
  gorilla: number;
}

export function baseMods(): RunMods {
  return {
    armor: 0,
    speed: 1,
    meleeCooldown: 1,
    gunCooldown: 1,
    spread: 1,
    meleeReach: 1,
    vision: 1,
    sandevistan: 0,
    camo: 0,
    heart: 0,
    biomonitor: 0,
    mantis: 0,
    gorilla: 0,
  };
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export function computeMods(
  cyberware: CyberwareRanks,
  perks: PerkRanks,
  attributes: Attributes = EMPTY_ATTRIBUTES,
): RunMods {
  return {
    armor: clamp(
      cyberware.subdermal + (cyberware.biomonitor > 0 ? 1 : 0) + (attributes.body >= 5 ? 1 : 0),
      0,
      5,
    ),
    speed: clamp(
      1 +
        cyberware.reflex * 0.06 +
        perks.sprinter * 0.06 +
        (attributes.reflexes - 3) * 0.03,
      1,
      1.6,
    ),
    meleeCooldown: clamp(1 - perks.brawler * 0.08, 0.55, 1),
    gunCooldown: clamp(
      1 - perks.gunslinger * 0.08 - (attributes.tech - 3) * 0.02,
      0.4,
      1,
    ),
    spread: clamp(1 - cyberware.smartlink * 0.12 - perks.gunslinger * 0.1, 0.25, 1),
    meleeReach: clamp(1 + perks.brawler * 0.12 + cyberware.mantis * 0.25, 1, 1.85),
    vision: clamp(
      1 -
        cyberware.ocular * 0.08 -
        perks.ghost * 0.07 -
        (attributes.cool - 3) * 0.03,
      0.4,
      1,
    ),
    sandevistan: clamp(cyberware.sandevistan, 0, 2),
    camo: clamp(cyberware.camo, 0, 2),
    heart: clamp(cyberware.heart, 0, 1),
    biomonitor: clamp(cyberware.biomonitor, 0, 2),
    mantis: clamp(cyberware.mantis, 0, 2),
    gorilla: clamp(cyberware.gorilla, 0, 2),
  };
}

/** XP needed to advance from the given level. */
export function xpForNext(level: number): number {
  return 100 + Math.max(0, level - 1) * 50;
}
