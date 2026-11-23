import type { FactionId } from './lore';
import type { WeaponId } from './weapons';

export type LifepathId = 'street' | 'corp' | 'nomad';

export interface LifepathDef {
  id: LifepathId;
  name: string;
  kicker: string;
  desc: string;
  color: string;
  money: number;
  reputation: Partial<Record<FactionId, number>>;
  startWeapon: Exclude<WeaponId, 'fists'> | null;
}

export const LIFEPATHS: LifepathDef[] = [
  {
    id: 'street',
    name: 'STREET KID',
    kicker: '// LIFEPATH 01',
    desc: 'You grew up on the block. The Teeth know your face and your debts.',
    color: '#ff2f8e',
    money: 60,
    reputation: { teeth: 2 },
    startWeapon: 'bat',
  },
  {
    id: 'corp',
    name: 'CORPO',
    kicker: '// LIFEPATH 02',
    desc: 'You signed the contract. Helix taught you how to smile while counting bodies.',
    color: '#5ef1ff',
    money: 300,
    reputation: { helix: 2 },
    startWeapon: null,
  },
  {
    id: 'nomad',
    name: 'NOMAD',
    kicker: '// LIFEPATH 03',
    desc: 'You came in with a convoy and stayed for the work. Low Orbit still owes you a route.',
    color: '#ffc46b',
    money: 90,
    reputation: { orbit: 2 },
    startWeapon: 'revolver',
  },
];

export const LIFEPATH_MAP: Record<LifepathId, LifepathDef> = Object.fromEntries(
  LIFEPATHS.map((path) => [path.id, path]),
) as Record<LifepathId, LifepathDef>;
