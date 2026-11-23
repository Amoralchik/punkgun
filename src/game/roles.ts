import type { RunMods } from './progression';

export type RoleId = 'solo' | 'netrunner' | 'techie' | 'fixer' | 'medtech';

export interface RoleDef {
  id: RoleId;
  name: string;
  code: string;
  blurb: string;
  color: string;
}

export const ROLES: RoleDef[] = [
  {
    id: 'solo',
    name: 'SOLO',
    code: 'COMBAT',
    blurb: 'Front-line operator. One extra plate and tighter gun control.',
    color: '#ff7a4c',
  },
  {
    id: 'netrunner',
    name: 'NETRUNNER',
    code: 'INTRUSION',
    blurb: 'Cyberware cooldowns -20% and stronger resistance to hacks.',
    color: '#5ef1ff',
  },
  {
    id: 'techie',
    name: 'TECHIE',
    code: 'HARDWARE',
    blurb: 'Faster reloads, cheaper cyberware and more salvage.',
    color: '#b38cff',
  },
  {
    id: 'fixer',
    name: 'FIXER',
    code: 'ECONOMY',
    blurb: '+8% contract pay, better cache value and black-market prices.',
    color: '#ffc46b',
  },
  {
    id: 'medtech',
    name: 'MEDTECH',
    code: 'SUPPORT',
    blurb: 'Faster regen, better speed under pressure and cheaper supplies.',
    color: '#7dffcf',
  },
];

export const ROLE_MAP: Record<RoleId, RoleDef> = Object.fromEntries(
  ROLES.map((role) => [role.id, role]),
) as Record<RoleId, RoleDef>;

export function rolePayMult(role: RoleId | null): number {
  return role === 'fixer' ? 1.08 : 1;
}

export function roleMarketDiscount(role: RoleId | null): number {
  return role === 'fixer' ? 0.05 : 0;
}

export function roleClinicDiscount(role: RoleId | null): number {
  return role === 'techie' ? 0.05 : role === 'medtech' ? 0.05 : 0;
}

export function roleSupplyDiscount(role: RoleId | null): number {
  return role === 'medtech' ? 0.05 : 0;
}

/** Apply role identity on top of cyberware/perk/attribute modifiers. */
export function applyRoleMods(mods: RunMods, role: RoleId | null): RunMods {
  if (!role) return mods;
  const next = { ...mods };
  if (role === 'solo') {
    next.armor = Math.min(6, next.armor + 1);
    next.spread *= 0.92;
  } else if (role === 'netrunner') {
    next.abilityCd *= 0.8;
    next.hackResist = Math.min(0.6, next.hackResist + 0.15);
  } else if (role === 'techie') {
    next.reload *= 0.85;
    next.abilityCd *= 0.92;
    next.componentBonus = Math.min(1, next.componentBonus + 0.2);
  } else if (role === 'fixer') {
    next.lootMult = Math.min(1.4, next.lootMult * 1.1);
  } else if (role === 'medtech') {
    next.regenBoost += 1;
    next.hackResist = Math.min(0.6, next.hackResist + 0.1);
    next.speed = Math.min(1.6, next.speed * 1.03);
  }
  return next;
}
