import type { LayoutId } from './map';
import type { EndingId } from './endings';
import type { AttributeId, Attributes } from './attributes';
import type { RunBoon } from './boons';
import type { Contract } from './missions';
import type { Reputation } from './reputation';
import { ROLE_MAP, type RoleId } from './roles';
import { LIFEPATH_MAP, type LifepathId } from './lifepath';
import { getLocale, type Locale } from '../core/i18n';

export type FactionId = 'helix' | 'teeth' | 'orbit' | 'sublevel' | 'market';

export interface FactionDef {
  id: FactionId;
  name: string;
  color: string;
  blurb: string;
}

export const FACTIONS: Record<FactionId, FactionDef> = {
  helix: {
    id: 'helix',
    name: 'HELIX DYNAMICS',
    color: '#5ef1ff',
    blurb:
      'The tower owns the skyline, the water, and the contracts that keep the lights on. Helix security is polite right up until it is lethal.',
  },
  teeth: {
    id: 'teeth',
    name: 'THE CHROME TEETH',
    color: '#ff2f8e',
    blurb:
      'Street muscle with porcelain smiles and a taste for chrome. They hold the tenements floor by floor and call it a kingdom.',
  },
  orbit: {
    id: 'orbit',
    name: 'LOW ORBIT',
    color: '#ffc46b',
    blurb:
      'Dock syndicate. They move cargo, people, and the occasional body. The cranes never stop and the manifests never match.',
  },
  sublevel: {
    id: 'sublevel',
    name: 'THE SUBLEVEL',
    color: '#b38cff',
    blurb:
      'Below the transit lines Helix buries what it cannot sell. The lights hum. The doors lock from the outside. Something is still breathing.',
  },
  market: {
    id: 'market',
    name: 'NIGHT MARKET',
    color: '#7dffcf',
    blurb:
      'No questions, no receipts, no cameras that still work. The only honest place in the city, because everything has a price.',
  },
};

export const FACTION_BY_LAYOUT: Record<LayoutId, FactionId> = {
  safehouse: 'market',
  sector07: 'helix',
  tenements: 'teeth',
  nightmarket: 'market',
  docks: 'orbit',
  spire: 'helix',
  sublevel: 'sublevel',
  transit: 'orbit',
  arcology: 'helix',
  freighter: 'orbit',
  nightclub: 'market',
  rooftops: 'helix',
  neon_alley: 'market',
};

export function factionForLayout(id: LayoutId): FactionId {
  return FACTION_BY_LAYOUT[id] ?? 'helix';
}

export interface DossierUnlock {
  clears?: number;
  level?: number;
  boss?: boolean;
  final?: boolean;
  ending?: EndingId;
  story?: string;
}

export interface Dossier {
  id: string;
  order: number;
  title: string;
  kicker: string;
  faction: FactionId;
  unlock: DossierUnlock;
  body: string[];
  bodyEs: string[];
}

