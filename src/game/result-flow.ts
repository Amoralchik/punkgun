import { APPROACH_MAP, type ApproachId } from './attributes';
import type { Contract } from './missions';
import type { EndingId } from './endings';
import type { RewardSummary } from './results';
import { deathResult, winResult } from './results';
import { describeDeath, type DamageSource } from './damage-report';
import { MODIFIER_MAP } from './modifiers';

export type ResultView =
  | { kind: 'death'; stats: string; note: string; source?: string; hint?: string }
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
    lastDamage?: DamageSource | null;
    dashReady?: boolean;
    player: { weapon: string; x?: number; y?: number };
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
    const { lastDamage, player } = input.world;
    const report = describeDeath(
      lastDamage ?? {
        label: input.world.deathCause,
        attack: 'CAUSE UNRECORDED',
        cause: 'unknown',
        x: null,
        y: null,
      },
      player.x !== undefined && player.y !== undefined
        ? { x: player.x, y: player.y }
        : null,
      { dashReady: input.world.dashReady },
    );
    const { stats, note } = deathResult({
      contractTitle: input.contract?.title ?? null,
      time: input.world.time,
      kills: input.world.kills,
      lootValue: input.world.lootValue,
      deathCause: input.world.deathCause,
      carriedWeapon: input.carriedWeapon,
      insured: input.insured,
      insuredWeapon: input.insuredWeapon,
      report,
    });
    return { kind: 'death', stats, note, source: report.detail, hint: report.hint };
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
