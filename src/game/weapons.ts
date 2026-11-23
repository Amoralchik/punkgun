export type GunId =
  | 'pistol'
  | 'revolver'
  | 'shotgun'
  | 'smg'
  | 'carbine'
  | 'needler'
  | 'rifle'
  | 'dmr'
  | 'ak'
  | 'lmg'
  | 'plasma'
  | 'railgun';

export type WeaponId = 'fists' | 'bat' | GunId;

export type WeaponSound = GunId;

export type WeaponFamily =
  | 'MELEE'
  | 'PISTOL'
  | 'REVOLVER'
  | 'SHOTGUN'
  | 'SMG'
  | 'CARBINE'
  | 'NEEDLER'
  | 'RIFLE'
  | 'DMR'
  | 'AK'
  | 'LMG'
  | 'PLASMA'
  | 'RAILGUN';

export interface WeaponDef {
  name: string;
  family: WeaponFamily;
  melee: boolean;
  /** Seconds between attacks. */
  cooldown: number;
  /** Rounds per magazine; 0 for melee. */
  mag: number;
  /** Reload duration in seconds; 0 for melee. */
  reload: number;
  /** Melee reach in world units. */
  range: number;
  pellets: number;
  /** Half-angle of pellet spread, radians. */
  spread: number;
  /** Bullet speed, units/sec. */
  speed: number;
  shake: number;
  /** Full-auto when the trigger is held. */
  auto: boolean;
  /** Extra enemies a round can pass through. */
  pierce: number;
  /** Audio/recoil class. */
  sound: WeaponSound;
}

/**
 * Weapon families are deliberately separated by handling, not damage:
 * everything kills in one hit, so mag size, cadence, spread, pierce and
 * reload are the actual identity.
 */
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  fists: {
    name: 'FISTS',
    family: 'MELEE',
    melee: true,
    cooldown: 0.26,
    mag: 0,
    reload: 0,
    range: 46,
    pellets: 0,
    spread: 0,
    speed: 0,
    shake: 0.08,
    auto: false,
    pierce: 0,
    sound: 'pistol',
  },
  bat: {
    name: 'BAT',
    family: 'MELEE',
    melee: true,
    cooldown: 0.4,
    mag: 0,
    reload: 0,
    range: 78,
    pellets: 0,
    spread: 0,
    speed: 0,
    shake: 0.12,
    auto: false,
    pierce: 0,
    sound: 'pistol',
  },
  pistol: {
    name: 'PISTOL',
    family: 'PISTOL',
    melee: false,
    cooldown: 0.17,
    mag: 6,
    reload: 1.0,
    range: 0,
    pellets: 1,
    spread: 0.012,
    speed: 1150,
    shake: 0.16,
    auto: false,
    pierce: 0,
    sound: 'pistol',
  },
  revolver: {
    name: 'MAGNUM',
    family: 'REVOLVER',
    melee: false,
    cooldown: 0.44,
    mag: 5,
    reload: 1.55,
    range: 0,
    pellets: 1,
    spread: 0.006,
    speed: 1500,
    shake: 0.34,
    auto: false,
    pierce: 1,
    sound: 'revolver',
  },
  shotgun: {
    name: 'SHOTGUN',
    family: 'SHOTGUN',
    melee: false,
    cooldown: 0.78,
    mag: 4,
    reload: 1.35,
    range: 0,
    pellets: 7,
    spread: 0.13,
    speed: 900,
    shake: 0.42,
    auto: false,
    pierce: 0,
    sound: 'shotgun',
  },
  smg: {
    name: 'VECTOR-9 SMG',
    family: 'SMG',
    melee: false,
    cooldown: 0.078,
    mag: 18,
    reload: 1.15,
    range: 0,
    pellets: 1,
    spread: 0.052,
    speed: 1080,
    shake: 0.09,
    auto: true,
    pierce: 0,
    sound: 'smg',
  },
  carbine: {
    name: 'CARBINE',
    family: 'CARBINE',
    melee: false,
    cooldown: 0.098,
    mag: 30,
    reload: 1.4,
    range: 0,
    pellets: 1,
    spread: 0.041,
    speed: 1320,
    shake: 0.12,
    auto: true,
    pierce: 0,
    sound: 'carbine',
  },
  needler: {
    name: 'NEEDLER',
    family: 'NEEDLER',
    melee: false,
    cooldown: 0.13,
    mag: 12,
    reload: 1.1,
    range: 0,
    pellets: 2,
    spread: 0.055,
    speed: 1240,
    shake: 0.1,
    auto: true,
    pierce: 0,
    sound: 'needler',
  },
  rifle: {
    name: 'KATANA-77 RIFLE',
    family: 'RIFLE',
    melee: false,
    cooldown: 0.34,
    mag: 6,
    reload: 1.25,
    range: 0,
    pellets: 1,
    spread: 0.004,
    speed: 1650,
    shake: 0.28,
    auto: false,
    pierce: 1,
    sound: 'rifle',
  },
  dmr: {
    name: 'LONGSHOT DMR',
    family: 'DMR',
    melee: false,
    cooldown: 0.48,
    mag: 8,
    reload: 1.35,
    range: 0,
    pellets: 1,
    spread: 0.002,
    speed: 1850,
    shake: 0.3,
    auto: false,
    pierce: 2,
    sound: 'dmr',
  },
  ak: {
    name: 'VOSTOK AK',
    family: 'AK',
    melee: false,
    cooldown: 0.112,
    mag: 24,
    reload: 1.55,
    range: 0,
    pellets: 1,
    spread: 0.058,
    speed: 1220,
    shake: 0.2,
    auto: true,
    pierce: 0,
    sound: 'ak',
  },
  lmg: {
    name: 'RIPPER LMG',
    family: 'LMG',
    melee: false,
    cooldown: 0.082,
    mag: 48,
    reload: 2.4,
    range: 0,
    pellets: 1,
    spread: 0.094,
    speed: 1050,
    shake: 0.28,
    auto: true,
    pierce: 0,
    sound: 'lmg',
  },
  plasma: {
    name: 'SUNLANCE',
    family: 'PLASMA',
    melee: false,
    cooldown: 0.72,
    mag: 4,
    reload: 1.8,
    range: 0,
    pellets: 2,
    spread: 0.018,
    speed: 760,
    shake: 0.38,
    auto: false,
    pierce: 2,
    sound: 'plasma',
  },
  railgun: {
    name: 'RAILSPIKE',
    family: 'RAILGUN',
    melee: false,
    cooldown: 1.0,
    mag: 3,
    reload: 2.6,
    range: 0,
    pellets: 1,
    spread: 0,
    speed: 2400,
    shake: 0.5,
    auto: false,
    pierce: 4,
    sound: 'railgun',
  },
};

