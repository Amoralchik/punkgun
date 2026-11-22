import type { EnemyKind } from './world-types';
import { type WeaponId, isGun } from './weapons';

export interface EnemyTraits {
  speedMult: number;
  visionMult: number;
  radius: number;
  armor: number;
}

/** Per-archetype spawn traits. AI behavior stays in World. */
export const ENEMY_TRAITS: Record<EnemyKind, EnemyTraits> = {
  grunt: { speedMult: 1, visionMult: 1, radius: 15, armor: 0 },
  shield: { speedMult: 0.78, visionMult: 1, radius: 15, armor: 0 },
  sniper: { speedMult: 0.65, visionMult: 1.35, radius: 15, armor: 0 },
  rusher: { speedMult: 1.35, visionMult: 0.85, radius: 15, armor: 0 },
  gunner: { speedMult: 1.08, visionMult: 1, radius: 15, armor: 0 },
  marksman: { speedMult: 0.7, visionMult: 1.42, radius: 15, armor: 0 },
  heavy: { speedMult: 0.62, visionMult: 1.1, radius: 20, armor: 2 },
  grenadier: { speedMult: 0.85, visionMult: 1.08, radius: 15, armor: 0 },
  blade: { speedMult: 1.28, visionMult: 0.92, radius: 15, armor: 0 },
  netrunner: { speedMult: 0.82, visionMult: 1.22, radius: 15, armor: 0 },
  operator: { speedMult: 0.9, visionMult: 1.15, radius: 15, armor: 0 },
  boss: { speedMult: 0.95, visionMult: 1.25, radius: 24, armor: 3 },
};

/** Cumulative random thresholds; anything above the last threshold is grunt. */
export const ENEMY_KIND_ROLLS: ReadonlyArray<{ kind: EnemyKind; below: number }> = [
  { kind: 'shield', below: 0.08 },
  { kind: 'sniper', below: 0.15 },
  { kind: 'rusher', below: 0.26 },
  { kind: 'gunner', below: 0.34 },
  { kind: 'marksman', below: 0.39 },
  { kind: 'heavy', below: 0.44 },
  { kind: 'grenadier', below: 0.5 },
  { kind: 'blade', below: 0.56 },
  { kind: 'netrunner', below: 0.61 },
  { kind: 'operator', below: 0.65 },
];

export function pickEnemyKind(roll: number): EnemyKind {
  for (const entry of ENEMY_KIND_ROLLS) {
    if (roll < entry.below) return entry.kind;
  }
  return 'grunt';
}

export interface EnemyLoadout {
  weapon: WeaponId;
  ammo: number;
}

/** Roll the starting weapon/ammo using the same sequence as the old inline table. */
export function rollEnemyLoadout(kind: EnemyKind, rng: () => number): EnemyLoadout {
  if (kind === 'boss') return { weapon: 'shotgun', ammo: 10 };
  if (kind === 'rusher') return { weapon: 'fists', ammo: 0 };
  if (kind === 'sniper') return { weapon: 'pistol', ammo: 3 };
  if (kind === 'gunner') return { weapon: 'smg', ammo: 36 };
  if (kind === 'marksman') return { weapon: 'rifle', ammo: 8 };
  if (kind === 'heavy') return { weapon: 'lmg', ammo: 80 };
  if (kind === 'operator') return { weapon: 'pistol', ammo: 5 };
  if (kind === 'grenadier' || kind === 'blade' || kind === 'netrunner') {
    return { weapon: 'fists', ammo: 0 };
  }
  if (kind === 'shield') {
    return rng() < 0.55 ? { weapon: 'bat', ammo: 0 } : { weapon: 'pistol', ammo: 4 };
  }

  const roll = rng();
  let weapon: WeaponId;
  if (roll < 0.16) weapon = 'fists';
  else if (roll < 0.26) weapon = 'bat';
  else if (roll < 0.38) weapon = 'pistol';
  else if (roll < 0.5) weapon = 'shotgun';
  else if (roll < 0.62) weapon = 'smg';
  else if (roll < 0.74) weapon = 'ak';
  else if (roll < 0.86) weapon = 'rifle';
  else weapon = 'lmg';
  return { weapon, ammo: isGun(weapon) ? 4 + Math.floor(rng() * 8) : 0 };
}
