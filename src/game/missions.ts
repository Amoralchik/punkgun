import { randomSeed, mulberry32 } from '../core/math';
import { factionForLayout, FactionId } from './lore';
import { LAYOUTS, layoutCacheCount, LayoutId } from './map';
import { ModifierId, rollModifiers } from './modifiers';

export type ObjectiveKind = 'purge' | 'target' | 'recover' | 'boss';
export type Risk = 'LOW' | 'MED' | 'HIGH';

export interface Contract {
  id: string;
  title: string;
  layoutId: LayoutId;
  layoutName: string;
  objective: ObjectiveKind;
  requiredLoot: number;
  reward: number;
  risk: Risk;
  tagline: string;
  faction: FactionId;
  chapter?: 'final';
  /** Boss access gate. */
  locked?: boolean;
  requiredClears?: number;
  modifiers: ModifierId[];
  /** Deterministic seed for this contract's world variation. */
  seed: number;
}

const CODENAMES = [
  'DEAD DROP',
  'GLASS HOUSE',
  'BAD SIGNAL',
  'COLD SNAP',
  'LAST CALL',
  'BLACK ICE',
  'HARD LINE',
  'CHROME TEETH',
  'NIGHT SHIFT',
  'SPLICE',
  'LOW ORBIT',
  'RED STATIC',
];

const TAGLINES: Record<ObjectiveKind, string[]> = {
  purge: [
    'Make it loud. Leave nothing standing.',
    'The client wants the floor empty.',
    'No witnesses, no cameras, no survivors.',
  ],
  target: [
    'One name on the chip. Everyone else is furniture.',
    'The mark is guarded. The clock is not your friend.',
    'Walk in, drop the target, walk out.',
  ],
  recover: [
    'The data is worth more than the bodies.',
    'Grab the caches. Try not to die holding them.',
    'The client pays for cargo, not corpses.',
  ],
  boss: [
    'Three plates. One psycho. No witnesses.',
    'The sublevel is a cage. You are the entertainment.',
    'It has already killed the last crew. Finish it.',
  ],
};

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function objectiveText(contract: Contract): string {
  switch (contract.objective) {
    case 'purge':
      return 'PURGE ALL HOSTILES';
    case 'target':
      return 'KILL THE MARKED TARGET';
    case 'recover':
      return `RECOVER ${contract.requiredLoot} CACHE${contract.requiredLoot === 1 ? '' : 'S'}`;
    case 'boss':
      return 'KILL THE AUGMENTED PSYCHO';
  }
}

export function objectiveDetail(contract: Contract): string {
  switch (contract.objective) {
    case 'purge':
      return 'Eliminate every hostile in the sector, then reach the exit.';
    case 'target':
      return 'Only the amber-marked target matters. Kill it, then reach the exit.';
    case 'recover':
      return `Grab ${contract.requiredLoot} marked cache${contract.requiredLoot === 1 ? '' : 's'}, then reach the exit.`;
    case 'boss':
      return 'Break three armor plates off the augmented psycho, then reach the exit. It summons adds when a plate shatters.';
  }
}

/** Rolls a seeded board of contracts; one of each objective, distinct layouts. */
export function rollContracts(count = 3, seed = randomSeed()): Contract[] {
  const rng = mulberry32(seed);
  const layouts = shuffle(
    LAYOUTS.filter((layout) => layout.id !== 'sublevel' && layout.id !== 'safehouse'),
    rng,
  );
  const objectives = shuffle<ObjectiveKind>(['purge', 'target', 'recover'], rng);
  const names = shuffle(CODENAMES, rng);
  const contracts: Contract[] = [];

  for (let i = 0; i < count; i++) {
    const layout = layouts[i % layouts.length];
    const objective = objectives[i % objectives.length];
    const desiredLoot = 1 + Math.floor(rng() * 2);
    const requiredLoot =
      objective === 'recover'
        ? Math.min(desiredLoot, Math.max(1, layoutCacheCount(layout.id)))
        : desiredLoot;
    const riskBonus = layout.id === 'tenements' ? 12 : layout.id === 'nightmarket' ? 6 : 0;
    let reward = 0;
    if (objective === 'purge') reward = 70 + Math.floor(rng() * 26) + riskBonus;
    else if (objective === 'target') reward = 105 + Math.floor(rng() * 31) + riskBonus;
    else reward = 95 + requiredLoot * 20 + Math.floor(rng() * 21) + riskBonus;
    const risk: Risk = reward >= 140 ? 'HIGH' : reward >= 110 ? 'MED' : 'LOW';
    const modifiers = rollModifiers(rng);
    const contractSeed = (seed + i * 0x9e3779b9) >>> 0;

    contracts.push({
      id: `c${contractSeed.toString(36)}-${i}`,
      title: names[i % names.length],
      layoutId: layout.id,
      layoutName: layout.name,
      objective,
      requiredLoot,
      reward,
      risk,
      tagline: TAGLINES[objective][Math.floor(rng() * TAGLINES[objective].length)],
      faction: factionForLayout(layout.id),
      modifiers,
      seed: contractSeed,
    });
  }

  return contracts;
}

/** A permanent high-risk boss contract on the sublevel arena. */
export function createBossContract(playerLevel: number, seed = randomSeed()): Contract {
  const layout = LAYOUTS.find((entry) => entry.id === 'sublevel') ?? LAYOUTS[0];
  const rng = mulberry32(seed);
  return {
    id: `boss-${seed.toString(36)}`,
    title: 'THE SUBLEVEL',
    layoutId: layout.id,
    layoutName: layout.name,
    objective: 'boss',
    requiredLoot: 0,
    reward: 230 + Math.max(0, playerLevel - 1) * 12,
    risk: 'HIGH',
    tagline: TAGLINES.boss[Math.floor(rng() * TAGLINES.boss.length)],
    faction: 'sublevel',
    modifiers: [],
    seed,
  };
}

/** The story finale, available after the Sublevel boss is cleared. */
export function createFinalContract(seed = randomSeed()): Contract {
  return {
    id: `final-${seed.toString(36)}`,
    title: 'LAST LIGHT',
    layoutId: 'spire',
    layoutName: 'HELIX SPIRE',
    objective: 'target',
    requiredLoot: 0,
    reward: 420,
    risk: 'HIGH',
    tagline: 'The tower has one last light. Put it out.',
    faction: 'helix',
    chapter: 'final',
    modifiers: ['elite'],
    seed,
  };
}
