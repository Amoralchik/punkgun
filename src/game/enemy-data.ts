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
  stalker: { speedMult: 1.42, visionMult: 0.75, radius: 14, armor: 0 },
  breacher: { speedMult: 1.02, visionMult: 1, radius: 17, armor: 1 },
  drone: { speedMult: 0.74, visionMult: 1.35, radius: 12, armor: 0 },
  hound: { speedMult: 1.6, visionMult: 0.8, radius: 12, armor: 0 },
  medic: { speedMult: 0.92, visionMult: 1.15, radius: 15, armor: 0 },
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
  { kind: 'stalker', below: 0.7 },
  { kind: 'breacher', below: 0.74 },
  { kind: 'drone', below: 0.77 },
  { kind: 'hound', below: 0.8 },
  { kind: 'medic', below: 0.83 },
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

/** Laser wind-up: the tell is only visible during this final aim window. */
export const ENEMY_AIM_WINDUP: Partial<Record<EnemyKind, number>> = {
  grunt: 0.32,
  gunner: 0.28,
  heavy: 0.45,
  sniper: 0.65,
  marksman: 0.5,
  breacher: 0.4,
  drone: 0.3,
  medic: 0.3,
  operator: 0.3,
  boss: 0.5,
};

export function isEnemyAiming(kind: EnemyKind, fireCd: number): boolean {
  return fireCd <= (ENEMY_AIM_WINDUP[kind] ?? 0.32);
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
  if (kind === 'stalker') return { weapon: 'fists', ammo: 0 };
  if (kind === 'breacher') return { weapon: 'shotgun', ammo: 6 };
  if (kind === 'drone') return { weapon: 'needler', ammo: 12 };
  if (kind === 'hound') return { weapon: 'fists', ammo: 0 };
  if (kind === 'medic') return { weapon: 'pistol', ammo: 4 };
  if (kind === 'grenadier' || kind === 'blade' || kind === 'netrunner') {
    return { weapon: 'fists', ammo: 0 };
  }
  if (kind === 'shield') {
    return rng() < 0.55 ? { weapon: 'bat', ammo: 0 } : { weapon: 'pistol', ammo: 4 };
  }

  const roll = rng();
  let weapon: WeaponId;
  if (roll < 0.12) weapon = 'fists';
  else if (roll < 0.2) weapon = 'bat';
  else if (roll < 0.31) weapon = 'pistol';
  else if (roll < 0.36) weapon = 'revolver';
  else if (roll < 0.44) weapon = 'shotgun';
  else if (roll < 0.54) weapon = 'smg';
  else if (roll < 0.62) weapon = 'carbine';
  else if (roll < 0.67) weapon = 'needler';
  else if (roll < 0.77) weapon = 'ak';
  else if (roll < 0.84) weapon = 'rifle';
  else if (roll < 0.89) weapon = 'dmr';
  else if (roll < 0.95) weapon = 'lmg';
  else if (roll < 0.99) weapon = 'plasma';
  else weapon = 'railgun';
  return { weapon, ammo: isGun(weapon) ? 4 + Math.floor(rng() * 8) : 0 };
}
