import type { FactionId } from './lore';
import type { WeaponId } from './weapons';

export type LifepathId = 'street' | 'corp' | 'nomad';

export interface LifepathDef {
  id: LifepathId;
  name: string;
  kicker: string;
  desc: string;
  descEs: string;
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
    descEs: 'Creciste en el bloque. Los Dientes conocen tu cara y tus deudas.',
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
    descEs: 'Firmaste el contrato. Helix te enseñó a sonreír mientras contabas cuerpos.',
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
    descEs: 'Llegaste con un convoy y te quedaste por el trabajo. Low Orbit aún te debe una ruta.',
    color: '#ffc46b',
    money: 90,
    reputation: { orbit: 2 },
    startWeapon: 'revolver',
  },
];

export const LIFEPATH_MAP: Record<LifepathId, LifepathDef> = Object.fromEntries(
  LIFEPATHS.map((path) => [path.id, path]),
) as Record<LifepathId, LifepathDef>;