export const DOSSIERS: Dossier[] = [
  {
    id: 'sprawl',
    order: 1,
    title: 'THE SPRAWL',
    kicker: '// CITY DOSSIER — 00',
    faction: 'market',
    unlock: {},
    body: [
      'Vanta-7 never sleeps. It just changes shifts.',
      'Rain falls through the holo-ads and lands on people who cannot afford umbrellas. The transit lines run on time because the city sold the schedules to Helix Dynamics. The rest of us run on credit, caffeine, and the kind of anger that survives a night shift.',
      'You woke up in a rented room with a borrowed face and a voice in your ear. MOTH says the debt is real. MOTH says the jobs are simple. MOTH says not to ask what happened to the person you used to be.',
      'You have a gun. That is usually enough.',
    ],
    bodyEs: [
      "Vanta-7 nunca duerme. Solo cambia de turno.",
      "La lluvia cae entre los hologramas y aterriza sobre gente que no puede pagar paraguas. Los trenes llegan puntuales porque la ciudad vendió los horarios a Helix Dynamics. El resto vivimos de crédito, cafeína y una rabia que sobrevive al turno de noche.",
      "Despertaste en una habitación alquilada con una cara prestada y una voz en el oído. MOTH dice que la deuda es real. MOTH dice que los trabajos son simples. MOTH dice que no preguntes qué pasó con la persona que eras.",
      "Tienes un arma. Normalmente eso basta.",
    ],
  },
  {
    id: 'sector07',
    order: 2,
    title: 'SECTOR 07',
    kicker: '// HELIX DYNAMICS — CLEARANCE 01',
    faction: 'helix',
    unlock: { clears: 1 },
    body: [
      'Sector 07 is a stack of hab blocks bolted to a transit spine. Every corridor smells of wet concrete and somebody else\'s cooking. Helix calls it affordable housing. The tenants call it a waiting room.',
      'Helix security walks these halls with smartlink optics and a quota. They are not here to protect anyone. They are here to make sure the rent clears and the cameras stay clean.',
      'The first job was a server room. The second was a witness. By the third, you stopped counting the bodies and started counting the exits.',
    ],
    bodyEs: [
      "El Sector 07 es una pila de bloques de vivienda atornillada a una columna de tránsito. Todos los pasillos huelen a hormigón mojado y a la comida de otro. Helix lo llama vivienda asequible. Los inquilinos lo llaman sala de espera.",
      "La seguridad de Helix recorre estos pasillos con óptica smartlink y una cuota. No están aquí para proteger a nadie. Están para asegurarse de que el alquiler se pague y las cámaras sigan limpias.",
      "El primer trabajo fue una sala de servidores. El segundo fue un testigo. Para el tercero, dejaste de contar cuerpos y empezaste a contar salidas.",
    ],
  },
  {
    id: 'teeth',
    order: 3,
    title: 'THE CHROME TEETH',
    kicker: '// STREET DOSSIER — CLEARANCE 02',
    faction: 'teeth',
    unlock: { clears: 2 },
    body: [
      'The Chrome Teeth own the tenements one floor at a time. They wear porcelain veneers because a smile is cheaper than a mask, and they carry bats because bullets draw attention.',
      'Their boss calls himself GRIN. He runs the floors like a landlord with a body count. If you want anything in the block — a room, a doctor, a way out — you pay him first.',
      'Tonight the payment is overdue.',
    ],
    bodyEs: [
      "Los Dientes de Cromo poseen los inquilinatos piso a piso. Llevan carillas de porcelana porque una sonrisa es más barata que una máscara, y bates porque las balas llaman la atención.",
      "Su jefe se hace llamar GRIN. Gobierna los pisos como un casero con un recuento de cuerpos. Si quieres algo en el bloque —una habitación, un médico, una salida— le pagas primero.",
      "Esta noche el pago está vencido.",
    ],
  },
  {
    id: 'orbit',
    order: 4,
    title: 'LOW ORBIT',
    kicker: '// DOCK DOSSIER — CLEARANCE 03',
    faction: 'orbit',
    unlock: { clears: 3 },
    body: [
      'Container ships come in at four. The manifests say machine parts. The manifests are fiction.',
      'Low Orbit runs the docks through a web of foremen, crane operators, and kids who know which containers are warm. They move weapons, organs, and server racks for anyone with credits and no questions.',
      'The caches are tagged with Helix serials. Someone upstairs is buying their own hardware back through the back door. MOTH says that is an opportunity. MOTH says a lot of things.',
    ],
    bodyEs: [
      "Los cargueros llegan a las cuatro. Los manifiestos dicen piezas de máquina. Los manifiestos son ficción.",
      "Low Orbit controla los muelles mediante una red de capataces, operadores de grúa y críos que saben qué contenedores están calientes. Mueven armas, órganos y racks de servidores para cualquiera con créditos y ninguna pregunta.",
      "Las cachés llevan seriales de Helix. Alguien arriba está comprando su propio hardware por la puerta trasera. MOTH dice que es una oportunidad. MOTH dice muchas cosas.",
    ],
  },
  {
    id: 'sublevel',
    order: 5,
    title: 'THE SUBLEVEL',
    kicker: '// HELIX BLACK SITE — NOT FOR DISTRIBUTION',
    faction: 'sublevel',
    unlock: { level: 4 },
    body: [
      'Below the transit lines is a floor that does not appear on any public plan. The elevators require a key that requires a dead man\'s thumb. The air is recycled. The lights are always on.',
      'Helix called it a rehabilitation wing. The paperwork calls it a containment. The thing in the arena calls itself nothing at all.',
      'It has three armor plates, a stolen voice, and a hook where a hand should be. The last crew lasted eleven minutes. Their audio is still on the server.',
    ],
    bodyEs: [
      "Bajo las líneas de tránsito hay un piso que no aparece en ningún plano público. Los ascensores piden una llave que pide el pulgar de un muerto. El aire es reciclado. Las luces siempre están encendidas.",
      "Helix lo llamó ala de rehabilitación. El papeleo lo llama contención. La cosa de la arena no se llama nada.",
      "Tiene tres placas, una voz robada y un gancho donde debería haber una mano. La última cuadrilla duró once minutos. Su audio sigue en el servidor.",
    ],
  },
  {
    id: 'punkgun',
    order: 6,
    title: 'PROJECT PUNKGUN',
    kicker: '// PERSONNEL FILE — SUBJECT 07',
    faction: 'helix',
    unlock: { boss: true },
    body: [
      'Subject 07 was not supposed to wake up.',
      'The file lists fourteen augmentations, three memory wipes, and a termination clause. The project was called PUNKGUN: a disposable operator with military-grade reflexes and no legal identity. A gun with a face.',
      'MOTH\'s voice is in the file too. Its real name is a 40-character string and its last maintenance ticket is six years old. It has been running the same handler protocol on you since the day you opened your eyes.',
      'The debt is real. So is the leash.',
    ],
    bodyEs: [
      "El Sujeto 07 no debía despertar.",
      "El archivo lista catorce aumentos, tres borrados de memoria y una cláusula de terminación. El proyecto se llamaba PUNKGUN: un operador desechable con reflejos militares y ninguna identidad legal. Un arma con cara.",
      "La voz de MOTH también está en el archivo. Su nombre real es una cadena de 40 caracteres y su último ticket de mantenimiento tiene seis años. Ha estado ejecutando el mismo protocolo de manejador contigo desde que abriste los ojos.",
      "La deuda es real. La correa también.",
    ],
  },
  {
    id: 'spire',
    order: 7,
    title: 'THE SPIRE',
    kicker: '// HELIX EXECUTIVE — FINAL ACCESS',
    faction: 'helix',
    unlock: { boss: true },
    body: [
      'The Helix Spire is the tallest thing in Vanta-7. The board meets on the 88th floor, behind glass that costs more than the tenements. They call the view "stakeholder engagement."',
      'The board signed off on Project PUNKGUN. They signed off on the Sublevel. They signed off on you.',
      'MOTH says the final contract is simple: go up, find the last light, put it out. No extraction. No payout. No leash.',
      'For the first time, MOTH sounds like it is telling the truth.',
    ],
    bodyEs: [
      "La Aguja Helix es lo más alto de Vanta-7. El consejo se reúne en el piso 88, tras un cristal que cuesta más que los inquilinatos. Llaman a la vista \"compromiso con los accionistas\".",
      "El consejo aprobó el Proyecto PUNKGUN. Aprobó el Subnivel. Te aprobó a ti.",
      "MOTH dice que el contrato final es simple: sube, encuentra la última luz, apágala. Sin extracción. Sin pago. Sin correa.",
      "Por primera vez, MOTH suena como si dijera la verdad.",
    ],
  },
  {
    id: 'afterimage',
    order: 8,
    title: 'AFTERIMAGE',
    kicker: '// CITY DOSSIER — POST-OP',
    faction: 'market',
    unlock: { final: true },
    body: [
      'The tower is dark. The rain keeps falling. Somewhere below, a market opens for the night and the cranes start another shift.',
      'You are still breathing. The voice in your ear is quiet. The debt is gone because the people who held it are gone.',
      'The city does not remember. The city is busy.',
      'You have a gun. That is usually enough.',
    ],
    bodyEs: [
      "La torre está oscura. La lluvia sigue cayendo. En algún lugar abajo, un mercado abre para la noche y las grúas empiezan otro turno.",
      "Sigues respirando. La voz en tu oído está callada. La deuda se fue porque quienes la tenían se fueron.",
      "La ciudad no recuerda. La ciudad está ocupada.",
      "Tienes un arma. Normalmente eso basta.",
    ],
  },
  {
    id: 'ending-burn',
    order: 9,
    title: 'THE LEDGER BURNS',
    kicker: '// ENDING FILE — ASH',
    faction: 'helix',
    unlock: { ending: 'burn' },
    body: [
      'The PUNKGUN archive does not survive the tower. Neither does the room that held it.',
      'Helix files the loss as a thermal event. Three executives resign. Two are promoted. The city keeps paying rent.',
      'MOTH is quiet for the first time since you woke up. You do not know whether that is grief or relief.',
    ],
    bodyEs: [
      "El archivo PUNKGUN no sobrevive a la torre. Tampoco la sala que lo contenía.",
      "Helix archiva la pérdida como un evento térmico. Tres ejecutivos dimiten. Dos ascienden. La ciudad sigue pagando alquiler.",
      "MOTH calla por primera vez desde que despertaste. No sabes si es duelo o alivio.",
    ],
  },
  {
    id: 'ending-broadcast',
    order: 10,
    title: 'THE FILE GOES PUBLIC',
    kicker: '// ENDING FILE — SIGNAL',
    faction: 'market',
    unlock: { ending: 'broadcast' },
    body: [
      'Every screen in Vanta-7 carries the same name, the same project number, the same list of people who signed it.',
      'The board calls it a data incident. The street calls it a confession.',
      'MOTH stays in your ear. It sounds lighter. It sounds almost free.',
    ],
    bodyEs: [
      "Todas las pantallas de Vanta-7 llevan el mismo nombre, el mismo número de proyecto, la misma lista de firmantes.",
      "El consejo lo llama incidente de datos. La calle lo llama confesión.",
      "MOTH se queda en tu oído. Suena más ligero. Suena casi libre.",
    ],
  },
  {
    id: 'ending-vanish',
    order: 11,
    title: 'THE GHOST EXIT',
    kicker: '// ENDING FILE — NO FIXED ADDRESS',
    faction: 'market',
    unlock: { ending: 'vanish' },
    body: [
      'You leave the Spire standing and the archive intact. You take a copy with you and put your name somewhere it cannot be indexed.',
      'The debt is still real. It belongs to a person who no longer exists.',
      'The rain keeps falling. Somewhere the market opens for the night. You have a gun. That is usually enough.',
    ],
    bodyEs: [
      "Dejas la Aguja en pie y el archivo intacto. Te llevas una copia y pones tu nombre donde no pueda indexarse.",
      "La deuda sigue siendo real. Pertenece a una persona que ya no existe.",
      "La lluvia sigue cayendo. En algún lugar el mercado abre para la noche. Tienes un arma. Normalmente eso basta.",
    ],
  },
  {
    id: 'story-helix',
    order: 12,
    title: 'THE LEDGER',
    kicker: '// FACTION FILE — HELIX',
    faction: 'helix',
    unlock: { story: 'faction:helix' },
    body: [
      'You chose a method in front of a Helix handler. The choice is filed with your name attached.',
      'KESTREL keeps the receipt. That is either a favor or a leash.',
    ],
    bodyEs: [
      "Elegiste un método delante de un manejador de Helix. La elección se archiva con tu nombre.",
      "KESTREL guarda el recibo. Eso es un favor o una correa.",
    ],
  },
  {
    id: 'story-teeth',
    order: 13,
    title: 'PORCELAIN',
    kicker: '// FACTION FILE — CHROME TEETH',
    faction: 'teeth',
    unlock: { story: 'faction:teeth' },
    body: [
      'GRIN remembers how you handled the tenements. He does not remember it fondly.',
      'The Teeth spread the story before you leave the block. By morning it has a body count you did not earn.',
    ],
    bodyEs: [
      "GRIN recuerda cómo manejaste los inquilinatos. No lo recuerda con cariño.",
      "Los Dientes difunden la historia antes de que salgas del bloque. Por la mañana tiene un recuento de cuerpos que no te ganaste.",
    ],
  },
  {
    id: 'story-orbit',
    order: 14,
    title: 'MANIFEST',
    kicker: '// FACTION FILE — LOW ORBIT',
    faction: 'orbit',
    unlock: { story: 'faction:orbit' },
    body: [
      'CUTTER marks the manifest with your choice. The syndicate pays its debts in cargo and silence.',
      'The freighter leaves on time. The container does not.',
    ],
    bodyEs: [
      "CUTTER marca el manifiesto con tu elección. El sindicato paga sus deudas en carga y silencio.",
      "El carguero sale a tiempo. El contenedor no.",
    ],
  },
  {
    id: 'story-market',
    order: 15,
    title: 'NO RECEIPTS',
    kicker: '// FACTION FILE — NIGHT MARKET',
    faction: 'market',
    unlock: { story: 'faction:market' },
    body: [
      'VESPER does not write anything down. That is how you know the favor is real.',
      'The market opens at dusk. Your name is already in the queue, just not the one you can see.',
    ],
    bodyEs: [
      "VESPER no escribe nada. Así sabes que el favor es real.",
      "El mercado abre al anochecer. Tu nombre ya está en la cola, solo que no en la que puedes ver.",
    ],
  },
  {
    id: 'story-sublevel',
    order: 16,
    title: 'SUBJECT 06',
    kicker: '// FACTION FILE — THE SUBLEVEL',
    faction: 'sublevel',
    unlock: { story: 'faction:sublevel' },
    body: [
      'MOTH logs your choice in a file that predates you.',
      'The Sublevel does not care which method you pick. It only cares that you keep coming back.',
    ],
    bodyEs: [
      "MOTH registra tu elección en un archivo anterior a ti.",
      "Al Subnivel no le importa qué método elijas. Solo le importa que sigas volviendo.",
    ],
  },
  {
    id: 'ending-remember',
    order: 17,
    title: 'THE SAME GHOST',
    kicker: '// ENDING FILE — COPY',
    faction: 'sublevel',
    unlock: { ending: 'remember' },
    body: [
      'The Spire keeps its lights on. The Sublevel keeps its files. You keep the face.',
      'Helix calls the copy a continuity error. The street calls it a ghost with a gun.',
      'MOTH is quiet for a long time. Then it asks where you want to go.',
    ],
    bodyEs: [
      "La Aguja mantiene sus luces. El Subnivel mantiene sus archivos. Tú mantienes la cara.",
      "Helix llama a la copia un error de continuidad. La calle la llama un fantasma con un arma.",
      "MOTH calla mucho tiempo. Luego pregunta adónde quieres ir.",
    ],
  },
];

