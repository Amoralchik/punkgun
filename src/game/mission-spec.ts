import type { ApproachId } from './attributes';
import type { RunBoon } from './boons';
import type { Contract } from './missions';
import type { MissionSpec } from './world-types';
import { setpieceFor } from './setpieces';

/** Build the world-facing mission contract from a board contract. */
export function buildMissionSpec(
  contract: Contract,
  approach: ApproachId,
  boons: RunBoon[],
  ngPlus: number,
): MissionSpec {
  const setpiece = setpieceFor(contract);
  return {
    objective: contract.objective,
    requiredLoot: contract.requiredLoot,
    approach,
    modifiers: contract.modifiers,
    bossId: contract.bossId,
    bossRush: contract.bossRush,
    risk: contract.risk,
    ngPlus,
    boons,
    ...(setpiece ? { setpiece } : {}),
  };
}
