import type { ApproachId } from './attributes';
import type { RunBoon } from './boons';
import type { Contract } from './missions';
import type { RunLoadout } from './profile';

/** Immutable inputs for one mission instance. */
export interface RunConfig {
  contract: Contract;
  approach: ApproachId;
  seed: number;
  loadout: RunLoadout;
  boons: RunBoon[];
}