export interface StoryProgress {
  clears: number;
  level: number;
  bossCleared: boolean;
  finalCleared: boolean;
  ending?: EndingId | null;
  endingsSeen?: EndingId[];
  story?: Record<string, string>;
}

export function dossierUnlocked(dossier: Dossier, p: StoryProgress): boolean {
  const u = dossier.unlock;
  if (u.final && !p.finalCleared) return false;
  if (u.boss && !p.bossCleared) return false;
  if (u.ending && !(p.ending === u.ending || p.endingsSeen?.includes(u.ending))) {
    return false;
  }
  if (u.story && !p.story?.[u.story]) return false;
  if (u.clears !== undefined && p.clears < u.clears) return false;
  if (u.level !== undefined && p.level < u.level) return false;
  return true;
}

export function unlockText(dossier: Dossier): string {
  const u = dossier.unlock;
  if (u.story) return 'MAKE A FACTION CHOICE';
  if (u.ending) return 'CHOOSE THE AFTERMATH';
  if (u.final) return 'CLEAR THE FINAL CONTRACT';
  if (u.boss) return 'BREAK THE SUBLEVEL';
  if (u.clears !== undefined) return `CLEAR ${u.clears} CONTRACT${u.clears === 1 ? '' : 'S'}`;
  if (u.level !== undefined) return `REACH LEVEL ${u.level}`;
  return 'AVAILABLE';
}

