import type { EnemyKind } from './world-types';

export type DamageCause =
  | 'gunfire'
  | 'melee'
  | 'explosion'
  | 'laser'
  | 'turret'
  | 'timer'
  | 'unknown';

/** Snapshot of the hit that ended the run. */
export interface DamageSource {
  label: string;
  attack: string;
  cause: DamageCause;
  x: number | null;
  y: number | null;
  kind?: EnemyKind;
}

export interface DeathContext {
  /** Whether the dash was off cooldown when the lethal hit landed. */
  dashReady?: boolean;
}

export interface DeathReport {
  label: string;
  /** Compact attack + bearing + range line. */
  detail: string;
  /** One actionable mistake correction. */
  hint: string;
}

export const ENEMY_LABELS: Record<EnemyKind, string> = {
  grunt: 'STREET THUG',
  shield: 'SHIELD UNIT',
  sniper: 'SNIPER',
  rusher: 'RUSHER',
  gunner: 'SMG GUNNER',
  marksman: 'MARKSMAN',
  heavy: 'HEAVY GUNNER',
  grenadier: 'GRENADIER',
  blade: 'BLADE',
  netrunner: 'NETRUNNER',
  operator: 'DRONE OPERATOR',
  stalker: 'STALKER',
  breacher: 'BREACHER',
  drone: 'SECURITY DRONE',
  hound: 'CYBERHOUND',
  medic: 'MEDIC',
  boss: 'AUGMENTED TARGET',
};

const ENEMY_HINTS: Partial<Record<EnemyKind, string>> = {
  sniper: 'PRECISION SHOTS PAINT A RED LINE FIRST. NEVER STAND IN IT.',
  marksman: 'PRECISION SHOTS PAINT A RED LINE FIRST. NEVER STAND IN IT.',
  grenadier: 'FRAG GRENADES FLASH RED BEFORE DETONATING. KEEP MOVING.',
  heavy: 'HEAVY FIRE PUNISHES OPEN GROUND. BREAK LINE OF SIGHT OR DASH.',
  breacher: 'SHOTGUNS REWARD CORNER CAMPING. BREAK CONTACT BEFORE THEY CLOSE.',
  rusher: 'CLOSE-RANGE KILLERS. DASH THROUGH, OR STUN AND EXECUTE.',
  blade: 'CLOSE-RANGE KILLERS. DASH THROUGH, OR STUN AND EXECUTE.',
  hound: 'HOUNDS LEAP INTO MELEE. DASH SIDEWAYS, DO NOT BACKPEDAL.',
  stalker: 'STALKERS CLOSE FROM BEHIND. CHECK THE DAMAGE INDICATOR.',
  shield: 'SHIELDS BLOCK THE FRONT. FLANK, BACKSTAB, OR THROW A WEAPON.',
  netrunner: 'NETRUNNERS SCRAMBLE CYBERWARE. BREAK SIGHT OR KILL THEM FIRST.',
  operator: 'OPERATORS DROP TURRETS. DESTROY THE TURRET OR LEAVE ITS LINE.',
  medic: 'MEDICS RESTORE ALLY PLATES. KILL THE MEDIC FIRST.',
  drone: 'DRONES TRACK FAST. USE COVER AND BREAK THEIR LINE.',
  boss: 'BOSSES TELEGRAPH CHARGES AND EXPOSE A CORE AFTERWARD. HIT THE CORE.',
};

const GENERIC_HINT =
  'ONE HIT ENDS THE RUN. USE ARMOR PLATES, COVER, AND THE DASH.';

export function compassDirection(dx: number, dy: number): string {
  if (Math.abs(dx) + Math.abs(dy) < 0.001) return 'UNKNOWN';
  const index = Math.round(Math.atan2(dx, dy) / (Math.PI / 4));
  return [
    'NORTH',
    'NORTH-EAST',
    'EAST',
    'SOUTH-EAST',
    'SOUTH',
    'SOUTH-WEST',
    'WEST',
    'NORTH-WEST',
  ][((index % 8) + 8) % 8];
}

export function rangeBand(distance: number): string {
  if (distance < 120) return 'POINT BLANK';
  if (distance < 320) return 'CLOSE RANGE';
  if (distance < 680) return 'MID RANGE';
  return 'LONG RANGE';
}

function hintFor(source: DamageSource | null): string {
  let hint = GENERIC_HINT;
  if (source?.kind === 'boss') hint = ENEMY_HINTS.boss!;
  else if (source?.kind && ENEMY_HINTS[source.kind]) hint = ENEMY_HINTS[source.kind]!;
  else if (source?.cause === 'explosion') {
    hint =
      source.label === 'EXPLOSIVE BARREL'
        ? 'BARRELS CHAIN-REACT. NEVER FIGHT BESIDE THEM.'
        : 'GRENADES LAND WHERE YOU WERE. MOVE OFF THE MARKER.';
  } else if (source?.cause === 'laser') {
    hint = 'LASER GRIDS PULSE. CROSS ON THE DARK PHASE OR SHOOT THE EMITTER.';
  } else if (source?.cause === 'turret') {
    hint = 'TURRETS PAINT A RED LINE BEFORE FIRING. BREAK LINE OF SIGHT.';
  } else if (source?.cause === 'timer') {
    hint = 'RUSH CONTRACTS CLOSE AT 90 SECONDS. EXTRACT BEFORE THE CLOCK.';
  } else if (source?.cause === 'melee') {
    hint = 'CLOSE-RANGE KILLERS. DASH THROUGH, OR STUN AND EXECUTE.';
  } else if (source?.cause === 'gunfire') {
    hint = 'GUNFIRE FOLLOWS YOUR LAST POSITION. STRAFE AND BREAK SIGHT.';
  }
  return hint;
}

/** Build the player-facing death explanation from a captured damage source. */
export function describeDeath(
  source: DamageSource | null,
  player: { x: number; y: number } | null,
  context: DeathContext = {},
): DeathReport {
  const parts: string[] = [];
  if (source) {
    parts.push(source.attack);
    if (player && source.x !== null && source.y !== null) {
      const dx = source.x - player.x;
      const dy = source.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 30) {
        parts.push('AT POINT BLANK');
      } else {
        parts.push(`FROM THE ${compassDirection(dx, dy)}`);
        parts.push(rangeBand(distance));
      }
    }
    if (
      context.dashReady !== undefined &&
      source.cause !== 'timer' &&
      source.cause !== 'unknown'
    ) {
      parts.push(context.dashReady ? 'DASH READY' : 'DASH RECOVERING');
    }
  } else {
    parts.push('CAUSE UNRECORDED');
  }
  return {
    label: source?.label ?? 'UNKNOWN',
    detail: parts.join(' · '),
    hint: hintFor(source),
  };
}
