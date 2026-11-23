import { WEAPONS, type GunId } from './weapons';

export type AttachmentId =
  | 'suppressor'
  | 'extended'
  | 'laser'
  | 'spring'
  | 'scope'
  | 'drum'
  | 'compensator'
  | 'flechette'
  | 'piercer'
  | 'smartlink'
  | 'quickdraw';

export interface AttachmentDef {
  id: AttachmentId;
  name: string;
  desc: string;
  cost: number;
  /** Extra rounds granted at the start of a run, by weapon type. */
  ammoBonus: Partial<Record<GunId, number>>;
  /** Magazine size multiplier. */
  magMult?: number;
  /** Pellet count bonus. */
  pelletsBonus?: number;
  /** Spread multiplier. */
  spreadMult?: number;
  /** Cooldown multiplier. */
  cooldownMult?: number;
  /** Reload multiplier. */
  reloadMult?: number;
  /** Pierce bonus. */
  pierceBonus?: number;
  /** Heat multiplier. */
  heatMult?: number;
  /** Alert-radius multiplier. */
  alertMult?: number;
}

export const ATTACHMENTS: AttachmentDef[] = [
  {
    id: 'suppressor',
    name: 'SUPPRESSOR',
    desc: 'GUNSHOT HEAT -60%, ALERT RADIUS -55%.',
    cost: 180,
    ammoBonus: {},
    heatMult: 0.4,
    alertMult: 0.45,
  },
  {
    id: 'extended',
    name: 'EXTENDED MAG',
    desc: '+50% MAGAZINE AT RUN START. HEAVY WEAPONS GAIN MORE.',
    cost: 120,
    ammoBonus: { pistol: 4, shotgun: 3, smg: 12, rifle: 5, ak: 15, lmg: 30 },
    magMult: 1.5,
  },
  {
    id: 'laser',
    name: 'LASER SIGHT',
    desc: 'WEAPON SPREAD -35%.',
    cost: 150,
    ammoBonus: {},
    spreadMult: 0.65,
  },
  {
    id: 'spring',
    name: 'HEAVY SPRING',
    desc: 'GUN COOLDOWN -20%.',
    cost: 170,
    ammoBonus: {},
    cooldownMult: 0.8,
  },
  {
    id: 'scope',
    name: 'LONG SCOPE',
    desc: 'SPREAD -45%, RELOAD +10%.',
    cost: 240,
    ammoBonus: {},
    spreadMult: 0.55,
    reloadMult: 1.1,
  },
  {
    id: 'drum',
    name: 'DRUM FEED',
    desc: 'MAGAZINE ×2, RELOAD +15%.',
    cost: 280,
    ammoBonus: {},
    magMult: 2,
    reloadMult: 1.15,
  },
  {
    id: 'compensator',
    name: 'COMPENSATOR',
    desc: 'COOLDOWN -15%, SPREAD -15%.',
    cost: 260,
    ammoBonus: {},
    cooldownMult: 0.85,
    spreadMult: 0.85,
  },
  {
    id: 'flechette',
    name: 'FLECHETTE',
    desc: '+2 PELLETS, SPREAD +15%.',
    cost: 300,
    ammoBonus: {},
    pelletsBonus: 2,
    spreadMult: 1.15,
  },
  {
    id: 'piercer',
    name: 'PIERCER',
    desc: 'ROUNDS PIERCE +1, COOLDOWN +10%.',
    cost: 320,
    ammoBonus: {},
    pierceBonus: 1,
    cooldownMult: 1.1,
  },
  {
    id: 'smartlink',
    name: 'SMARTLINK',
    desc: 'SPREAD -30%, COOLDOWN -5%.',
    cost: 350,
    ammoBonus: {},
    spreadMult: 0.7,
    cooldownMult: 0.95,
  },
  {
    id: 'quickdraw',
    name: 'QUICKDRAW',
    desc: 'RELOAD -30%.',
    cost: 220,
    ammoBonus: {},
    reloadMult: 0.7,
  },
];

export const ATTACHMENT_MAP: Record<AttachmentId, AttachmentDef> = Object.fromEntries(
  ATTACHMENTS.map((def) => [def.id, def]),
) as Record<AttachmentId, AttachmentDef>;

export function attachmentMag(weapon: GunId, attachment: AttachmentId | null): number {
  const base = WEAPONS[weapon].mag;
  if (!attachment) return base;
  return Math.max(1, Math.round(base * (ATTACHMENT_MAP[attachment]?.magMult ?? 1)));
}

export function attachmentPellets(weapon: GunId, attachment: AttachmentId | null): number {
  const base = WEAPONS[weapon].pellets;
  if (!attachment) return base;
  return Math.max(1, base + (ATTACHMENT_MAP[attachment]?.pelletsBonus ?? 0));
}