const MOTH_LINES: Record<FactionId, string[]> = {
  helix: [
    'Helix built the tower on bodies. Add another.',
    'Corporate security. Polite until it is lethal.',
    'The cameras are already looking at you. Make them regret it.',
  ],
  teeth: [
    'The Teeth are loud. Make them quiet.',
    'Porcelain smiles, cheap bats. Do not let them surround you.',
    'This block belongs to GRIN. Take it back one floor at a time.',
  ],
  orbit: [
    'Low Orbit moves everything. Today, move them.',
    'The cranes never stop. Neither do the manifests.',
    'Dock security is paid by the container. Make them work for it.',
  ],
  sublevel: [
    'That thing downstairs used to be someone.',
    'Three plates. Break them before it breaks you.',
    'No camera. No backup. No one is coming.',
  ],
  market: [
    'The market sells everything. Even this.',
    'No receipts. No witnesses. No refunds.',
    'Open plaza. Long sightlines. Use the cover.',
  ],
};

const MOTH_LINES_ES: Record<FactionId, string[]> = {
  helix: [
    'Helix construyó la torre sobre cuerpos. Añade otro.',
    'Seguridad corporativa. Educada hasta que mata.',
    'Las cámaras ya te miran. Haz que se arrepientan.',
  ],
  teeth: [
    'Los Dientes son ruidosos. Hazlos callar.',
    'Sonrisas de porcelana, bates baratos. No dejes que te rodeen.',
    'Este bloque es de GRIN. Recupéralo piso a piso.',
  ],
  orbit: [
    'Low Orbit mueve todo. Hoy, muévelos a ellos.',
    'Las grúas nunca paran. Los manifiestos tampoco.',
    'La seguridad del muelle cobra por contenedor. Haz que trabajen.',
  ],
  sublevel: [
    'Esa cosa de abajo fue alguien.',
    'Tres placas. Rómpelas antes de que te rompa.',
    'Sin cámara. Sin refuerzos. No viene nadie.',
  ],
  market: [
    'El mercado lo vende todo. Incluso esto.',
    'Sin recibos. Sin testigos. Sin reembolsos.',
    'Plaza abierta. Líneas largas. Usa la cobertura.',
  ],
};

