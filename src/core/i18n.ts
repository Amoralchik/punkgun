/**
 * Typed message seam. Copy is intentionally still inline in most of the UI;
 * new player-visible event copy should land here first so a second locale can
 * be added without rewriting the HUD/game modules.
 */
export type MessageKey =
  | 'event.bossPhase'
  | 'event.bossCharge'
  | 'event.caseSecured'
  | 'event.exitOpen'
  | 'event.kerenzikov'
  | 'event.netrunnerHack'
  | 'event.netrunnerChannel'
  | 'event.objectiveComplete'
  | 'event.sabotage'
  | 'event.secondHeart'
  | 'event.quickhack'
  | 'event.quickhackFail'
  | 'event.execution'
  | 'event.caseHeavy'
  | 'event.civilianDown'
  | 'event.overtime'
  | 'event.exitDefended'
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
  | 'hud.zoneHeld'
  | 'tip.deploy'
  | 'tip.armor'
  | 'tip.reload'
  | 'tip.execute'
  | 'station.note.exchange1'
  | 'station.note.exchange2'
  | 'station.note.market'
  | 'station.note.operatorAttr'
  | 'station.note.operatorHistory'
  | 'station.note.operatorPresets'
  | 'station.note.operatorSave'
  | 'station.note.sanctuary'
  | 'station.note.ventures1'
  | 'station.note.ventures2'
  | 'station.note.contractLocked'
  | 'station.note.contractKit'
  | 'epilogue.faction.helix'
  | 'epilogue.faction.teeth'
  | 'epilogue.faction.orbit'
  | 'epilogue.faction.sublevel'
  | 'epilogue.faction.market'
  | 'epilogue.role.solo'
  | 'epilogue.role.netrunner'
  | 'epilogue.role.techie'
  | 'epilogue.role.fixer'
  | 'epilogue.role.medtech'
  | 'epilogue.path.street'
  | 'epilogue.path.corp'
  | 'epilogue.path.nomad';

