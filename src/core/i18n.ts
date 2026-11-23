/**
 * Typed message seam. Copy is intentionally still inline in most of the UI;
 * new player-visible event copy should land here first so a second locale can
 * be added without rewriting the HUD/game modules.
 */
export type MessageKey =
  | 'event.bossPhase'
  | 'event.caseSecured'
  | 'event.exitOpen'
  | 'event.kerenzikov'
  | 'event.netrunnerHack'
  | 'event.objectiveComplete'
  | 'event.sabotage'
  | 'event.secondHeart'
  | 'event.quickhack'
  | 'event.quickhackFail'
  | 'event.execution'
  | 'objective.purge'
  | 'objective.target'
  | 'objective.recover'
  | 'objective.sabotage'
  | 'objective.extraction'
  | 'objective.hunt'
  | 'objective.defense'
  | 'objective.boss'
  | 'objective.detail.purge'
  | 'objective.detail.target'
  | 'objective.detail.recover'
  | 'objective.detail.sabotage'
  | 'objective.detail.extraction'
  | 'objective.detail.hunt'
  | 'objective.detail.defense'
  | 'objective.detail.boss'
  | 'station.contracts'
  | 'station.workbench'
  | 'station.clinic'
  | 'station.market'
  | 'station.supplies'
  | 'station.archive'
  | 'station.fabricator'
  | 'station.operator'
  | 'station.sanctuary'
  | 'station.deploy'
  | 'station.title.contracts'
  | 'station.title.deploy'
  | 'station.title.market'
  | 'station.title.supplies'
  | 'station.title.archive'
  | 'station.title.fabricator'
  | 'station.title.operator'
  | 'boon.armor.label'
  | 'boon.armor.desc'
  | 'boon.pay.label'
  | 'boon.pay.desc'
  | 'boon.quiet.label'
  | 'boon.quiet.desc'
  | 'boon.components.label'
  | 'boon.components.desc'
  | 'hud.sabotage'
  | 'hud.case'
  | 'hud.caseSecured'
  | 'hud.holdZone'
  | 'hud.zoneHeld';

const EN: Record<MessageKey, string> = {
  'event.bossPhase': 'ARMOR PLATE SHATTERED — BOSS PHASE SHIFT',
  'event.caseSecured': 'CASE SECURED — EXTRACT UNDER FIRE',
  'event.exitOpen': 'EXIT OPEN — GET OUT',
  'event.kerenzikov': 'KERENZIKOV — TIME DILATION',
  'event.netrunnerHack': 'SIGNAL SCRAMBLED — CYBERWARE LOCKED',
  'event.objectiveComplete': 'OBJECTIVE COMPLETE — EXIT OPEN',
  'event.sabotage': 'TAP PLANTED — GRID COMPROMISED',
  'event.secondHeart': 'SECOND HEART — FLATLINE AVERTED',
  'event.quickhack': 'QUICKHACK — TARGET REBOOTED',
  'event.quickhackFail': 'NO VALID QUICKHACK TARGET',
  'event.execution': 'EXECUTION',
  'objective.purge': 'PURGE ALL HOSTILES',
  'objective.target': 'KILL THE MARKED TARGET',
  'objective.recover': 'RECOVER {count} CACHE{plural}',
  'objective.sabotage': 'SABOTAGE {count} TERMINAL{plural}',
  'objective.extraction': 'SECURE THE CASE',
  'objective.hunt': 'HUNT THE MARKED TARGET',
  'objective.defense': 'HOLD THE ZONE',
  'objective.boss': 'KILL THE BOSS',
  'objective.detail.purge': 'Eliminate every hostile in the sector, then reach the exit.',
  'objective.detail.target': 'Only the amber-marked target matters. Kill it, then reach the exit.',
  'objective.detail.recover': 'Grab {count} marked cache{plural}, then reach the exit.',
  'objective.detail.sabotage': 'Reach {count} marked terminal{plural} and plant the tap. Cameras and patrols make noise.',
  'objective.detail.extraction': 'Secure the package. The sector will converge once you touch it. Reach the exit.',
  'objective.detail.hunt': 'The target flees and calls for help. Corner it, kill it, then reach the exit.',
  'objective.detail.defense': 'Hold the marked zone for 45 seconds. Reinforcements arrive in waves.',
  'objective.detail.boss': 'Break the boss armor plates, survive the arena mechanics, then reach the exit.',
  'station.contracts': 'CONTRACTS',
  'station.workbench': 'WORKBENCH',
  'station.clinic': 'CLINIC',
  'station.market': 'MARKET',
  'station.supplies': 'SUPPLIES',
  'station.archive': 'ARCHIVE',
  'station.fabricator': 'FABRICATOR',
  'station.operator': 'OPERATOR',
  'station.sanctuary': 'SANCTUARY',
  'station.deploy': 'DEPLOY',
  'station.title.contracts': 'BOUNTY BOARD',
  'station.title.deploy': 'MISSION SELECT',
  'station.title.market': 'THE MARKET',
  'station.title.supplies': 'SUPPLIES',
  'station.title.archive': 'GHOSTS & GHOST STORIES',
  'station.title.fabricator': 'BUILD YOUR OWN',
  'station.title.operator': 'CHARACTER SHEET',
  'boon.armor.label': 'EXTRA PLATE',
  'boon.armor.desc': 'Start the contract with one additional armor plate.',
  'boon.pay.label': 'FIXER CUT',
  'boon.pay.desc': '+12% contract payout.',
  'boon.quiet.label': 'ACCESS CODES',
  'boon.quiet.desc': 'Enemy vision range -15% for the run.',
  'boon.components.label': 'SALVAGE CLAIM',
  'boon.components.desc': 'Extract with 3 bonus fabrication components.',
  'hud.sabotage': 'SABOTAGE {done}/{total}',
  'hud.case': 'SECURE THE CASE',
  'hud.caseSecured': 'CASE SECURED — EXIT',
  'hud.holdZone': 'HOLD THE ZONE {seconds}S',
  'hud.zoneHeld': 'ZONE HELD — EXIT',
};