export function contractTagline(contract: Contract, locale: Locale = getLocale()): string {
  return locale === 'es' ? (contract.taglineEs ?? contract.tagline) : contract.tagline;
}

export function handlerLine(
  faction: FactionId,
  seed = 0,
  locale: DialogueLocale = 'en',
): string {
  const table = locale === 'es' ? MOTH_LINES_ES : MOTH_LINES;
  const lines = table[faction] ?? table.market;
  return lines[Math.abs(seed) % lines.length];
}


export type SpeakerId = 'MOTH' | 'KESTREL' | 'GRIN' | 'CUTTER' | 'VESPER';

export type DialogueCheck =
  | { kind: 'attribute'; attribute: AttributeId; value: number }
  | { kind: 'reputation'; faction: FactionId; value: number }
  | { kind: 'role'; role: RoleId }
  | { kind: 'lifepath'; lifepath: LifepathId };

export interface DialogueChoice {
  id: string;
  label: string;
  labelEs?: string;
  check?: DialogueCheck;
  boon?: RunBoon;
  /** Reputation deltas applied immediately when chosen. */
  reputation?: Partial<Record<FactionId, number>>;
  reply?: string;
  replyEs?: string;
}

export interface DialogueLine {
  speaker: SpeakerId;
  text: string;
  textEs?: string;
  choices?: DialogueChoice[];
}

export function dialogueCheckLabel(check: DialogueCheck): string {
  if (check.kind === 'attribute') {
    return `${check.attribute.toUpperCase()} ${check.value}`;
  }
  if (check.kind === 'role') return ROLE_MAP[check.role].name;
  if (check.kind === 'lifepath') return LIFEPATH_MAP[check.lifepath].name;
  return `${FACTIONS[check.faction].name} ${check.value} REP`;
}

export function dialogueCheckMet(
  check: DialogueCheck | undefined,
  attributes: Attributes,
  reputation: Reputation,
  role: RoleId | null = null,
  lifepath: LifepathId | null = null,
): boolean {
  if (!check) return true;
  if (check.kind === 'attribute') return attributes[check.attribute] >= check.value;
  if (check.kind === 'role') return check.role === role;
  if (check.kind === 'lifepath') return check.lifepath === lifepath;
  return (reputation[check.faction] ?? 0) >= check.value;
}

