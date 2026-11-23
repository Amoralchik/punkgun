import { APPROACH_MAP, type ApproachId } from './attributes';
import type { Contract } from './missions';
import type { EndingId } from './endings';
import type { RewardSummary } from './results';
import { deathResult, winResult } from './results';
import { MODIFIER_MAP } from './modifiers';

export type ResultView =
  | { kind: 'death'; stats: string; note: string }
  | { kind: 'win'; stats: string; note: string }
  | { kind: 'ending' }
  | { kind: 'none' };

export interface ResultInput {
  dead: boolean;
  contract: Contract | null;
  world: {
    time: number;
    kills: number;
    lootValue: number;
    deathCause: string;
    player: { weapon: string };
  };
  carriedWeapon: boolean;
  insured: boolean;
  insuredWeapon: string | null;
  reward: RewardSummary | null;
  approachId: ApproachId;
  ending: EndingId | null;
  money: number;
}

/** Resolve the post-run overlay from world/profile state. */
export function buildResult(input: ResultInput): ResultView {
  if (input.dead) {
    const { stats, note } = deathResult({
      contractTitle: input.contract?.title ?? null,
      time: input.world.time,
      kills: input.world.kills,
      lootValue: input.world.lootValue,
      deathCause: input.world.deathCause,
      carriedWeapon: input.carriedWeapon,
      insured: input.insured,
      insuredWeapon: input.insuredWeapon,
    });
    return { kind: 'death', stats, note };
  }
  if (input.contract?.chapter === 'final' && !input.ending) return { kind: 'ending' };
  if (!input.reward) return { kind: 'none' };
  const approach = APPROACH_MAP[input.approachId];
  const { stats, note } = winResult(input.reward, {
    approachName: approach.name,
    approachMult: approach.payoutMult,
    modifierNames: (input.contract?.modifiers ?? []).map((id) => MODIFIER_MAP[id].name),
    final: input.contract?.chapter === 'final',
    money: input.money,
    ending: input.ending,
  });
  return { kind: 'win', stats, note };
}