const ES: Record<MessageKey, string> = {
  'event.bossPhase': 'PLACA DESTRUIDA — CAMBIO DE FASE',
  'event.caseSecured': 'MALETÍN ASEGURADO — EXTRAE BAJO FUEGO',
  'event.exitOpen': 'SALIDA ABIERTA — VETE',
  'event.kerenzikov': 'KERENZIKOV — DILATACIÓN TEMPORAL',
  'event.netrunnerHack': 'SEÑAL CORTADA — CIBERWARE BLOQUEADO',
  'event.objectiveComplete': 'OBJETIVO CUMPLIDO — SALIDA ABIERTA',
  'event.sabotage': 'TAP COLOCADO — RED COMPROMETIDA',
  'event.secondHeart': 'SEGUNDO CORAZÓN — LÍNEA PLANA EVITADA',
  'event.quickhack': 'QUICKHACK — OBJETIVO REINICIADO',
  'event.quickhackFail': 'SIN OBJETIVO VÁLIDO',
  'event.execution': 'EJECUCIÓN',
  'objective.purge': 'ELIMINA A TODOS LOS HOSTILES',
  'objective.target': 'MATA AL OBJETIVO MARCADO',
  'objective.recover': 'RECUPERA {count} CACHÉ{plural}',
  'objective.sabotage': 'SABOTEA {count} TERMINAL{plural}',
  'objective.extraction': 'ASEGURA EL MALETÍN',
  'objective.hunt': 'CAZA AL OBJETIVO MARCADO',
  'objective.defense': 'MANTÉN LA ZONA',
  'objective.boss': 'MATA AL JEFE',
  'objective.detail.purge': 'Elimina a todos los hostiles del sector y llega a la salida.',
  'objective.detail.target': 'Solo importa el objetivo ámbar. Mátalo y llega a la salida.',
  'objective.detail.recover': 'Recoge {count} caché{plural} marcada y llega a la salida.',
  'objective.detail.sabotage': 'Llega a {count} terminal{plural} marcada y coloca el tap. Cámaras y patrullas hacen ruido.',
  'objective.detail.extraction': 'Asegura el paquete. El sector convergerá al tocarlo. Llega a la salida.',
  'objective.detail.hunt': 'El objetivo huye y pide ayuda. Acorrálalo, mátalo y llega a la salida.',
  'objective.detail.defense': 'Mantén la zona marcada durante 45 segundos. Llegan oleadas.',
  'objective.detail.boss': 'Rompe las placas del jefe, sobrevive a la arena y llega a la salida.',
  'station.contracts': 'CONTRATOS',
  'station.workbench': 'BANCO',
  'station.clinic': 'CLÍNICA',
  'station.market': 'MERCADO',
  'station.supplies': 'SUMINISTROS',
  'station.archive': 'ARCHIVO',
  'station.fabricator': 'FABRICADORA',
  'station.operator': 'OPERADOR',
  'station.sanctuary': 'SANTUARIO',
  'station.deploy': 'DESPLIEGUE',
  'station.title.contracts': 'TABLÓN DE CONTRATOS',
  'station.title.deploy': 'SELECCIÓN DE MISIÓN',
  'station.title.market': 'EL MERCADO',
  'station.title.supplies': 'SUMINISTROS',
  'station.title.archive': 'FANTASMAS Y LEYENDAS',
  'station.title.fabricator': 'CONSTRUYE LO TUYO',
  'station.title.operator': 'HOJA DE OPERADOR',
  'boon.armor.label': 'PLACA EXTRA',
  'boon.armor.desc': 'Empieza con una placa de armadura adicional.',
  'boon.pay.label': 'CORTE DEL FIXER',
  'boon.pay.desc': '+12% de pago del contrato.',
  'boon.quiet.label': 'CÓDIGOS DE ACCESO',
  'boon.quiet.desc': 'Visión enemiga -15% durante la partida.',
  'boon.components.label': 'RECLAMO DE CHATARRA',
  'boon.components.desc': 'Extrae con 3 componentes extra.',
  'hud.sabotage': 'SABOTAJE {done}/{total}',
  'hud.case': 'ASEGURA EL MALETÍN',
  'hud.caseSecured': 'MALETÍN ASEGURADO — SALIDA',
  'hud.holdZone': 'MANTÉN LA ZONA {seconds}S',
  'hud.zoneHeld': 'ZONA MANTENIDA — SALIDA',
};

const CATALOGS: Record<Locale, Record<MessageKey, string>> = { en: EN, es: ES };
let currentLocale: Locale = 'en';

export type Locale = 'en' | 'es';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(
  key: MessageKey,
  vars?: Record<string, string | number>,
  locale: Locale = currentLocale,
): string {
  let text = CATALOGS[locale]?.[key] ?? EN[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
