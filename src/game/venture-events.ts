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
  cost?: number;
  effects: VentureEffect[];
  reply: string;
}

export interface VentureEventDef {
  id: string;
  venture: VentureId;
  minRank: number;
  title: string;
  text: string;
  choices: VentureChoice[];
}

export const VENTURE_EVENTS: VentureEventDef[] = [
  {
    id: 'noodle-inspection',
    venture: 'noodle',
    minRank: 1,
    title: 'HEALTH INSPECTOR',
    text: 'A Helix inspector with a clipboard and a hungry look is asking about the walk-in freezer.',
    choices: [
      {
        id: 'pay',
        label: 'PAY THE FINE · $120',
        cost: 120,
        effects: [{ kind: 'rep', faction: 'helix', amount: 1 }],
        reply: 'The paperwork clears. The noodles stay warm.',
      },
      {
        id: 'refuse',
        label: 'REFUSE THE SHAKEDOWN',
        effects: [
          { kind: 'rank', delta: -1 },
          { kind: 'rep', faction: 'market', amount: 1 },
        ],
        reply: 'The inspector writes you up. The block remembers you did not fold.',
      },
      {
        id: 'sell',
        label: 'SELL THE COUNTER',
        effects: [
          { kind: 'money', amount: 260 },
          { kind: 'rank', delta: -3 },
        ],
        reply: 'A chain buys the lease before sunrise. The broth goes with it.',
      },
    ],
  },
  {
    id: 'noodle-delivery',
    venture: 'noodle',
    minRank: 2,
    title: 'COLD DELIVERY',
    text: 'A courier drops a crate of unmarked protein behind the counter and leaves without a receipt.',
    choices: [
      {
        id: 'take',
        label: 'TAKE THE DELIVERY',
        effects: [
          { kind: 'money', amount: 180 },
          { kind: 'rep', faction: 'orbit', amount: 1 },
        ],
        reply: 'The crate sells fast. Low Orbit marks you as reliable.',
      },
      {
        id: 'trace',
        label: 'TRACE THE SOURCE',
        effects: [
          { kind: 'components', count: 2 },
          { kind: 'rep', faction: 'helix', amount: 1 },
        ],
        reply: 'The serial numbers are Helix hardware. The inspector is grateful.',
      },
    ],
  },
  {
    id: 'clinic-burnout',
    venture: 'clinic',
    minRank: 1,
    title: 'RIPPERDOC BURNOUT',
    text: 'Your clinic doctor has not slept in three days and is holding a scalpel like a cigarette.',
    choices: [
      {
        id: 'pay',
        label: 'PAY FOR A RELIEF SHIFT · $160',
        cost: 160,
        effects: [{ kind: 'rep', faction: 'teeth', amount: 1 }],
        reply: 'A freelancer takes the chair. The Teeth send their thanks.',
      },
      {
        id: 'cut',
        label: 'CUT COSTS',
        effects: [
          { kind: 'money', amount: 200 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The clinic stays open with cheaper hands and worse stitches.',
      },
    ],
  },
  {
    id: 'clinic-patient',
    venture: 'clinic',
    minRank: 2,
    title: 'UNREGISTERED PATIENT',
    text: 'A patient with no name and a Sublevel wristband is bleeding on your clean floor.',
    choices: [
      {
        id: 'save',
        label: 'SAVE THE PATIENT',
        effects: [
          { kind: 'rep', faction: 'sublevel', amount: 1 },
          { kind: 'components', count: 1 },
        ],
        reply: 'The patient survives. The wristband yields a useful component.',
      },
      {
        id: 'sell',
        label: 'SELL THE PATIENT',
        effects: [
          { kind: 'money', amount: 340 },
          { kind: 'rep', faction: 'helix', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'Helix collects its property. The clinic ledger gets heavier.',
      },
    ],
  },
  {
    id: 'bar-brawl',
    venture: 'bar',
    minRank: 1,
    title: 'FLOOR FIGHT',
    text: 'Two Teeth are breaking the bar apart over a tab neither of them can pay.',
    choices: [
      {
        id: 'settle',
        label: 'SETTLE THE TAB · $100',
        cost: 100,
        effects: [{ kind: 'rep', faction: 'teeth', amount: 1 }],
        reply: 'The Teeth leave with their teeth. The bar stays standing.',
      },
      {
        id: 'ride',
        label: 'LET IT RIDE',
        effects: [
          { kind: 'money', amount: 180 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The fight draws a crowd. The damage costs more than the tab.',
      },
    ],
  },
  {
    id: 'bar-tap',
    venture: 'bar',
    minRank: 2,
    title: 'TAPPED TILL',
    text: 'The back-room till is short and the only witness is a kid who knows how to keep quiet.',
    choices: [
      {
        id: 'cover',
        label: 'COVER THE SHORTFALL · $150',
        cost: 150,
        effects: [{ kind: 'rep', faction: 'market', amount: 1 }],
        reply: 'The kid keeps quiet. The market hears you can be trusted.',
      },
      {
        id: 'skim',
        label: 'SKIM THE DIFFERENCE',
        effects: [
          { kind: 'money', amount: 260 },
          { kind: 'rep', faction: 'helix', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The till balances on paper. Helix gets a useful name.',
      },
    ],
  },
  {
    id: 'haven-audit',
    venture: 'haven',
    minRank: 1,
    title: 'DATA AUDIT',
    text: 'A Helix auditor wants to inspect the racks. The racks contain things that are not yours.',
    choices: [
      {
        id: 'bribe',
        label: 'BRIBE THE AUDITOR · $200',
        cost: 200,
        effects: [{ kind: 'rep', faction: 'helix', amount: 1 }],
        reply: 'The audit closes early. The racks keep their secrets.',
      },
      {
        id: 'leak',
        label: 'LEAK THE AUDIT',
        effects: [
          { kind: 'money', amount: 320 },
          { kind: 'rep', faction: 'sublevel', amount: 1 },
          { kind: 'rep', faction: 'helix', amount: -1 },
        ],
        reply: 'The data hits the market. Helix loses face; the Sublevel notices.',
      },
    ],
  },
  {
    id: 'haven-buyer',
    venture: 'haven',
    minRank: 2,
    title: 'BLACK ICE BUYER',
    text: 'A buyer wants a dead netrunner\'s deck. The deck is still warm and still asking questions.',
    choices: [
      {
        id: 'vet',
        label: 'VET THE BUYER',
        effects: [
          { kind: 'rep', faction: 'market', amount: 1 },
          { kind: 'components', count: 1 },
        ],
        reply: 'The buyer checks out. The deck gives up a clean component.',
      },
      {
        id: 'sell',
        label: 'SELL THE DECK',
        effects: [
          { kind: 'money', amount: 380 },
          { kind: 'rep', faction: 'sublevel', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The deck leaves the racks. So does a little of the haven\'s reputation.',
      },
    ],
  },
  {
    id: 'chop-body',
    venture: 'chop',
    minRank: 1,
    title: 'FRESH BODY',
    text: 'A Sublevel van leaves a wrapped body at the chop-shop door with no paperwork.',
    choices: [
      {
        id: 'return',
        label: 'RETURN THE BODY',
        effects: [{ kind: 'rep', faction: 'sublevel', amount: 1 }],
        reply: 'The van comes back. Nobody thanks you, but nobody forgets.',
      },
      {
        id: 'strip',
        label: 'STRIP IT FOR PARTS',
        effects: [
          { kind: 'money', amount: 240 },
          { kind: 'components', count: 2 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The parts sell. The shop smells wrong for a week.',
      },
    ],
  },
  {
    id: 'chop-contract',
    venture: 'chop',
    minRank: 2,
    title: 'ORGAN CONTRACT',
    text: 'A Low Orbit manifest lists a heart that is already beating in a container.',
    choices: [
      {
        id: 'honor',
        label: 'HONOR THE MANIFEST · $180',
        cost: 180,
        effects: [{ kind: 'rep', faction: 'orbit', amount: 1 }],
        reply: 'The container ships cold and on time. Low Orbit pays the fee.',
      },
      {
        id: 'undercut',
        label: 'UNDERCUT THE BUYER',
        effects: [
          { kind: 'money', amount: 300 },
          { kind: 'rep', faction: 'teeth', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The Teeth pay cash. Low Orbit marks the loss.',
      },
    ],
  },
  {
    id: 'courier-hijack',
    venture: 'courier',
    minRank: 1,
    title: 'HIJACKED ROUTE',
    text: 'One of your couriers is late, and the package is pinging from a warehouse it should not be in.',
    choices: [
      {
        id: 'reroute',
        label: 'REROUTE THE PACKAGE',
        effects: [{ kind: 'rep', faction: 'orbit', amount: 1 }],
        reply: 'The package arrives. The route stays yours.',
      },
      {
        id: 'fence',
        label: 'FENCE THE PACKAGE',
        effects: [
          { kind: 'money', amount: 220 },
          { kind: 'rep', faction: 'market', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The buyer pays cash. The courier network loses a little trust.',
      },
    ],
  },
  {
    id: 'courier-raid',
    venture: 'courier',
    minRank: 2,
    title: 'DEPOT RAID',
    text: 'A crew is prying at the depot shutters. The night dispatcher is asking whether to call it in.',
    choices: [
      {
        id: 'defend',
        label: 'DEFEND THE DEPOT · $200',
        cost: 200,
        effects: [
          { kind: 'rep', faction: 'orbit', amount: 1 },
          { kind: 'components', count: 1 },
        ],
        reply: 'The crew leaves empty-handed. The dispatcher owes you.',
      },
      {
        id: 'abandon',
        label: 'ABANDON THE DEPOT',
        effects: [
          { kind: 'money', amount: 360 },
          { kind: 'rep', faction: 'teeth', amount: 1 },
          { kind: 'rank', delta: -1 },
        ],
        reply: 'The crew strips the depot. The Teeth pay for the tip.',
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
