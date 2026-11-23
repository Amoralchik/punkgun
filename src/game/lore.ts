import type { LayoutId } from './map';
import type { EndingId } from './endings';
import type { AttributeId, Attributes } from './attributes';
import type { RunBoon } from './boons';
import type { Contract } from './missions';
import type { Reputation } from './reputation';

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
  },
];

export interface StoryProgress {
  clears: number;
  level: number;
  bossCleared: boolean;
  finalCleared: boolean;
  ending?: EndingId | null;
  story?: Record<string, string>;
}

export function dossierUnlocked(dossier: Dossier, p: StoryProgress): boolean {
  const u = dossier.unlock;
  if (u.final && !p.finalCleared) return false;
  if (u.boss && !p.bossCleared) return false;
  if (u.ending && p.ending !== u.ending) return false;
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

export function handlerLine(faction: FactionId, seed = 0): string {
  const lines = MOTH_LINES[faction] ?? MOTH_LINES.market;
  return lines[Math.abs(seed) % lines.length];
}


export type SpeakerId = 'MOTH' | 'KESTREL' | 'GRIN' | 'CUTTER' | 'VESPER';

export type DialogueCheck =
  | { kind: 'attribute'; attribute: AttributeId; value: number }
  | { kind: 'reputation'; faction: FactionId; value: number };

export interface DialogueChoice {
  id: string;
  label: string;
  check?: DialogueCheck;
  boon?: RunBoon;
  /** Reputation deltas applied immediately when chosen. */
  reputation?: Partial<Record<FactionId, number>>;
  reply?: string;
}

export interface DialogueLine {
  speaker: SpeakerId;
  text: string;
  choices?: DialogueChoice[];
}

export function dialogueCheckLabel(check: DialogueCheck): string {
  if (check.kind === 'attribute') {
    return `${check.attribute.toUpperCase()} ${check.value}`;
  }
  return `${FACTIONS[check.faction].name} ${check.value} REP`;
}

export function dialogueCheckMet(
  check: DialogueCheck | undefined,
  attributes: Attributes,
  reputation: Reputation,
): boolean {
  if (!check) return true;
  if (check.kind === 'attribute') return attributes[check.attribute] >= check.value;
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

export function authoredDialogue(
  contract: Contract,
  story: Record<string, string> = {},
): DialogueLine[] {
  const storyline = FACTION_STORYLINES[contract.faction] ?? FACTION_STORYLINES.market;
  const chapterIndex =
    typeof contract.chapter === 'number' ? Math.min(2, Math.max(0, contract.chapter - 1)) : 0;
  const beat = storyline.beats[chapterIndex] ?? storyline.beats[0];
  const priorChoice = story[`faction:${contract.faction}`];
  const attribute: AttributeId =
    contract.faction === 'teeth'
      ? 'body'
      : contract.faction === 'orbit'
        ? 'cool'
        : contract.faction === 'market'
          ? 'tech'
          : 'tech';
  return [
    {
      speaker: storyline.contact,
      text: beat,
    },
    {
      speaker: 'MOTH',
      text: `${contract.tagline} The payout is real. The method is yours.`,
    },
    {
      speaker: 'MOTH',
      text: 'Pick the angle. I will keep the channel open.',
      choices: [
        {
          id: 'attribute',
          label: `Use the ${attribute} route`,
          check: { kind: 'attribute', attribute, value: 4 },
          boon: 'quiet',
          reputation: { [contract.faction]: 1 },
          reply: 'Clean access. The sector will be quieter than it has any right to be.',
        },
        {
          id: 'faction',
          label: 'Call in the faction favor',
          check: { kind: 'reputation', faction: contract.faction, value: 5 },
          boon: 'pay',
          reputation: { [contract.faction]: 1 },
          reply: 'The fixer moves a number. Your cut grows before you step out the door.',
        },
        {
          id: 'armor',
          label: 'Bring the heavy plates',
          boon: 'armor',
          reply: 'Two plates, no questions. Walk it off if you can.',
        },
        {
          id: 'components',
          label: 'Claim the salvage upfront',
          boon: 'components',
          reputation: { market: 1 },
          reply: 'Three components are already in the bag. Do not lose the bag.',
        },
        ...(priorChoice
          ? [
              {
                id: 'leverage',
                label: `Call in the ${contract.faction} marker`,
                boon: 'pay' as const,
                reputation: { [contract.faction]: 1 },
                reply: 'The marker clears. The faction remembers that you used it.',
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
  },
  {
    speaker: 'KESTREL',
    text: 'You said this was a containment job. Clean room, cold floor, no witnesses.',
  },
  {
    speaker: 'MOTH',
    text: 'It was. Before Helix put Subject 06 in the arena and taught it to hunt. It was PUNKGUN before you. The same chassis. A different ghost.',
  },
  {
    speaker: 'KESTREL',
    text: 'And the board still signs off on it.',
  },
  {
    speaker: 'MOTH',
    text: 'The board signs off on everything. That is why the Sublevel matters. Break it, and the tower has to look at what it buried. Break it, and the next contract can go upstairs.',
  },
  {
    speaker: 'KESTREL',
    text: 'No extraction. No leash.',
  },
  {
    speaker: 'MOTH',
    text: 'No leash. Bring the plates down and come back up. I will keep the lights on.',
  },
];