const EN: Record<MessageKey, string> = {
  'event.bossPhase': 'ARMOR PLATE SHATTERED — BOSS PHASE SHIFT',
  'event.bossCharge': 'BOSS CHARGING — BREAK LINE OF SIGHT OR SIDESTEP',
  'event.caseSecured': 'CASE SECURED — EXTRACT UNDER FIRE',
  'event.exitOpen': 'EXIT OPEN — GET OUT',
  'event.kerenzikov': 'KERENZIKOV — TIME DILATION',
  'event.netrunnerHack': 'SIGNAL SCRAMBLED — CYBERWARE LOCKED',
  'event.netrunnerChannel': 'NETRUNNER CHANNELING — BREAK SIGHT OR KILL IT',
  'event.objectiveComplete': 'OBJECTIVE COMPLETE — EXIT OPEN',
  'event.sabotage': 'TAP PLANTED — GRID COMPROMISED',
  'event.secondHeart': 'SECOND HEART — FLATLINE AVERTED',
  'event.quickhack': 'QUICKHACK — TARGET REBOOTED',
  'event.quickhackFail': 'NO VALID QUICKHACK TARGET',
  'event.execution': 'EXECUTION',
  'event.caseHeavy': 'CASE IN HAND — TOO HEAVY TO DASH',
  'event.civilianDown': 'BYSTANDER DOWN — HEAT UP, PAY DOCKED',
  'event.overtime': 'OVERTIME — HUNTERS INBOUND. EXTRACT NOW.',
  'event.exitDefended': 'EXIT HELD — SQUAD DUG IN AT EXTRACTION',
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
  'tip.deploy': 'EVERYONE DIES IN ONE HIT. SPACE DASHES THROUGH FIRE.',
  'tip.armor': 'PLATE BROKEN — THE NEXT HIT KILLS. BREAK LINE OF SIGHT.',
  'tip.reload': 'MAGAZINE EMPTY. PRESS R BEFORE THE NEXT ROOM.',
  'tip.execute': 'STUNNED TARGET. PRESS E TO EXECUTE.',
  'station.note.exchange1': 'Five names. One city. Prices move after every clean extraction. Dividends pay on the same tick.',
  'station.note.exchange2': 'Buy low, sell high, or hold for dividends. A crash is a buying opportunity if you survive it.',
  'station.note.market': 'Buy ammo from storage. Sell guns and contraband here; pack consumables at the supply depot.',
  'station.note.operatorAttr': '{count} attribute points available. Spend them at the clinic.',
  'station.note.operatorHistory': 'NO RUNS RECORDED. DEPLOY AND COME BACK.',
  'station.note.operatorPresets': 'Save the currently equipped fit, then re-equip it from storage. Presets never duplicate gear.',
  'station.note.operatorSave': 'Export a validated v2 JSON snapshot, or import a v1/v2 save. Import replaces current progress.',
  'station.note.sanctuary': 'The room remembers what you invest in it. Upgrade a station to change the view and the run.',
  'station.note.ventures1': 'Businesses pay after every clean extraction. Upgrades compound through three ranks.',
  'station.note.ventures2': 'Bars move faction standing. Clinics cut prices. Chop shops feed the fabricator.',
  'station.note.contractLocked': 'BOSS ACCESS LOCKED — {clears}/{required} regular clears required.',
  'epilogue.faction.helix': 'Helix files your name under unresolved.',
  'epilogue.faction.teeth': 'The Teeth keep a chair empty and a debt open.',
  'epilogue.faction.orbit': 'Low Orbit routes one last container in your name.',
  'epilogue.faction.sublevel': 'The Sublevel keeps your file warm.',
  'epilogue.faction.market': 'The night market sells your story without a receipt.',
  'epilogue.role.solo': 'The block tells it like a straight fight.',
  'epilogue.role.netrunner': 'The mesh remembers a ghost with your signature.',
  'epilogue.role.techie': 'Every panel you touched still lies for you.',
  'epilogue.role.fixer': 'Somebody else is paying your interest now.',
  'epilogue.role.medtech': 'The crews you patched keep breathing.',
  'epilogue.path.street': 'The block opens one door it does not open for outsiders.',
  'epilogue.path.corp': 'Your old badge still clears one elevator.',
  'epilogue.path.nomad': 'The convoy leaves a gap in the patrol schedule.',
  'station.note.contractKit': 'The packed kit is consumed on launch. Die in the sector and the carried weapon and loot are lost.',
};

