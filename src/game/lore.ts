import type { LayoutId } from './map';
import type { BossId } from './bosses';
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

const BOSS_BRIEFINGS: Partial<Record<BossId, DialogueLine[]>> = {
  grin: [
    {
      speaker: 'GRIN',
      text: 'You walked into my house with my ledger on your hip. Say something worth the rent.',
      textEs: 'Entraste en mi casa con mi libro en la cadera. Di algo que valga el alquiler.',
    },
    {
      speaker: 'MOTH',
      text: 'Three plates and a mouth full of porcelain. The first lie is free.',
      textEs: 'Tres placas y la boca llena de porcelana. La primera mentira es gratis.',
    },
    {
      speaker: 'KESTREL',
      text: 'No extraction. Just the floor, the smile, and the door behind you.',
      textEs: 'Sin extracción. Solo el piso, la sonrisa y la puerta a tu espalda.',
    },
  ],
  crane: [
    {
      speaker: 'MOTH',
      text: 'Half forklift, half man. The hook has a reach. Do not stand under it.',
      textEs: 'Mitad montacargas, mitad hombre. El gancho tiene alcance. No te pongas debajo.',
    },
    {
      speaker: 'KESTREL',
      text: 'The docks are already loud. Make them quieter.',
      textEs: 'Los muelles ya son ruidosos. Hazlos más silenciosos.',
    },
    {
      speaker: 'MOTH',
      text: 'The manifest says one operator. The manifest is wrong.',
      textEs: 'El manifiesto dice un operador. El manifiesto se equivoca.',
    },
  ],
  board: [
    {
      speaker: 'MOTH',
      text: 'The board has five plates and a committee of voices. Break the plates, not the voice.',
      textEs: 'El consejo tiene cinco placas y un comité de voces. Rompe las placas, no la voz.',
    },
    {
      speaker: 'KESTREL',
      text: 'After this, there is no floor above you.',
      textEs: 'Después de esto, no hay piso encima de ti.',
    },
    {
      speaker: 'MOTH',
      text: 'You are a line item that learned to shoot. Make the ledger bleed.',
      textEs: 'Eres una línea de gastos que aprendió a disparar. Haz sangrar el libro.',
    },
  ],
  seraph: [
    {
      speaker: 'MOTH',
      text: 'Rogue netrunner. Every camera in the alley is hers.',
      textEs: 'Netrunner renegada. Todas las cámaras del callejón son suyas.',
    },
    {
      speaker: 'KESTREL',
      text: 'Kill the signal before it finishes wearing you.',
      textEs: 'Mata la señal antes de que termine de llevarte puesto.',
    },
    {
      speaker: 'MOTH',
      text: 'It remembers a face like yours. It might be wearing it.',
      textEs: 'Recuerda una cara como la tuya. Puede que la esté llevando.',
    },
  ],
  archivist: [
    {
      speaker: 'MOTH',
      text: 'It remembers every version of you. Do not let it remember this one.',
      textEs: 'Recuerda cada versión de ti. No dejes que recuerde esta.',
    },
    {
      speaker: 'KESTREL',
      text: 'Burn the index. Leave the building standing.',
      textEs: 'Quema el índice. Deja el edificio en pie.',
    },
    {
      speaker: 'MOTH',
      text: 'You are on file. Several files. Try to leave one alive.',
      textEs: 'Estás en el archivo. En varios. Intenta dejar uno vivo.',
    },
  ],
};

/** Boss-specific briefing lines; psycho keeps the original campaign briefing. */
export function bossBriefing(id?: BossId): DialogueLine[] {
  if (!id || id === 'psycho') return BOSS_DIALOGUE;
  return BOSS_BRIEFINGS[id] ?? BOSS_DIALOGUE;
}
