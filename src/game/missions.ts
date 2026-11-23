import { randomSeed, mulberry32 } from '../core/math';
import { t } from '../core/i18n';
import { BOSSES, BossId } from './bosses';
import { factionForLayout, FactionId } from './lore';
import { LAYOUTS, layoutCacheCount, LayoutId } from './map';
import { ModifierId, rollModifiers } from './modifiers';

export type ObjectiveKind =
  | 'purge'
  | 'target'
  | 'recover'
  | 'boss'
  | 'sabotage'
  | 'extraction'
  | 'hunt'
  | 'defense';
export type Risk = 'LOW' | 'MED' | 'HIGH';
export type ChapterId = 1 | 2 | 3 | 'final';

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
  chapter?: ChapterId;
  bossId?: BossId;
  /** Authored campaign beat rather than a generated board entry. */
  authored?: boolean;
  /** Boss/chapter access gate. */
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
    'One arena. One monster. No witnesses.',
    'The floor is a cage. You are the entertainment.',
    'It has already killed the last crew. Finish it.',
  ],
  sabotage: [
    'The client wants the floor dark, not quiet.',
    'Plant the taps. Let the grid eat itself.',
    'Break the hardware. Leave the people.',
  ],
  extraction: [
    'The case leaves with you or it does not leave at all.',
    'Grab the package. Everyone heard you arrive.',
    'No package, no pay. No exit, no package.',
  ],
  hunt: [
    'The mark runs. That is the point.',
    'Track it. Corner it. Finish it.',
    'It knows you are coming. Make that irrelevant.',
  ],
  defense: [
    'Hold the line until the timer dies.',
    'They want the room back. Do not give it to them.',
    'Stand where the light is. Count the seconds.',
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
      return t('objective.purge');
    case 'target':
      return t('objective.target');
    case 'recover':
      return t('objective.recover', {
        count: contract.requiredLoot,
        plural: contract.requiredLoot === 1 ? '' : 'S',
      });
    case 'boss':
      return t('objective.boss');
    case 'sabotage':
      return t('objective.sabotage', {
        count: contract.requiredLoot,
        plural: contract.requiredLoot === 1 ? '' : 'S',
      });
    case 'extraction':
      return t('objective.extraction');
    case 'hunt':
      return t('objective.hunt');
    case 'defense':
      return t('objective.defense');
  }
}

export function objectiveDetail(contract: Contract): string {
  switch (contract.objective) {
    case 'purge':
      return t('objective.detail.purge');
    case 'target':
      return t('objective.detail.target');
    case 'recover':
      return t('objective.detail.recover', {
        count: contract.requiredLoot,
        plural: contract.requiredLoot === 1 ? '' : 's',
      });
    case 'boss':
      return t('objective.detail.boss');
    case 'sabotage':
      return t('objective.detail.sabotage', {
        count: contract.requiredLoot,
        plural: contract.requiredLoot === 1 ? '' : 's',
      });
    case 'extraction':
      return t('objective.detail.extraction');
    case 'hunt':
      return t('objective.detail.hunt');
    case 'defense':
      return t('objective.detail.defense');
  }
}

/** Objectives available on the generated board. Boss is authored. */
export const BOARD_OBJECTIVES: ObjectiveKind[] = [
  'purge',
  'target',
  'recover',
  'sabotage',
  'extraction',
  'hunt',
  'defense',
];

function requiredFor(objective: ObjectiveKind, rng: () => number, layoutId: LayoutId): number {
  if (objective === 'recover') {
    const desired = 1 + Math.floor(rng() * 2);
    return Math.min(desired, Math.max(1, layoutCacheCount(layoutId)));
  }
  if (objective === 'sabotage') return 2 + Math.floor(rng() * 2);
  if (objective === 'extraction') return 1;
  return 0;
}

function rewardFor(objective: ObjectiveKind, requiredLoot: number, rng: () => number): number {
  if (objective === 'purge') return 70 + Math.floor(rng() * 26);
  if (objective === 'target' || objective === 'hunt') return 105 + Math.floor(rng() * 31);
  if (objective === 'recover') return 95 + requiredLoot * 20 + Math.floor(rng() * 21);
  if (objective === 'sabotage') return 90 + requiredLoot * 18 + Math.floor(rng() * 18);
  if (objective === 'extraction') return 128 + Math.floor(rng() * 22);
  if (objective === 'defense') return 120 + Math.floor(rng() * 26);
  return 105 + Math.floor(rng() * 35);
}

/** Rolls a seeded board of contracts; unique objectives and layouts. */
export function rollContracts(count = 3, seed = randomSeed()): Contract[] {
  const rng = mulberry32(seed);
  const layouts = shuffle(
    LAYOUTS.filter((layout) => layout.id !== 'sublevel' && layout.id !== 'safehouse'),
    rng,
  );
  const objectives = shuffle(BOARD_OBJECTIVES, rng);
  const names = shuffle(CODENAMES, rng);
  const contracts: Contract[] = [];

  for (let i = 0; i < count; i++) {
    const layout = layouts[i % layouts.length];
    const objective = objectives[i % objectives.length];
    const requiredLoot = requiredFor(objective, rng, layout.id);
    const riskBonus = layout.id === 'tenements' ? 12 : layout.id === 'nightmarket' ? 6 : 0;
    const reward = rewardFor(objective, requiredLoot, rng) + riskBonus;
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

/** A high-risk boss contract for one of the four arena archetypes. */
export function createBossContract(
  playerLevel: number,
  seed = randomSeed(),
  bossId: BossId = 'psycho',
): Contract {
  const boss = BOSSES[bossId];
  const layout = LAYOUTS.find((entry) => entry.id === boss.layoutId) ?? LAYOUTS[0];
  const rng = mulberry32(seed);
  return {
    id: `boss-${bossId}-${seed.toString(36)}`,
    title: boss.title,
    layoutId: layout.id,
    layoutName: layout.name,
    objective: 'boss',
    requiredLoot: 0,
    reward: boss.reward + Math.max(0, playerLevel - 1) * 12,
    risk: 'HIGH',
    tagline: TAGLINES.boss[Math.floor(rng() * TAGLINES.boss.length)],
    faction: boss.faction,
    bossId,
    modifiers: [],
    seed,
  };
}

/** The story finale, available after the third boss. */
export function createFinalContract(seed = randomSeed()): Contract {
  const boss = BOSSES.board;
  return {
    id: `final-${seed.toString(36)}`,
    title: boss.title,
    layoutId: boss.layoutId,
    layoutName: 'HELIX SPIRE',
    objective: 'boss',
    requiredLoot: 0,
    reward: boss.reward,
    risk: 'HIGH',
    tagline: 'The tower has one last light. Put it out.',
    faction: 'helix',
    chapter: 'final',
    bossId: 'board',
    modifiers: ['elite'],
    seed,
  };
}
