import type { Attributes } from './attributes';
import { EMPTY_ATTRIBUTES } from './attributes';

export type CyberwareId =
  | 'subdermal'
  | 'reflex'
  | 'smartlink'
  | 'ocular'
  | 'sandevistan'
  | 'camo'
  | 'heart'
  | 'biomonitor'
  | 'mantis'
  | 'gorilla'
  | 'kerenzikov'
  | 'adrenaline'
  | 'lynx'
  | 'targeting'
  | 'microgenerator'
  | 'berserk'
  | 'overclock'
  | 'cyberdeck'
  | 'painEditor'
  | 'reloadTuner'
  | 'neuralLink'
  | 'bioplastic';

export type PerkId =
  | 'sprinter'
  | 'ghost'
  | 'brawler'
  | 'gunslinger'
  | 'executioner'
  | 'scavenger'
  | 'marksman'
  | 'juggernaut'
  | 'shadow'
  | 'gunsmith'
  | 'technophile'
  | 'adrenalineJunkie'
  | 'demolitionist'
  | 'vulture'
  | 'bladeDancer'
  | 'slipstream'
  | 'chainKiller'
  | 'ghostProtocol'
  | 'warMachine';

export interface CyberwareDef {
  id: CyberwareId;
  name: string;
  desc: string;
  descEs: string;
  maxRank: number;
  costs: number[];
  /** Neural load per rank. Capacity comes from BODY and level. */
  humanity: number[];
}

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  descEs: string;
  maxRank: number;
  requires?: { id: PerkId; rank: number };
  exclusiveWith?: PerkId[];
}

