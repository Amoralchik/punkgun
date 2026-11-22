import type { GunId } from './weapons';

export type AttachmentId = 'suppressor' | 'extended' | 'laser' | 'spring';

export interface AttachmentDef {
  id: AttachmentId;
  name: string;
  desc: string;
  cost: number;
  /** Extra rounds granted at the start of a run, by weapon type. */
  ammoBonus: Partial<Record<GunId, number>>;
}

export const ATTACHMENTS: AttachmentDef[] = [
  {
    id: 'suppressor',
    name: 'SUPPRESSOR',
    desc: 'GUNSHOT HEAT -60%, ALERT RADIUS -55%.',
    cost: 180,
    ammoBonus: {},
  },
  {
    id: 'extended',
    name: 'EXTENDED MAG',
    desc: '+50% MAGAZINE AT RUN START. HEAVY WEAPONS GAIN MORE.',
    cost: 120,
    ammoBonus: { pistol: 4, shotgun: 3, smg: 12, rifle: 5, ak: 15, lmg: 30 },
  },
  {
    id: 'laser',
    name: 'LASER SIGHT',
    desc: 'WEAPON SPREAD -35%.',
    cost: 150,
    ammoBonus: {},
  },
  {
    id: 'spring',
    name: 'HEAVY SPRING',
    desc: 'GUN COOLDOWN -20%.',
    cost: 170,
    ammoBonus: {},
  },
];

export const ATTACHMENT_MAP: Record<AttachmentId, AttachmentDef> = {
  suppressor: ATTACHMENTS[0],
  extended: ATTACHMENTS[1],
  laser: ATTACHMENTS[2],
  spring: ATTACHMENTS[3],
};
