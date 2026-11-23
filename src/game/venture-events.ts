import { mulberry32 } from '../core/math';
import type { FactionId } from './lore';
import type { VentureId, VentureRanks } from './ventures';

export type VentureEffect =
  | { kind: 'money'; amount: number }
  | { kind: 'rank'; delta: number }
  | { kind: 'rep'; faction: FactionId; amount: number }
  | { kind: 'components'; count: number };

export interface VentureChoice {
  id: string;
  label: string;
  labelEs: string;
  cost?: number;
  effects: VentureEffect[];
  reply: string;
  replyEs: string;
}

export interface VentureEventDef {
  id: string;
  venture: VentureId;
  minRank: number;
  title: string;
  titleEs: string;
  text: string;
  textEs: string;
  choices: VentureChoice[];
}

export const VENTURE_EVENTS: VentureEventDef[] = [
  {
    id: 'noodle-inspection',
    venture: 'noodle',
    minRank: 1,
    title: 'HEALTH INSPECTOR',
    titleEs: 'INSPECTOR SANITARIO',
    text: 'A Helix inspector with a clipboard and a hungry look is asking about the walk-in freezer.',
    textEs: 'Un inspector de Helix con portapapeles y cara de hambre pregunta por el congelador.',
    choices: [
      {
        id: 'pay',
        label: 'PAY THE FINE · $120',
        labelEs: 'PAGA LA MULTA · $120',
        cost: 120,
        effects: [{ kind: 'rep', faction: 'helix', amount: 1 }],
        reply: 'The paperwork clears. The noodles stay warm.',
        replyEs: 'El papeleo se aclara. Los fideos siguen calientes.',
      },
      {
        id: 'refuse',
        label: 'REFUSE THE SHAKEDOWN',
        labelEs: 'RECHAZA LA EXTORSIÓN',
        effects: [
          { kind: 'rank', delta: -1 },
          { kind: 'rep', faction: 'market', amount: 1 },
        ],
        reply: 'The inspector writes you up. The block remembers you did not fold.',
        replyEs: 'El inspector te multa. El bloque recuerda que no cediste.',
      },
      {
        id: 'sell',
        label: 'SELL THE COUNTER',
        labelEs: 'VENDE LA BARRA',
        effects: [
          { kind: 'money', amount: 260 },
          { kind: 'rank', delta: -3 },
        ],
        reply: 'A chain buys the lease before sunrise. The broth goes with it.',
        replyEs: 'Una cadena compra el contrato antes del amanecer. El caldo se va con él.',
      },
    ],
  },
  {
    id: 'noodle-delivery',
    venture: 'noodle',
    minRank: 2,
    title: 'COLD DELIVERY',
    titleEs: 'ENTREGA FRÍA',
    text: 'A courier drops a crate of unmarked protein behind the counter and leaves without a receipt.',
    textEs: 'Un mensajero deja una caja de proteína sin marcar detrás del mostrador y se va sin recibo.',
    choices: [
      {
        id: 'take',
        label: 'TAKE THE DELIVERY',
        labelEs: 'ACEPTA LA ENTREGA',
        effects: [
          { kind: 'money', amount: 180 },
          { kind: 'rep', faction: 'orbit', amount: 1 },
        ],
        reply: 'The crate sells fast. Low Orbit marks you as reliable.',
        replyEs: 'La caja se vende rápido. Low Orbit te marca como fiable.',
      },
      {
        id: 'trace',
        label: 'TRACE THE SOURCE',
        labelEs: 'RASTREA EL ORIGEN',
        effects: [
          { kind: 'components', count: 2 },
          { kind: 'rep', faction: 'helix', amount: 1 },
        ],
        reply: 'The serial numbers are Helix hardware. The inspector is grateful.',
        replyEs: 'Los números de serie son hardware de Helix. El inspector lo agradece.',
      },
    ],
  },
  {
    id: 'clinic-burnout',
    venture: 'clinic',
    minRank: 1,
    title: 'RIPPERDOC BURNOUT',
    titleEs: 'RIPPERDOC AGOTADO',
    text: 'Your clinic doctor has not slept in three days and is holding a scalpel like a cigarette.',
    textEs: 'Tu doctor de la clínica no ha dormido en tres días y sostiene un bisturí como un cigarro.',
    choices: [
      {
        id: 'pay',
        label: 'PAY FOR A RELIEF SHIFT · $160',
        labelEs: 'PAGA UN TURNO DE ALIVIO · $160',
        cost: 160,
        effects: [{ kind: 'rep', faction: 'teeth', amount: 1 }],
        reply: 'A freelancer takes the chair. The Teeth send their thanks.',
        replyEs: 'Un freelance ocupa el sillón. Los Dientes envían su agradecimiento.',
      },
      {
        id: 'cut',
        label: 'CUT COSTS',
        labelEs: 'RECORTA COSTES',
        effects: [
          { kind: 'money', amount: 200 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The clinic stays open with cheaper hands and worse stitches.',
        replyEs: 'La clínica sigue abierta con manos más baratas y peores puntadas.',
      },
    ],
  },
  {
    id: 'clinic-patient',
    venture: 'clinic',
    minRank: 2,
    title: 'UNREGISTERED PATIENT',
    titleEs: 'PACIENTE SIN REGISTRO',
    text: 'A patient with no name and a Sublevel wristband is bleeding on your clean floor.',
    textEs: 'Un paciente sin nombre y con pulsera del Subnivel sangra en tu suelo limpio.',
    choices: [
      {
        id: 'save',
        label: 'SAVE THE PATIENT',
        labelEs: 'SALVA AL PACIENTE',
        effects: [
          { kind: 'rep', faction: 'sublevel', amount: 1 },
          { kind: 'components', count: 1 },
        ],
        reply: 'The patient survives. The wristband yields a useful component.',
        replyEs: 'El paciente sobrevive. La pulsera entrega un componente útil.',
      },
      {
        id: 'sell',
        label: 'SELL THE PATIENT',
        labelEs: 'VENDE AL PACIENTE',
        effects: [
          { kind: 'money', amount: 340 },
          { kind: 'rep', faction: 'helix', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'Helix collects its property. The clinic ledger gets heavier.',
        replyEs: 'Helix recupera su propiedad. El libro de la clínica pesa más.',
      },
    ],
  },
  {
    id: 'bar-brawl',
    venture: 'bar',
    minRank: 1,
    title: 'FLOOR FIGHT',
    titleEs: 'PELEA EN LA PISTA',
    text: 'Two Teeth are breaking the bar apart over a tab neither of them can pay.',
    textEs: 'Dos Dientes destrozan el bar por una cuenta que ninguno puede pagar.',
    choices: [
      {
        id: 'settle',
        label: 'SETTLE THE TAB · $100',
        labelEs: 'PAGA LA CUENTA · $100',
        cost: 100,
        effects: [{ kind: 'rep', faction: 'teeth', amount: 1 }],
        reply: 'The Teeth leave with their teeth. The bar stays standing.',
        replyEs: 'Los Dientes se van con sus dientes. El bar sigue en pie.',
      },
      {
        id: 'ride',
        label: 'LET IT RIDE',
        labelEs: 'DEJA QUE SIGA',
        effects: [
          { kind: 'money', amount: 180 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The fight draws a crowd. The damage costs more than the tab.',
        replyEs: 'La pelea atrae público. Los daños cuestan más que la cuenta.',
      },
    ],
  },
  {
    id: 'bar-tap',
    venture: 'bar',
    minRank: 2,
    title: 'TAPPED TILL',
    titleEs: 'CAJA INTERVENIDA',
    text: 'The back-room till is short and the only witness is a kid who knows how to keep quiet.',
    textEs: 'La caja de la trastienda está corta y el único testigo es un crío que sabe callar.',
    choices: [
      {
        id: 'cover',
        label: 'COVER THE SHORTFALL · $150',
        labelEs: 'CUBRE EL FALTANTE · $150',
        cost: 150,
        effects: [{ kind: 'rep', faction: 'market', amount: 1 }],
        reply: 'The kid keeps quiet. The market hears you can be trusted.',
        replyEs: 'El crío calla. El mercado oye que se puede confiar en ti.',
      },
      {
        id: 'skim',
        label: 'SKIM THE DIFFERENCE',
        labelEs: 'DESVÍA LA DIFERENCIA',
        effects: [
          { kind: 'money', amount: 260 },
          { kind: 'rep', faction: 'helix', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The till balances on paper. Helix gets a useful name.',
        replyEs: 'La caja cuadra en papel. Helix gana un nombre útil.',
      },
    ],
  },
  {
    id: 'haven-audit',
    venture: 'haven',
    minRank: 1,
    title: 'DATA AUDIT',
    titleEs: 'AUDITORÍA DE DATOS',
    text: 'A Helix auditor wants to inspect the racks. The racks contain things that are not yours.',
    textEs: 'Un auditor de Helix quiere inspeccionar los racks. Los racks contienen cosas que no son tuyas.',
    choices: [
      {
        id: 'bribe',
        label: 'BRIBE THE AUDITOR · $200',
        labelEs: 'SOBORNA AL AUDITOR · $200',
        cost: 200,
        effects: [{ kind: 'rep', faction: 'helix', amount: 1 }],
        reply: 'The audit closes early. The racks keep their secrets.',
        replyEs: 'La auditoría cierra pronto. Los racks guardan sus secretos.',
      },
      {
        id: 'leak',
        label: 'LEAK THE AUDIT',
        labelEs: 'FILTRA LA AUDITORÍA',
        effects: [
          { kind: 'money', amount: 320 },
          { kind: 'rep', faction: 'sublevel', amount: 1 },
          { kind: 'rep', faction: 'helix', amount: -1 },
        ],
        reply: 'The data hits the market. Helix loses face; the Sublevel notices.',
        replyEs: 'Los datos llegan al mercado. Helix pierde cara; el Subnivel se da cuenta.',
      },
    ],
  },
  {
    id: 'haven-buyer',
    venture: 'haven',
    minRank: 2,
    title: 'BLACK ICE BUYER',
    titleEs: 'COMPRADOR DE HIELO NEGRO',
    text: 'A buyer wants a dead netrunner\'s deck. The deck is still warm and still asking questions.',
    textEs: 'Un comprador quiere el mazo de un netrunner muerto. El mazo sigue caliente y sigue haciendo preguntas.',
    choices: [
      {
        id: 'vet',
        label: 'VET THE BUYER',
        labelEs: 'INVESTIGA AL COMPRADOR',
        effects: [
          { kind: 'rep', faction: 'market', amount: 1 },
          { kind: 'components', count: 1 },
        ],
        reply: 'The buyer checks out. The deck gives up a clean component.',
        replyEs: 'El comprador pasa la revisión. El mazo suelta un componente limpio.',
      },
      {
        id: 'sell',
        label: 'SELL THE DECK',
        labelEs: 'VENDE EL MAZO',
        effects: [
          { kind: 'money', amount: 380 },
          { kind: 'rep', faction: 'sublevel', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The deck leaves the racks. So does a little of the haven\'s reputation.',
        replyEs: 'El mazo sale de los racks. También un poco de la reputación del refugio.',
      },
    ],
  },
  {
    id: 'chop-body',
    venture: 'chop',
    minRank: 1,
    title: 'FRESH BODY',
    titleEs: 'CUERPO FRESCO',
    text: 'A Sublevel van leaves a wrapped body at the chop-shop door with no paperwork.',
    textEs: 'Una furgoneta del Subnivel deja un cuerpo envuelto en la puerta del desguace sin papeleo.',
    choices: [
      {
        id: 'return',
        label: 'RETURN THE BODY',
        labelEs: 'DEVUELVE EL CUERPO',
        effects: [{ kind: 'rep', faction: 'sublevel', amount: 1 }],
        reply: 'The van comes back. Nobody thanks you, but nobody forgets.',
        replyEs: 'La furgoneta vuelve. Nadie te da las gracias, pero nadie lo olvida.',
      },
      {
        id: 'strip',
        label: 'STRIP IT FOR PARTS',
        labelEs: 'DESMÓNTALO PARA PIEZAS',
        effects: [
          { kind: 'money', amount: 240 },
          { kind: 'components', count: 2 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The parts sell. The shop smells wrong for a week.',
        replyEs: 'Las piezas se venden. El taller huele mal una semana.',
      },
    ],
  },
  {
    id: 'chop-contract',
    venture: 'chop',
    minRank: 2,
    title: 'ORGAN CONTRACT',
    titleEs: 'CONTRATO DE ÓRGANO',
    text: 'A Low Orbit manifest lists a heart that is already beating in a container.',
    textEs: 'Un manifiesto de Low Orbit lista un corazón que ya late dentro de un contenedor.',
    choices: [
      {
        id: 'honor',
        label: 'HONOR THE MANIFEST · $180',
        labelEs: 'RESPETA EL MANIFIESTO · $180',
        cost: 180,
        effects: [{ kind: 'rep', faction: 'orbit', amount: 1 }],
        reply: 'The container ships cold and on time. Low Orbit pays the fee.',
        replyEs: 'El contenedor sale frío y a tiempo. Low Orbit paga la tarifa.',
      },
      {
        id: 'undercut',
        label: 'UNDERCUT THE BUYER',
        labelEs: 'BAJA EL PRECIO AL COMPRADOR',
        effects: [
          { kind: 'money', amount: 300 },
          { kind: 'rep', faction: 'teeth', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The Teeth pay cash. Low Orbit marks the loss.',
        replyEs: 'Los Dientes pagan en efectivo. Low Orbit marca la pérdida.',
      },
    ],
  },
  {
    id: 'courier-hijack',
    venture: 'courier',
    minRank: 1,
    title: 'HIJACKED ROUTE',
    titleEs: 'RUTA SECUESTRADA',
    text: 'One of your couriers is late, and the package is pinging from a warehouse it should not be in.',
    textEs: 'Uno de tus mensajeros llega tarde y el paquete emite desde un almacén donde no debería estar.',
    choices: [
      {
        id: 'reroute',
        label: 'REROUTE THE PACKAGE',
        labelEs: 'REDIRIGE EL PAQUETE',
        effects: [{ kind: 'rep', faction: 'orbit', amount: 1 }],
        reply: 'The package arrives. The route stays yours.',
        replyEs: 'El paquete llega. La ruta sigue siendo tuya.',
      },
      {
        id: 'fence',
        label: 'FENCE THE PACKAGE',
        labelEs: 'VENDE EL PAQUETE',
        effects: [
          { kind: 'money', amount: 220 },
          { kind: 'rep', faction: 'market', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The buyer pays cash. The courier network loses a little trust.',
        replyEs: 'El comprador paga en efectivo. La red de mensajeros pierde algo de confianza.',
      },
    ],
  },
  {
    id: 'courier-raid',
    venture: 'courier',
    minRank: 2,
    title: 'DEPOT RAID',
    titleEs: 'ASALTO AL DEPÓSITO',
    text: 'A crew is prying at the depot shutters. The night dispatcher is asking whether to call it in.',
    textEs: 'Una cuadrilla forcejea con las persianas del depósito. El despachador nocturno pregunta si llamar.',
    choices: [
      {
        id: 'defend',
        label: 'DEFEND THE DEPOT · $200',
        labelEs: 'DEFIENDE EL DEPÓSITO · $200',
        cost: 200,
        effects: [
          { kind: 'rep', faction: 'orbit', amount: 1 },
          { kind: 'components', count: 1 },
        ],
        reply: 'The crew leaves empty-handed. The dispatcher owes you.',
        replyEs: 'La cuadrilla se va con las manos vacías. El despachador te debe una.',
      },
      {
        id: 'abandon',
        label: 'ABANDON THE DEPOT',
        labelEs: 'ABANDONA EL DEPÓSITO',
        effects: [
          { kind: 'money', amount: 360 },
          { kind: 'rep', faction: 'teeth', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The crew strips the depot. The Teeth pay for the tip.',
        replyEs: 'La cuadrilla desvalija el depósito. Los Dientes pagan por el chivatazo.',
      },
    ],
  },
];

export const VENTURE_EVENT_MAP: Record<string, VentureEventDef> = Object.fromEntries(
  VENTURE_EVENTS.map((event) => [event.id, event]),
);

export function rollVentureEvent(
  runs: number,
  seed: number,
  ranks: VentureRanks,
): VentureEventDef | null {
  const eligible = VENTURE_EVENTS.filter(
    (event) => (ranks[event.venture] ?? 0) >= event.minRank,
  );
  if (eligible.length === 0) return null;
  const rng = mulberry32((runs * 2654435761 + seed) >>> 0);
  if (rng() >= 0.35) return null;
  return eligible[Math.floor(rng() * eligible.length)] ?? null;
}