export const CYBERWARE_DEFS: CyberwareDef[] = [
  {
    id: 'subdermal',
    name: 'SUBDERMAL WEAVE',
    desc: 'ARMOR PLATE +1 PER RANK. EACH PLATE ABSORBS ONE LETHAL HIT.',
    descEs: 'PLACA DE ARMADURA +1 POR RANGO. CADA PLACA ABSORBE UN IMPACTO LETAL.',
    maxRank: 3,
    costs: [300, 650, 1100],
    humanity: [4, 4, 4],
  },
  {
    id: 'reflex',
    name: 'REFLEX SPURS',
    desc: 'MOVE SPEED +6% PER RANK.',
    descEs: 'VELOCIDAD +6% POR RANGO.',
    maxRank: 2,
    costs: [250, 500],
    humanity: [3, 3],
  },
  {
    id: 'smartlink',
    name: 'SMARTLINK',
    desc: 'WEAPON SPREAD -12% PER RANK.',
    descEs: 'DISPERSIÓN -12% POR RANGO.',
    maxRank: 2,
    costs: [350, 700],
    humanity: [3, 3],
  },
  {
    id: 'ocular',
    name: 'OCULAR VEIL',
    desc: 'ENEMY VISION RANGE -8% PER RANK.',
    descEs: 'VISIÓN ENEMIGA -8% POR RANGO.',
    maxRank: 2,
    costs: [300, 650],
    humanity: [3, 3],
  },
  {
    id: 'sandevistan',
    name: 'SANDEVISTAN',
    desc: 'ACTIVE [SHIFT]: THE WORLD SLOWS TO 35% FOR 2.5S. COOLDOWN 14S.',
    descEs: 'ACTIVO [MAYÚS]: EL MUNDO SE RALENTIZA AL 35% DURANTE 2.5S. RECARGA 14S.',
    maxRank: 2,
    costs: [550, 950],
    humanity: [6, 6],
  },
  {
    id: 'camo',
    name: 'OPTICAL CAMO',
    desc: 'ACTIVE [C]: CLOAK FOR 2.5S. FIRING OR THROWING BREAKS IT. COOLDOWN 12S.',
    descEs: 'ACTIVO [C]: CAMUFLAJE 2.5S. DISPARAR O LANZAR LO ROMPE. RECARGA 12S.',
    maxRank: 2,
    costs: [450, 800],
    humanity: [5, 5],
  },
  {
    id: 'heart',
    name: 'SECOND HEART',
    desc: 'ONCE PER RUN: SURVIVE A LETHAL HIT WITH ONE ARMOR PLATE.',
    descEs: 'UNA VEZ POR PARTIDA: SOBREVIVE A UN IMPACTO LETAL CON UNA PLACA.',
    maxRank: 1,
    costs: [900],
    humanity: [8],
  },
  {
    id: 'biomonitor',
    name: 'BIOMONITOR',
    desc: 'RESTORE 1 ARMOR AFTER 6S WITHOUT TAKING DAMAGE.',
    descEs: 'RECUPERA 1 ARMADURA TRAS 6S SIN RECIBIR DAÑO.',
    maxRank: 2,
    costs: [400, 750],
    humanity: [3, 3],
  },
  {
    id: 'mantis',
    name: 'MANTIS BLADES',
    desc: 'MELEE REACH +25%. MELEE KILLS ARE SILENT.',
    descEs: 'ALCANCE MELÉ +25%. LAS MUERTES MELÉ SON SILENCIOSAS.',
    maxRank: 2,
    costs: [500, 850],
    humanity: [5, 5],
  },
  {
    id: 'gorilla',
    name: 'GORILLA ARMS',
    desc: 'MELEE IGNORES SHIELDS. DOOR SLAMS HIT A WIDER ARC.',
    descEs: 'MELÉ IGNORA ESCUDOS. LOS PORTAZOS GOLPEAN UN ARCO MAYOR.',
    maxRank: 2,
    costs: [450, 800],
    humanity: [4, 4],
  },
  {
    id: 'kerenzikov',
    name: 'KERENZIKOV',
    desc: 'WHEN A PLATE BREAKS, TIME DILATES FOR 1.2S PER RANK. INTERNAL 9S COOLDOWN.',
    descEs: 'AL ROMPERSE UNA PLACA, EL TIEMPO SE DILATA 1.2S POR RANGO. RECARGA INTERNA 9S.',
    maxRank: 2,
    costs: [600, 1000],
    humanity: [4, 4],
  },
  {
    id: 'adrenaline',
    name: 'ADRENALINE PUMP',
    desc: 'KILLS GRANT +5% MOVE SPEED FOR 4S PER RANK. STACKS REFRESH.',
    descEs: 'LAS MUERTES DAN +5% VELOCIDAD DURANTE 4S POR RANGO. LAS ACUMULACIONES SE RENUEVAN.',
    maxRank: 2,
    costs: [420, 760],
    humanity: [3, 3],
  },
  {
    id: 'lynx',
    name: 'LYNX PAWS',
    desc: 'MOVEMENT AND GUNFIRE GENERATE -20% HEAT PER RANK.',
    descEs: 'MOVIMIENTO Y DISPAROS GENERAN -20% CALOR POR RANGO.',
    maxRank: 2,
    costs: [380, 700],
    humanity: [2, 2],
  },
  {
    id: 'targeting',
    name: 'TARGETING COPROCESSOR',
    desc: 'ROUNDS PIERCE +1 ENEMY PER RANK.',
    descEs: 'LAS BALAS PERFORAN +1 ENEMIGO POR RANGO.',
    maxRank: 2,
    costs: [520, 900],
    humanity: [3, 3],
  },
  {
    id: 'microgenerator',
    name: 'MICROGENERATOR',
    desc: 'ACTIVE [X]: EMP STUNS HOSTILES AND DISABLES ELECTRONICS IN 260 UNITS. CD 18S.',
    descEs: 'ACTIVO [X]: EMP ATURDE HOSTILES Y DESACTIVA ELECTRÓNICA EN 260 UNIDADES. RECARGA 18S.',
    maxRank: 2,
    costs: [650, 1050],
    humanity: [6, 6],
  },
  {
    id: 'berserk',
    name: 'BERSERK',
    desc: 'ACTIVE [V]: 4S OF +30% SPEED AND FASTER MELEE. CD 20S.',
    descEs: 'ACTIVO [V]: 4S DE +30% VELOCIDAD Y MELÉ MÁS RÁPIDA. RECARGA 20S.',
    maxRank: 2,
    costs: [700, 1150],
    humanity: [7, 7],
  },
  {
    id: 'overclock',
    name: 'OVERCLOCK',
    desc: 'ACTIVE [G]: 3.5S OF -35% GUN COOLDOWN AND TIGHTER SPREAD. CD 18S.',
    descEs: 'ACTIVO [G]: 3.5S DE -35% RECARGA DE ARMA Y DISPERSIÓN MÁS CERRADA. RECARGA 18S.',
    maxRank: 2,
    costs: [580, 980],
    humanity: [5, 5],
  },
  {
    id: 'cyberdeck',
    name: 'INTRUSION DECK',
    desc: 'ACTIVE [H]: SHUT DOWN CAMERAS, TURRETS AND LASERS IN 420 UNITS FOR 8S. CD 22S.',
    descEs: 'ACTIVO [H]: APAGA CÁMARAS, TORRETAS Y LÁSERES EN 420 UNIDADES DURANTE 8S. RECARGA 22S.',
    maxRank: 2,
    costs: [620, 1020],
    humanity: [6, 6],
  },
  {
    id: 'painEditor',
    name: 'PAIN EDITOR',
    desc: '+1 ARMOR PLATE AND -35% NETRUNNER HACK DURATION. HIGH NEURAL LOAD.',
    descEs: '+1 PLACA Y -35% DURACIÓN DE HACK NETRUNNER. CARGA NEURAL ALTA.',
    maxRank: 1,
    costs: [880],
    humanity: [9],
  },
  {
    id: 'reloadTuner',
    name: 'RELOAD TUNER',
    desc: 'RELOAD TIME -18% PER RANK.',
    descEs: 'RECARGA -18% POR RANGO.',
    maxRank: 2,
    costs: [320, 620],
    humanity: [2, 2],
  },
  {
    id: 'neuralLink',
    name: 'NEURAL LINK',
    desc: 'ACTIVE CYBERWARE COOLDOWNS -15% PER RANK.',
    descEs: 'RECARGAS DE CIBERWARE ACTIVO -15% POR RANGO.',
    maxRank: 2,
    costs: [480, 840],
    humanity: [4, 4],
  },
  {
    id: 'bioplastic',
    name: 'BIOPLASTIC SHEATH',
    desc: 'ARMOR REGENERATES ONE STEP FASTER. +1 PLATE AT RANK 2.',
    descEs: 'LA ARMADURA SE REGENERA UN PASO MÁS RÁPIDO. +1 PLACA EN RANGO 2.',
    maxRank: 2,
    costs: [460, 820],
    humanity: [4, 4],
  },
];