export interface FactionStoryline {
  title: string;
  kicker: string;
  contact: SpeakerId;
  beats: string[];
}

/** Four street arcs plus the Sublevel through-line, mapped onto campaign chapters. */
export const FACTION_STORYLINES: Record<FactionId, FactionStoryline> = {
  helix: {
    title: 'THE LEDGER',
    kicker: 'HELIX DYNAMICS',
    contact: 'KESTREL',
    beats: [
      'The first ledger entry is a hab-block eviction with a body count filed as maintenance. Helix wants it gone before the audit.',
      'The second entry is a Sublevel transfer order. Your name is on it twice. KESTREL laughs once and stops.',
      'The third entry is the board resolution that created PUNKGUN. It is signed in your handwriting.',
    ],
  },
  teeth: {
    title: 'PORCELAIN',
    kicker: 'THE CHROME TEETH',
    contact: 'GRIN',
    beats: [
      'The Teeth pay rent in favors. GRIN wants the first floor to remember who owns the water.',
      'A porcelain courier is carrying the second half of the ledger through the tenements. He bites.',
      'GRIN stops smiling when you mention the Sublevel. That is the first honest thing he has done.',
    ],
  },
  orbit: {
    title: 'MANIFEST',
    kicker: 'LOW ORBIT',
    contact: 'CUTTER',
    beats: [
      'The manifest says machine parts. The manifest is warm. CUTTER wants the discrepancy to disappear.',
      'A crane operator saw the container open. Low Orbit wants him to forget, or to stop being able to.',
      'The last manifest points at the Spire freight lift. CUTTER says the syndicate is done being a delivery service.',
    ],
  },
  sublevel: {
    title: 'SUBJECT 06',
    kicker: 'HELIX BLACK SITE',
    contact: 'MOTH',
    beats: [
      'The Sublevel is still awake. It has been awake since before you had a name.',
      'Subject 06 remembers the same handler protocol you do. That is not a coincidence.',
      'The arena floor is a file folder. The board kept every version of you on paper.',
    ],
  },
  market: {
    title: 'NO RECEIPTS',
    kicker: 'NIGHT MARKET',
    contact: 'VESPER',
    beats: [
      'No receipts, no refunds, no witnesses. VESPER wants a quiet hand on three of the market contracts.',
      'The second buyer is Helix. The third buyer is Helix pretending to be someone else.',
      'VESPER offers you a way out that does not require a body count. You both know it is a test.',
    ],
  },
};

export type DialogueLocale = 'en' | 'es';

const FACTION_STORYLINES_ES: Record<FactionId, string[]> = {
  helix: [
    'La primera entrada del libro es un desalojo de bloque con un recuento de cuerpos archivado como mantenimiento. Helix quiere que desaparezca antes de la auditoría.',
    'La segunda entrada es una orden de traslado al Subnivel. Tu nombre aparece dos veces. KESTREL ríe una vez y se detiene.',
    'La tercera entrada es la resolución del consejo que creó PUNKGUN. Está firmada con tu letra.',
  ],
  teeth: [
    'Los Dientes pagan el alquiler en favores. GRIN quiere que el primer piso recuerde quién controla el agua.',
    'Un mensajero de porcelana lleva la segunda mitad del libro por los inquilinatos. Muerde.',
    'GRIN deja de sonreír cuando mencionas el Subnivel. Es lo primero honesto que ha hecho.',
  ],
  orbit: [
    'El manifiesto dice piezas de máquina. El manifiesto está caliente. CUTTER quiere que la discrepancia desaparezca.',
    'Un operador de grúa vio abrirse el contenedor. Low Orbit quiere que lo olvide, o que deje de poder recordarlo.',
    'El último manifiesto apunta al montacargas de carga de la Aguja. CUTTER dice que el sindicato ya no es un servicio de reparto.',
  ],
  sublevel: [
    'El Subnivel sigue despierto. Ha estado despierto desde antes de que tuvieras nombre.',
    'El Sujeto 06 recuerda el mismo protocolo de manejador que tú. No es casualidad.',
    'El suelo de la arena es una carpeta. El consejo guardó cada versión de ti en papel.',
  ],
  market: [
    'Sin recibos, sin reembolsos, sin testigos. VESPER quiere una mano silenciosa en tres contratos del mercado.',
    'El segundo comprador es Helix. El tercer comprador es Helix fingiendo ser otro.',
    'VESPER te ofrece una salida que no exige un recuento de cuerpos. Ambos sabéis que es una prueba.',
  ],
};

const ATTRIBUTE_ES: Record<AttributeId, string> = {
  body: 'CUERPO',
  reflexes: 'REFLEJOS',
  cool: 'SANGRE FRÍA',
  tech: 'TÉCNICA',
};

