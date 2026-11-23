export type AttributeId = 'body' | 'reflexes' | 'cool' | 'tech';

export type Attributes = Record<AttributeId, number>;

export const ATTR_BASE = 3;
export const ATTR_MAX = 8;

export interface AttributeDef {
  id: AttributeId;
  name: string;
  short: string;
  shortEs: string;
  desc: string;
  descEs: string;
  color: string;
}

export const ATTRIBUTE_DEFS: AttributeDef[] = [
  {
    id: 'body',
    name: 'BODY',
    short: 'STRENGTH',
    shortEs: 'FUERZA',
    desc: '+1 ARMOR AT 5. UNLOCKS LOUD BREACH AT 5.',
    descEs: '+1 ARMADURA A 5. DESBLOQUEA BRECHA RUIDOSA A 5.',
    color: '#ff7a4c',
  },
  {
    id: 'reflexes',
    name: 'REFLEXES',
    short: 'AGILITY',
    shortEs: 'AGILIDAD',
    desc: '+3% MOVE SPEED PER POINT OVER 3.',
    descEs: '+3% VELOCIDAD POR PUNTO SOBRE 3.',
    color: '#ffc46b',
  },
  {
    id: 'cool',
    name: 'COOL',
    short: 'STYLE',
    shortEs: 'ESTILO',
    desc: 'ENEMY VISION -3% PER POINT OVER 3. UNLOCKS GHOST ENTRY AT 5.',
    descEs: 'VISIÓN ENEMIGA -3% POR PUNTO SOBRE 3. DESBLOQUEA ENTRADA FANTASMA A 5.',
    color: '#5ef1ff',
  },
  {
    id: 'tech',
    name: 'TECH',
    short: 'ABILITY',
    shortEs: 'HABILIDAD',
    desc: 'GUN COOLDOWN -2% PER POINT OVER 3. UNLOCKS BLACKOUT AT 4.',
    descEs: 'RECARGA DE ARMA -2% POR PUNTO SOBRE 3. DESBLOQUEA APAGÓN A 4.',
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
  descEs: string;
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
    descEs: 'Entra limpio. Sin modificadores de detección ni de pago.',
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
    descEs: 'Patea la puerta. Todos los hostiles lo oyen y convergen. +20% pago.',
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
    descEs: 'Engaña las cámaras y muévete en silencio. Los enemigos detectan a mitad de alcance. +15% pago.',
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
    descEs: 'Corta la red del bloque. Los enemigos solo te ven de cerca. +10% pago.',
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
    descEs: 'Entrada Kerenzikov. Dos segundos de tiempo lento y detección tardía. +12% pago.',
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