export const PERK_DEFS: PerkDef[] = [
  {
    id: 'sprinter',
    name: 'SPRINTER',
    desc: 'MOVE SPEED +6% PER RANK.',
    descEs: 'VELOCIDAD +6% POR RANGO.',
    maxRank: 3,
  },
  {
    id: 'ghost',
    name: 'GHOST',
    desc: 'ENEMY VISION RANGE -7% PER RANK.',
    descEs: 'VISIÓN ENEMIGA -7% POR RANGO.',
    maxRank: 3,
  },
  {
    id: 'brawler',
    name: 'BRAWLER',
    desc: 'MELEE REACH +12%, MELEE COOLDOWN -8% PER RANK.',
    descEs: 'ALCANCE MELÉ +12%, RECARGA MELÉ -8% POR RANGO.',
    maxRank: 3,
  },
  {
    id: 'gunslinger',
    name: 'GUNSLINGER',
    desc: 'GUN COOLDOWN -8%, SPREAD -10% PER RANK.',
    descEs: 'RECARGA DE ARMA -8%, DISPERSIÓN -10% POR RANGO.',
    maxRank: 3,
  },
  {
    id: 'executioner',
    name: 'EXECUTIONER',
    desc: 'KILLS GRANT +4% MOVE SPEED FOR 4S PER RANK.',
    descEs: 'LAS MUERTES DAN +4% VELOCIDAD DURANTE 4S POR RANGO.',
    maxRank: 3,
  },
  {
    id: 'scavenger',
    name: 'SCAVENGER',
    desc: 'KILLS YIELD +25% COMPONENTS PER RANK.',
    descEs: 'LAS MUERTES DAN +25% COMPONENTES POR RANGO.',
    maxRank: 2,
  },
  {
    id: 'marksman',
    name: 'MARKSMAN',
    desc: 'RIFLE / DMR / RAILGUN SPREAD -20% PER RANK.',
    descEs: 'DISPERSIÓN DE RIFLE / DMR / RAILGUN -20% POR RANGO.',
    maxRank: 2,
  },
  {
    id: 'juggernaut',
    name: 'JUGGERNAUT',
    desc: 'BODY 5+: +1 ARMOR PLATE. REQUIRES COMMITMENT.',
    descEs: 'CUERPO 5+: +1 PLACA. REQUIERE COMPROMISO.',
    maxRank: 1,
  },
  {
    id: 'shadow',
    name: 'SHADOW',
    desc: 'TAKEDOWN REACH +20% PER RANK AND CAMO CD -8% PER RANK.',
    descEs: 'ALCANCE DE DERRIBO +20% POR RANGO Y RECARGA DE CAMUFLAJE -8% POR RANGO.',
    maxRank: 2,
  },
  {
    id: 'gunsmith',
    name: 'GUNSMITH',
    desc: 'RELOAD -12% PER RANK. WORKBENCH ATTACHMENTS -10%.',
    descEs: 'RECARGA -12% POR RANGO. ACCESORIOS DE BANCO -10%.',
    maxRank: 2,
  },
  {
    id: 'technophile',
    name: 'TECHNOPHILE',
    desc: 'CYBERWARE -8% COST PER RANK, ABILITY CD -6% PER RANK.',
    descEs: 'CIBERWARE -8% COSTE POR RANGO, RECARGA DE HABILIDAD -6% POR RANGO.',
    maxRank: 2,
  },
  {
    id: 'adrenalineJunkie',
    name: 'ADRENALINE JUNKIE',
    desc: '+12% MOVE SPEED WHILE OUT OF ARMOR PLATES. RISKY.',
    descEs: '+12% VELOCIDAD SIN PLACAS. ARRIESGADO.',
    maxRank: 1,
  },
  {
    id: 'demolitionist',
    name: 'DEMOLITIONIST',
    desc: 'PLAYER GRENADE RADIUS +15% PER RANK.',
    descEs: 'RADIO DE GRANADA +15% POR RANGO.',
    maxRank: 2,
  },
  {
    id: 'vulture',
    name: 'VULTURE',
    desc: 'CACHE VALUE +8% PER RANK.',
    descEs: 'VALOR DE CACHÉ +8% POR RANGO.',
    maxRank: 2,
  },
  {
    id: 'bladeDancer',
    name: 'BLADE DANCER',
    desc: 'MELEE KILLS IMMEDIATELY RESET THE SWING. CHAIN THE ROOM.',
    descEs: 'LAS MUERTES MELÉ REINICIAN EL GOLPE AL INSTANTE. ENCADENA LA SALA.',
    maxRank: 1,
  },
  {
    id: 'slipstream',
    name: 'SLIPSTREAM',
    desc: 'DASH COOLDOWN -10% AND +0.02S I-FRAMES PER RANK.',
    descEs: 'RECARGA DE IMPULSO -10% Y +0.02S DE INVULNERABILIDAD POR RANGO.',
    maxRank: 2,
  },
  {
    id: 'chainKiller',
    name: 'CHAIN KILLER',
    desc: 'COMBO WINDOW +0.5S PER RANK. CHAIN THE ROOM.',
    descEs: 'VENTANA DE COMBO +0.5S POR RANGO. ENCADENA LA SALA.',
    maxRank: 2,
  },
  {
    id: 'ghostProtocol',
    name: 'GHOST PROTOCOL',
    desc: 'CAPSTONE: ENEMY VISION -10%. EXCLUSIVE WITH WAR MACHINE. REQUIRES GHOST 1.',
    descEs: 'CAPSTONE: VISIÓN ENEMIGA -10%. EXCLUSIVO CON MÁQUINA DE GUERRA. REQUIERE FANTASMA 1.',
    maxRank: 1,
    requires: { id: 'ghost', rank: 1 },
    exclusiveWith: ['warMachine'],
  },
  {
    id: 'warMachine',
    name: 'WAR MACHINE',
    desc: 'CAPSTONE: +1 ARMOR, GUN SPREAD -10%. EXCLUSIVE WITH GHOST PROTOCOL. REQUIRES JUGGERNAUT 1.',
    descEs: 'CAPSTONE: +1 ARMADURA, DISPERSIÓN -10%. EXCLUSIVO CON PROTOCOLO FANTASMA. REQUIERE JUGGERNAUT 1.',
    maxRank: 1,
    requires: { id: 'juggernaut', rank: 1 },
    exclusiveWith: ['ghostProtocol'],
  },
];

