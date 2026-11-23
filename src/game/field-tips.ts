import type { MessageKey } from '../core/i18n';

export type FieldTipId = 'deploy' | 'armor' | 'reload' | 'execute';

export interface FieldTipInput {
  /** Seconds since the mission brief cleared. */
  deployedFor: number;
  armorHit: boolean;
  reloadNeeded: boolean;
  executeReady: boolean;
}

export const FIELD_TIP_IDS: FieldTipId[] = ['deploy', 'armor', 'reload', 'execute'];

export const FIELD_TIP_KEYS: Record<FieldTipId, MessageKey> = {
  deploy: 'tip.deploy',
  armor: 'tip.armor',
  reload: 'tip.reload',
  execute: 'tip.execute',
};

/** Pick at most one contextual tip; each is retired permanently after it shows. */
export function pickFieldTip(
  input: FieldTipInput,
  seen: readonly string[],
): FieldTipId | null {
  if (input.armorHit && !seen.includes('armor')) return 'armor';
  if (input.executeReady && !seen.includes('execute')) return 'execute';
  if (input.reloadNeeded && !seen.includes('reload')) return 'reload';
  if (input.deployedFor >= 1.4 && !seen.includes('deploy')) return 'deploy';
  return null;
}
