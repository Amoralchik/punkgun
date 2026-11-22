export type AttributeId = 'body' | 'reflexes' | 'cool' | 'tech';

export type Attributes = Record<AttributeId, number>;

export const ATTR_BASE = 3;
export const ATTR_MAX = 8;

export interface AttributeDef {
  id: AttributeId;
  name: string;
  short: string;
  desc: string;
  color: string;
}

export const ATTRIBUTE_DEFS: AttributeDef[] = [
  {
    id: 'body',
    name: 'BODY',
    short: 'STRENGTH',
    desc: '+1 ARMOR AT 5. UNLOCKS LOUD BREACH AT 5.',
    color: '#ff7a4c',
  },
  {
    id: 'reflexes',
    name: 'REFLEXES',
    short: 'AGILITY',
    desc: '+3% MOVE SPEED PER POINT OVER 3.',
    color: '#ffc46b',
  },
  {
    id: 'cool',
    name: 'COOL',
    short: 'STYLE',
    desc: 'ENEMY VISION -3% PER POINT OVER 3. UNLOCKS GHOST ENTRY AT 5.',
    color: '#5ef1ff',
  },
  {
    id: 'tech',
    name: 'TECH',
    short: 'ABILITY',
    desc: 'GUN COOLDOWN -2% PER POINT OVER 3. UNLOCKS BLACKOUT AT 4.',
    color: '#b38cff',
  },
];

export const EMPTY_ATTRIBUTES: Attributes = {
  body: ATTR_BASE,
  reflexes: ATTR_BASE,
  cool: ATTR_BASE,
  tech: ATTR_BASE,
};

export function normalizeAttributes(raw: Partial<Record<AttributeId, number>> | undefined): Attributes {
  const out: Attributes = { ...EMPTY_ATTRIBUTES };
  for (const def of ATTRIBUTE_DEFS) {
    const value = raw?.[def.id];
    out[def.id] =
      typeof value === 'number' && Number.isFinite(value)
        ? Math.max(ATTR_BASE, Math.min(ATTR_MAX, Math.floor(value)))
        : ATTR_BASE;
  }
  return out;
}

export function attributesSpent(attributes: Attributes): number {
  return ATTRIBUTE_DEFS.reduce((sum, def) => sum + (attributes[def.id] - ATTR_BASE), 0);
}

export type ApproachId = 'standard' | 'loud' | 'ghost' | 'blackout' | 'highline';

export interface ApproachDef {
  id: ApproachId;
  name: string;
  code: string;
  desc: string;
  /** Attribute gate. */
  attribute: AttributeId | null;
  required: number;
  /** Enemy vision multiplier. */
  visionMult: number;
  /** Start every hostile in chase. */
  loud: boolean;
  /** Contract pay multiplier. */
  payoutMult: number;
  color: string;
}

export const APPROACHES: ApproachDef[] = [
  {
    id: 'standard',
    name: 'STANDARD INSERTION',
    code: 'BALANCED',
    desc: 'Walk in clean. No detection modifiers, no payout modifier.',
    attribute: null,
    required: 0,
    visionMult: 1,
    loud: false,
    payoutMult: 1,
    color: '#5ef1ff',
  },
  {
    id: 'loud',
    name: 'LOUD BREACH',
    code: 'BODY',
    desc: 'Kick the door. Every hostile hears it and converges. +20% contract pay.',
    attribute: 'body',
    required: 5,
    visionMult: 1,
    loud: true,
    payoutMult: 1.2,
    color: '#ff7a4c',
  },
  {
    id: 'ghost',
    name: 'GHOST ENTRY',
    code: 'COOL',
    desc: 'Loop the cameras and move quiet. Enemies detect at half range. +15% pay.',
    attribute: 'cool',
    required: 5,
    visionMult: 0.5,
    loud: false,
    payoutMult: 1.15,
    color: '#5ef1ff',
  },
  {
    id: 'blackout',
    name: 'BLACKOUT',
    code: 'TECH',
    desc: 'Cut the block grid. Enemies only see you at close range. +10% pay.',
    attribute: 'tech',
    required: 4,
    visionMult: 0.3,
    loud: false,
    payoutMult: 1.1,
    color: '#b38cff',
  },
  {
    id: 'highline',
    name: 'HIGH LINE',
    code: 'REFLEXES',
    desc: 'Kerenzikov entry. Two seconds of slow time and late detection. +12% pay.',
    attribute: 'reflexes',
    required: 5,
    visionMult: 0.75,
    loud: false,
    payoutMult: 1.12,
    color: '#ffc46b',
  },
];

export const APPROACH_MAP: Record<ApproachId, ApproachDef> = {
  standard: APPROACHES[0],
  loud: APPROACHES[1],
  ghost: APPROACHES[2],
  blackout: APPROACHES[3],
  highline: APPROACHES[4],
};

export function approachUnlocked(approach: ApproachDef, attributes: Attributes): boolean {
  if (!approach.attribute) return true;
  return attributes[approach.attribute] >= approach.required;
}

export function approachRequirement(approach: ApproachDef): string {
  if (!approach.attribute) return 'NO REQUIREMENT';
  const def = ATTRIBUTE_DEFS.find((d) => d.id === approach.attribute);
  return `${def?.name ?? approach.attribute} ${approach.required}`;
}