export type CyberwareRanks = Record<CyberwareId, number>;
export type PerkRanks = Record<PerkId, number>;

export function emptyCyberware(): CyberwareRanks {
  return Object.fromEntries(CYBERWARE_DEFS.map((def) => [def.id, 0])) as CyberwareRanks;
}

export function emptyPerks(): PerkRanks {
  return Object.fromEntries(PERK_DEFS.map((def) => [def.id, 0])) as PerkRanks;
}

export const EMPTY_CYBERWARE = emptyCyberware();
export const EMPTY_PERKS = emptyPerks();

export interface RunMods {
  armor: number;
  speed: number;
  meleeCooldown: number;
  gunCooldown: number;
  spread: number;
  meleeReach: number;
  vision: number;
  sandevistan: number;
  camo: number;
  heart: number;
  biomonitor: number;
  mantis: number;
  gorilla: number;
  reload: number;
  abilityCd: number;
  pierce: number;
  killSpeed: number;
  hackResist: number;
  precisionSpread: number;
  lowArmorSpeed: number;
  takedownReach: number;
  grenadeRadius: number;
  lootMult: number;
  componentBonus: number;
  meleeKillReset: number;
  kerenzikov: number;
  heatMult: number;
  emp: number;
  berserk: number;
  overclock: number;
  deck: number;
  regenBoost: number;
  dashCd: number;
  dashInvuln: number;
  comboWindow: number;
  humanityStage: number;
}