export const GUN_IDS: GunId[] = [
  'pistol',
  'revolver',
  'shotgun',
  'smg',
  'carbine',
  'needler',
  'rifle',
  'dmr',
  'ak',
  'lmg',
  'plasma',
  'railgun',
];

export function isGun(id: WeaponId): id is GunId {
  return (GUN_IDS as WeaponId[]).includes(id);
}

export function weaponFamily(id: WeaponId): WeaponFamily {
  return WEAPONS[id]?.family ?? 'MELEE';
}

export type NamedWeaponId =
  | 'viper'
  | 'widowmaker'
  | 'kensei'
  | 'brute'
  | 'hangman'
  | 'longshot'
  | 'vesper'
  | 'sunlance';

export interface NamedWeaponDef {
  id: NamedWeaponId;
  name: string;
  base: GunId;
  price: number;
  ammo: number;
  spreadMult: number;
}

/** Named variants keep the base handling and tighten the cone. */
export const NAMED_WEAPONS: NamedWeaponDef[] = [
  {
    id: 'viper',
    name: 'VIPER',
    base: 'pistol',
    price: 190,
    ammo: 10,
    spreadMult: 0.75,
  },
  {
    id: 'widowmaker',
    name: 'WIDOWMAKER',
    base: 'shotgun',
    price: 320,
    ammo: 8,
    spreadMult: 0.68,
  },
  {
    id: 'kensei',
    name: 'KENSEI',
    base: 'rifle',
    price: 520,
    ammo: 12,
    spreadMult: 0.55,
  },
  {
    id: 'brute',
    name: 'BRUTE',
    base: 'lmg',
    price: 640,
    ammo: 120,
    spreadMult: 0.78,
  },
  {
    id: 'hangman',
    name: 'HANGMAN',
    base: 'revolver',
    price: 380,
    ammo: 10,
    spreadMult: 0.55,
  },
  {
    id: 'longshot',
    name: 'LONGSHOT',
    base: 'dmr',
    price: 560,
    ammo: 16,
    spreadMult: 0.5,
  },
  {
    id: 'vesper',
    name: 'VESPER',
    base: 'carbine',
    price: 480,
    ammo: 60,
    spreadMult: 0.62,
  },
  {
    id: 'sunlance',
    name: 'SUNLANCE PRIME',
    base: 'plasma',
    price: 720,
    ammo: 8,
    spreadMult: 0.6,
  },
];

export const NAMED_MAP: Record<NamedWeaponId, NamedWeaponDef> = Object.fromEntries(
  NAMED_WEAPONS.map((def) => [def.id, def]),
) as Record<NamedWeaponId, NamedWeaponDef>;