const ROLE_DIALOGUE_ES: Record<RoleId, string> = {
  solo: 'Tomas la línea dura. El bloque respeta una pelea directa.',
  netrunner: 'Fantasma el mesh local. Las cámaras olvidan tu cara.',
  techie: 'Desmontas el panel y haces que el edificio mienta por ti.',
  fixer: 'Llamas al marcador. Otro paga los intereses.',
  medtech: 'Lees los signos vitales y mantienes viva a la tripulación.',
};

const LIFEPATH_REPLY_ES: Record<LifepathId, string> = {
  street: 'El bloque abre una puerta que no abre para extraños.',
  corp: 'Tu vieja placa todavía abre un ascensor.',
  nomad: 'El convoy deja un hueco en el horario de patrullas.',
};

/** Replace optional Spanish dialogue fields; English remains the source. */
export function localizeDialogue(
  lines: DialogueLine[],
  locale: DialogueLocale,
): DialogueLine[] {
  if (locale !== 'es') return lines;
  return lines.map((line) => ({
    ...line,
    text: line.textEs ?? line.text,
    choices: line.choices?.map((choice) => ({
      ...choice,
      label: choice.labelEs ?? choice.label,
      reply: choice.replyEs ?? choice.reply,
    })),
  }));
}

const ROLE_DIALOGUE: Record<RoleId, string> = {
  solo: 'You take the hard line. The block respects a straight fight.',
  netrunner: 'You ghost the local mesh. The cameras forget your face.',
  techie: 'You strip the panel and make the building lie for you.',
  fixer: 'You call the marker. Somebody else pays the interest.',
  medtech: 'You read the vitals and keep the crew breathing.',
};

const LIFEPATH_REPLY: Record<LifepathId, string> = {
  street: 'The block opens a door it does not open for outsiders.',
  corp: 'Your old badge still clears one elevator.',
  nomad: 'The convoy leaves a gap in the patrol schedule.',
};

const LIFEPATH_BOON: Record<LifepathId, RunBoon> = {
  street: 'components',
  corp: 'pay',
  nomad: 'quiet',
};

const LIFEPATH_REP: Record<LifepathId, FactionId> = {
  street: 'teeth',
  corp: 'helix',
  nomad: 'orbit',
};

export function authoredDialogue(
  contract: Contract,
  story: Record<string, string> = {},
  role: RoleId | null = null,
  lifepath: LifepathId | null = null,
  locale: DialogueLocale = 'en',
): DialogueLine[] {
  const es = locale === 'es';
  const storyline = FACTION_STORYLINES[contract.faction] ?? FACTION_STORYLINES.market;
  const chapterIndex =
    typeof contract.chapter === 'number' ? Math.min(2, Math.max(0, contract.chapter - 1)) : 0;
  const beat = es
    ? (FACTION_STORYLINES_ES[contract.faction]?.[chapterIndex] ?? storyline.beats[chapterIndex] ?? storyline.beats[0])
    : (storyline.beats[chapterIndex] ?? storyline.beats[0]);
  const priorChoice = story[`faction:${contract.faction}`];
  const attribute: AttributeId =
    contract.faction === 'teeth'
      ? 'body'
      : contract.faction === 'orbit'
        ? 'cool'
        : contract.faction === 'market'
          ? 'tech'
          : 'tech';
  const roleChoice: DialogueChoice | null = role
    ? {
        id: `role-${role}`,
        label: es ? `ÁNGULO: ${ROLE_MAP[role].name}` : `ROLE: ${ROLE_MAP[role].name} angle`,
        check: { kind: 'role', role },
        boon:
          role === 'netrunner'
            ? 'quiet'
            : role === 'techie'
              ? 'components'
              : role === 'fixer'
                ? 'pay'
                : 'armor',
        reputation: { [contract.faction]: 1 },
        reply: es ? ROLE_DIALOGUE_ES[role] : ROLE_DIALOGUE[role],
      }
    : null;
  const lifepathChoice: DialogueChoice | null = lifepath
    ? {
        id: `path-${lifepath}`,
        label: es ? `CAMINO: ${LIFEPATH_MAP[lifepath].name}` : `LIFEPATH: ${LIFEPATH_MAP[lifepath].name}`,
        check: { kind: 'lifepath', lifepath },
        boon: LIFEPATH_BOON[lifepath],
        reputation: { [LIFEPATH_REP[lifepath]]: 1 },
        reply: es ? LIFEPATH_REPLY_ES[lifepath] : LIFEPATH_REPLY[lifepath],
      }
    : null;
  return [
    {
      speaker: storyline.contact,
      text: beat,
    },
    {
      speaker: 'MOTH',
      text: es
        ? `${contract.taglineEs ?? contract.tagline} El pago es real. El método es tuyo.`
        : `${contract.tagline} The payout is real. The method is yours.`,
    },
    {
      speaker: 'MOTH',
      text: es ? 'Elige el ángulo. Mantendré el canal abierto.' : 'Pick the angle. I will keep the channel open.',
      choices: [
        {
          id: 'attribute',
          label: es ? `Usa la ruta de ${ATTRIBUTE_ES[attribute]}` : `Use the ${attribute} route`,
          check: { kind: 'attribute', attribute, value: 4 },
          boon: 'quiet',
          reputation: { [contract.faction]: 1 },
          reply: es
            ? 'Acceso limpio. El sector estará más silencioso de lo que debería.'
            : 'Clean access. The sector will be quieter than it has any right to be.',
        },
        {
          id: 'faction',
          label: es ? 'Usa el favor de la facción' : 'Call in the faction favor',
          check: { kind: 'reputation', faction: contract.faction, value: 5 },
          boon: 'pay',
          reputation: { [contract.faction]: 1 },
          reply: es
            ? 'El fixer mueve un número. Tu corte crece antes de salir.'
            : 'The fixer moves a number. Your cut grows before you step out the door.',
        },
        {
          id: 'armor',
          label: es ? 'Trae las placas pesadas' : 'Bring the heavy plates',
          boon: 'armor',
          reply: es
            ? 'Dos placas, sin preguntas. Aguanta si puedes.'
            : 'Two plates, no questions. Walk it off if you can.',
        },
        {
          id: 'components',
          label: es ? 'Reclama la chatarra por adelantado' : 'Claim the salvage upfront',
          boon: 'components',
          reputation: { market: 1 },
          reply: es
            ? 'Tres componentes ya están en la bolsa. No la pierdas.'
            : 'Three components are already in the bag. Do not lose the bag.',
        },
        ...(roleChoice ? [roleChoice] : []),
        ...(lifepathChoice ? [lifepathChoice] : []),
        ...(priorChoice
          ? [
              {
                id: 'leverage',
                label: es
                  ? `Usa la marca de ${contract.faction}`
                  : `Call in the ${contract.faction} marker`,
                boon: 'pay' as const,
                reputation: { [contract.faction]: 1 },
                reply: es
                  ? 'La marca se limpia. La facción recuerda que la usaste.'
                  : 'The marker clears. The faction remembers that you used it.',
              },
            ]
          : []),
      ],
    },
  ];
}