const ES: Record<MessageKey, string> = {
  'event.bossPhase': 'PLACA DESTRUIDA — CAMBIO DE FASE',
  'event.bossCharge': 'JEFE CARGANDO — ROMPE LA LÍNEA DE VISIÓN O ESQUIVA',
  'event.caseSecured': 'MALETÍN ASEGURADO — EXTRAE BAJO FUEGO',
  'event.exitOpen': 'SALIDA ABIERTA — VETE',
  'event.kerenzikov': 'KERENZIKOV — DILATACIÓN TEMPORAL',
  'event.netrunnerHack': 'SEÑAL CORTADA — CIBERWARE BLOQUEADO',
  'event.netrunnerChannel': 'NETRUNNER CANALIZANDO — ROMPE LA VISIÓN O MÁTALO',
  'event.objectiveComplete': 'OBJETIVO CUMPLIDO — SALIDA ABIERTA',
  'event.sabotage': 'TAP COLOCADO — RED COMPROMETIDA',
  'event.secondHeart': 'SEGUNDO CORAZÓN — LÍNEA PLANA EVITADA',
  'event.quickhack': 'QUICKHACK — OBJETIVO REINICIADO',
  'event.quickhackFail': 'SIN OBJETIVO VÁLIDO',
  'event.execution': 'EJECUCIÓN',
  'event.caseHeavy': 'MALETÍN EN MANO — DEMASIADO PESADO PARA ESQUIVAR',
  'event.civilianDown': 'CIVIL ABATIDO — SUBE EL CALOR, BAJA LA PAGA',
  'event.overtime': 'TIEMPO EXTRA — CAZADORES EN CAMINO. EXTRAE YA.',
  'event.exitDefended': 'SALIDA TOMADA — ESCUADRÓN ATRINCHERADO EN LA EXTRACCIÓN',
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
  'tip.deploy': 'TODOS MUEREN DE UN GOLPE. EL IMPULSO (ESPACIO) CRUZA EL FUEGO.',
  'tip.armor': 'PLACA ROTA — EL SIGUIENTE IMPACTO MATA. ROMPE LA LÍNEA DE VISIÓN.',
  'tip.reload': 'CARGADOR VACÍO. PULSA R ANTES DE LA SIGUIENTE SALA.',
  'tip.execute': 'OBJETIVO ATURDIDO. PULSA E PARA EJECUTAR.',
  'station.note.exchange1': 'Cinco nombres. Una ciudad. Los precios se mueven tras cada extracción limpia. Los dividendos pagan en el mismo tick.',
  'station.note.exchange2': 'Compra barato, vende caro o mantén por dividendos. Una caída es una oportunidad si sobrevives.',
  'station.note.market': 'Compra munición del almacén. Vende armas y contrabando aquí; prepara consumibles en suministros.',
  'station.note.operatorAttr': '{count} puntos de atributo disponibles. Gástalos en la clínica.',
  'station.note.operatorHistory': 'SIN PARTIDAS REGISTRADAS. DESPLIÉGATE Y VUELVE.',
  'station.note.operatorPresets': 'Guarda el equipo actual y vuelve a equiparlo desde el almacén. Los presets no duplican equipo.',
  'station.note.operatorSave': 'Exporta una instantánea JSON v2 validada o importa una partida v1/v2. Importar reemplaza el progreso.',
  'station.note.sanctuary': 'La sala recuerda lo que inviertes. Mejora una estación para cambiar la vista y la partida.',
  'station.note.ventures1': 'Los negocios pagan tras cada extracción limpia. Las mejoras se acumulan en tres rangos.',
  'station.note.ventures2': 'Los bares mueven la reputación. Las clínicas bajan precios. Los desguaces alimentan la fabricadora.',
  'station.note.contractLocked': 'ACCESO AL JEFE BLOQUEADO — {clears}/{required} limpiezas regulares requeridas.',
  'station.note.contractKit': 'El kit se consume al lanzar. Si mueres en el sector, pierdes el arma y el botín que llevas.',
  'epilogue.faction.helix': 'Helix archiva tu nombre como no resuelto.',
  'epilogue.faction.teeth': 'Los Dientes dejan una silla vacía y una deuda abierta.',
  'epilogue.faction.orbit': 'Low Orbit envía un último contenedor a tu nombre.',
  'epilogue.faction.sublevel': 'El Subnivel mantiene tu expediente caliente.',
  'epilogue.faction.market': 'El mercado nocturno vende tu historia sin recibo.',
  'epilogue.role.solo': 'El bloque lo cuenta como una pelea directa.',
  'epilogue.role.netrunner': 'La red recuerda un fantasma con tu firma.',
  'epilogue.role.techie': 'Cada panel que tocaste sigue mintiendo por ti.',
  'epilogue.role.fixer': 'Ahora otro paga tus intereses.',
  'epilogue.role.medtech': 'Las cuadrillas que curaste siguen respirando.',
  'epilogue.path.street': 'El bloque abre una puerta que no abre para extraños.',
  'epilogue.path.corp': 'Tu vieja placa todavía abre un ascensor.',
  'epilogue.path.nomad': 'El convoy deja un hueco en el horario de patrullas.',
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
