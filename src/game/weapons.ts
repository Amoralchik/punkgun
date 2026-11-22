export type GunId = 'pistol' | 'shotgun' | 'smg' | 'rifle' | 'ak' | 'lmg';

export type WeaponId = 'fists' | 'bat' | GunId;

export type WeaponSound = 'pistol' | 'shotgun' | 'smg' | 'rifle' | 'ak' | 'lmg';

export interface WeaponDef {
  name: string;
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

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  fists: {
    name: 'FISTS',
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
  shotgun: {
    name: 'SHOTGUN',
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
  rifle: {
    name: 'KATANA-77 RIFLE',
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
  ak: {
    name: 'VOSTOK AK',
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
};

export const GUN_IDS: GunId[] = ['pistol', 'shotgun', 'smg', 'rifle', 'ak', 'lmg'];

export function isGun(id: WeaponId): id is GunId {
  return (GUN_IDS as WeaponId[]).includes(id);
}

export type NamedWeaponId = 'viper' | 'widowmaker' | 'kensei' | 'brute';

export interface NamedWeaponDef {
  id: NamedWeaponId;
  name: string;
  base: GunId;
  price: number;
  ammo: number;
  spreadMult: number;
}

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
];

export const NAMED_MAP: Record<NamedWeaponId, NamedWeaponDef> = {
  viper: NAMED_WEAPONS[0],
  widowmaker: NAMED_WEAPONS[1],
  kensei: NAMED_WEAPONS[2],
  brute: NAMED_WEAPONS[3],
};