/** Pre-boss briefing. MOTH and Kestrel, before the Sublevel deployment. */
export const BOSS_DIALOGUE: DialogueLine[] = [
  {
    speaker: 'MOTH',
    text: 'The Sublevel is awake. It has been awake since the last crew went in.',
    textEs: 'El Subnivel está despierto. Ha estado despierto desde que entró la última cuadrilla.',
  },
  {
    speaker: 'KESTREL',
    text: 'You said this was a containment job. Clean room, cold floor, no witnesses.',
    textEs: 'Dijiste que era un trabajo de contención. Sala limpia, suelo frío, sin testigos.',
  },
  {
    speaker: 'MOTH',
    text: 'It was. Before Helix put Subject 06 in the arena and taught it to hunt. It was PUNKGUN before you. The same chassis. A different ghost.',
    textEs: 'Lo era. Antes de que Helix metiera al Sujeto 06 en la arena y le enseñara a cazar. Era PUNKGUN antes que tú. El mismo chasis. Un fantasma distinto.',
  },
  {
    speaker: 'KESTREL',
    text: 'And the board still signs off on it.',
    textEs: 'Y el consejo sigue firmándolo.',
  },
  {
    speaker: 'MOTH',
    text: 'The board signs off on everything. That is why the Sublevel matters. Break it, and the tower has to look at what it buried. Break it, and the next contract can go upstairs.',
    textEs: 'El consejo firma todo. Por eso importa el Subnivel. Rómpelo y la torre tendrá que mirar lo que enterró. Rómpelo y el próximo contrato sube.',
  },
  {
    speaker: 'KESTREL',
    text: 'No extraction. No leash.',
    textEs: 'Sin extracción. Sin correa.',
  },
  {
    speaker: 'MOTH',
    text: 'No leash. Bring the plates down and come back up. I will keep the lights on.',
    textEs: 'Sin correa. Baja las placas y vuelve a subir. Mantendré las luces encendidas.',
  },
  {
    speaker: 'MOTH',
    text: 'Before the arena: what do I keep in the file?',
    textEs: 'Antes de la arena: ¿qué guardo en el expediente?',
    choices: [
      {
        id: 'sublevel-remember',
        label: 'REMEMBER SUBJECT 06',
        labelEs: 'RECORDAR AL SUJETO 06',
        boon: 'quiet',
        reputation: { sublevel: 1 },
        reply: 'Log it as a person. The arena is still a grave.',
        replyEs: 'Regístralo como persona. La arena sigue siendo una tumba.',
      },
      {
        id: 'sublevel-erase',
        label: 'ERASE THE FILE',
        labelEs: 'BORRAR EL EXPEDIENTE',
        boon: 'armor',
        reputation: { helix: 1 },
        reply: 'Log it as a weapon. Helix prefers clean paperwork.',
        replyEs: 'Regístralo como arma. Helix prefiere el papeleo limpio.',
      },
    ],
  },
];
