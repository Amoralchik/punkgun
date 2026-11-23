import { humanityLabel, type RunMods } from './progression';

const LABELS: Record<keyof RunMods, string> = {
  armor: 'ARMOR PLATE',
  speed: 'MOVE SPEED',
  gunCooldown: 'GUN CYCLE',
  spread: 'SPREAD',
  reload: 'RELOAD TIME',
  vision: 'ENEMY VISION',
  meleeReach: 'MELEE REACH',
  abilityCd: 'ABILITY CD',
  pierce: 'PIERCE',
  sandevistan: 'SANDEVISTAN',
  camo: 'OPTICAL CAMO',
  heart: 'SECOND HEART',
  biomonitor: 'BIOMONITOR',
  mantis: 'MANTIS BLADES',
  gorilla: 'GORILLA ARMS',
  kerenzikov: 'KERENZIKOV',
  emp: 'MICROGENERATOR',
  berserk: 'BERSERK',
  overclock: 'OVERCLOCK',
  deck: 'INTRUSION DECK',
  regenBoost: 'ARMOR REGEN',
  meleeKillReset: 'BLADE RESET',
  killSpeed: 'KILL SPEED',
  hackResist: 'HACK RESIST',
  lowArmorSpeed: 'LOW-ARMOR SPEED',
  meleeCooldown: 'MELEE CYCLE',
  precisionSpread: 'PRECISION SPREAD',
  takedownReach: 'TAKEDOWN REACH',
  grenadeRadius: 'GRENADE RADIUS',
  lootMult: 'LOOT VALUE',
  componentBonus: 'COMPONENT DROP',
  heatMult: 'HEAT GAIN',
  dashCd: 'DASH COOLDOWN',
  dashInvuln: 'DASH I-FRAMES',
  comboWindow: 'COMBO WINDOW',
  humanityStage: 'NEURAL LOAD',
};

const COUNT_KEYS: Partial<Record<keyof RunMods, true>> = {
  armor: true,
  pierce: true,
};

const RANK_KEYS: Partial<Record<keyof RunMods, true>> = {
  sandevistan: true,
  camo: true,
  heart: true,
  biomonitor: true,
  mantis: true,
  gorilla: true,
  kerenzikov: true,
  emp: true,
  berserk: true,
  overclock: true,
  deck: true,
  regenBoost: true,
  meleeKillReset: true,
};

const SECOND_KEYS: Partial<Record<keyof RunMods, true>> = {
  dashInvuln: true,
  comboWindow: true,
};

/** Exact player-facing delta between two builds; one entry per changed stat. */
export function describeModChanges(before: RunMods, after: RunMods): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(LABELS) as (keyof RunMods)[]) {
    const from = before[key];
    const to = after[key];
    if (from === to) continue;
    const label = LABELS[key];
    if (key === 'humanityStage') {
      const stageLabel = (value: number) =>
        humanityLabel(Math.max(0, Math.min(3, Math.round(value))) as 0 | 1 | 2 | 3);
      lines.push(`${label} ${stageLabel(from)} → ${stageLabel(to)}`);
    } else if (RANK_KEYS[key]) {
      lines.push(from === 0 ? `${label} UNLOCKED` : `${label} RANK ${from} → ${to}`);
    } else if (COUNT_KEYS[key]) {
      lines.push(`${label} ${from} → ${to}`);
    } else if (SECOND_KEYS[key]) {
      lines.push(`${label} ${from.toFixed(2)}s → ${to.toFixed(2)}s`);
    } else {
      lines.push(`${label} ${Math.round(from * 100)}% → ${Math.round(to * 100)}%`);
    }
  }
  return lines;
}