export function baseMods(): RunMods {
  return {
    armor: 0,
    speed: 1,
    meleeCooldown: 1,
    gunCooldown: 1,
    spread: 1,
    meleeReach: 1,
    vision: 1,
    sandevistan: 0,
    camo: 0,
    heart: 0,
    biomonitor: 0,
    mantis: 0,
    gorilla: 0,
    reload: 1,
    abilityCd: 1,
    pierce: 0,
    killSpeed: 0,
    hackResist: 0,
    precisionSpread: 1,
    lowArmorSpeed: 0,
    takedownReach: 1,
    grenadeRadius: 1,
    lootMult: 1,
    componentBonus: 0,
    meleeKillReset: 0,
    kerenzikov: 0,
    heatMult: 1,
    emp: 0,
    berserk: 0,
    overclock: 0,
    deck: 0,
    regenBoost: 0,
    dashCd: 1,
    dashInvuln: 0,
    comboWindow: 0,
    humanityStage: 0,
  };
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * Derived combat modifiers. `humanityStage` is optional so unit tests and
 * hub previews can inspect the base build without the strain penalty.
 */
export function computeMods(
  cyberware: CyberwareRanks,
  perks: PerkRanks,
  attributes: Attributes = EMPTY_ATTRIBUTES,
  humanityStage = 0,
): RunMods {
  const strain = clamp(humanityStage, 0, 3);
  const armor = clamp(
    cyberware.subdermal +
      (cyberware.biomonitor > 0 ? 1 : 0) +
      (cyberware.painEditor > 0 ? 1 : 0) +
      (cyberware.bioplastic >= 2 ? 1 : 0) +
      (attributes.body >= 5 ? 1 : 0) +
      (perks.juggernaut > 0 && attributes.body >= 5 ? 1 : 0) +
      (perks.warMachine > 0 ? 1 : 0) -
      (strain >= 2 ? 1 : 0),
    0,
    6,
  );
  const techReduction = perks.technophile * 0.06;
  const abilityCd = clamp(
    (1 + strain * 0.1) * (1 - cyberware.neuralLink * 0.15) * (1 - techReduction),
    0.6,
    1.55,
  );
  return {
    armor,
    speed: clamp(
      1 +
        cyberware.reflex * 0.06 +
        perks.sprinter * 0.06 +
        (attributes.reflexes - 3) * 0.03,
      1,
      1.6,
    ),
    meleeCooldown: clamp(1 - perks.brawler * 0.08, 0.55, 1),
    gunCooldown: clamp(
      1 - perks.gunslinger * 0.08 - (attributes.tech - 3) * 0.02,
      0.4,
      1,
    ),
    spread: clamp(
      (1 - cyberware.smartlink * 0.12 - perks.gunslinger * 0.1) *
        (perks.warMachine > 0 ? 0.9 : 1),
      0.25,
      1,
    ),
    meleeReach: clamp(1 + perks.brawler * 0.12 + cyberware.mantis * 0.25, 1, 1.85),
    vision: clamp(
      1 -
        cyberware.ocular * 0.08 -
        perks.ghost * 0.07 -
        (attributes.cool - 3) * 0.03 -
        (strain >= 2 ? 0.05 : 0) -
        (perks.ghostProtocol > 0 ? 0.1 : 0),
      0.35,
      1,
    ),
    sandevistan: clamp(cyberware.sandevistan, 0, 2),
    camo: clamp(cyberware.camo, 0, 2),
    heart: clamp(cyberware.heart, 0, 1),
    biomonitor: clamp(cyberware.biomonitor, 0, 2),
    mantis: clamp(cyberware.mantis, 0, 2),
    gorilla: clamp(cyberware.gorilla, 0, 2),
    reload: clamp(1 - cyberware.reloadTuner * 0.18 - perks.gunsmith * 0.12, 0.35, 1),
    abilityCd,
    pierce: clamp(cyberware.targeting, 0, 2),
    killSpeed:
      clamp(cyberware.adrenaline * 0.05 + perks.executioner * 0.04, 0, 0.16),
    hackResist: clamp(cyberware.painEditor * 0.35, 0, 0.5),
    precisionSpread: clamp(1 - perks.marksman * 0.2, 0.55, 1),
    lowArmorSpeed: clamp(perks.adrenalineJunkie * 0.12, 0, 0.12),
    takedownReach: clamp(1 + perks.shadow * 0.2, 1, 1.6),
    grenadeRadius: clamp(1 + perks.demolitionist * 0.15, 1, 1.5),
    lootMult: clamp(1 + perks.vulture * 0.08, 1, 1.3),
    componentBonus: clamp(perks.scavenger * 0.25, 0, 0.5),
    meleeKillReset: clamp(perks.bladeDancer, 0, 1),
    kerenzikov: clamp(cyberware.kerenzikov, 0, 2),
    heatMult: clamp(1 - cyberware.lynx * 0.2, 0.5, 1),
    emp: clamp(cyberware.microgenerator, 0, 2),
    berserk: clamp(cyberware.berserk, 0, 2),
    overclock: clamp(cyberware.overclock, 0, 2),
    deck: clamp(cyberware.cyberdeck, 0, 2),
    regenBoost: clamp(cyberware.bioplastic, 0, 2),
    dashCd: clamp(1 - perks.slipstream * 0.1, 0.6, 1),
    dashInvuln: clamp(perks.slipstream * 0.02, 0, 0.04),
    comboWindow: clamp(perks.chainKiller * 0.5, 0, 1),
    humanityStage: strain,
  };
}

/** Humanity capacity grows with BODY and level; implants consume it permanently. */
export function humanityCapacity(attributes: Attributes, level: number): number {
  return 12 + attributes.body * 4 + Math.max(0, level - 1) * 2;
}

export function humanityUsed(cyberware: CyberwareRanks): number {
  let total = 0;
  for (const def of CYBERWARE_DEFS) {
    for (let rank = 0; rank < cyberware[def.id]; rank++) {
      total += def.humanity[rank] ?? def.humanity[def.humanity.length - 1] ?? 0;
    }
  }
  return total;
}

export type HumanityStage = 0 | 1 | 2 | 3;

export function humanityStage(used: number, capacity: number): HumanityStage {
  if (capacity <= 0) return 3;
  const ratio = used / capacity;
  if (ratio >= 1) return 3;
  if (ratio >= 0.85) return 2;
  if (ratio >= 0.6) return 1;
  return 0;
}

export function humanityLabel(stage: HumanityStage): string {
  if (stage >= 3) return 'CYBERPSYCHOSIS';
  if (stage === 2) return 'CRITICAL STRAIN';
  if (stage === 1) return 'STRAINED';
  return 'STABLE';
}

/** XP needed to advance from the given level. */
export function xpForNext(level: number): number {
  return 100 + Math.max(0, level - 1) * 50;
}
