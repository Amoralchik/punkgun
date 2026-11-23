import { t } from '../core/i18n';

export type EndingId = 'burn' | 'broadcast' | 'vanish' | 'remember';

export interface EndingDef {
  id: EndingId;
  title: string;
  kicker: string;
  summary: string;
  body: string[];
  color: string;
}

/** Three final choices, all available once the Spire falls. */
export const ENDINGS: Record<EndingId, EndingDef> = {
  burn: {
    id: 'burn',
    title: 'BURN THE LEDGER',
    kicker: '// ENDING 01 — ASH',
    summary: 'Destroy the PUNKGUN archive and everyone who can rebuild it.',
    color: '#ff7a4c',
    body: [
      'The Spire cores go dark one floor at a time. You feed the archive into the tower grid and let the heat do the rest.',
      'Helix calls it an industrial accident. The city calls it a Tuesday. MOTH calls it a clean erase.',
      'The debt dies with the building. So does the version of you that could have walked away.',
    ],
  },
  broadcast: {
    id: 'broadcast',
    title: 'BROADCAST THE FILE',
    kicker: '// ENDING 02 — SIGNAL',
    summary: 'Push Project PUNKGUN to every screen in Vanta-7.',
    color: '#5ef1ff',
    body: [
      'Every billboard, every elevator panel, every cracked handset in the sprawl shows the same personnel file.',
      'The board resigns before dawn. Helix security stands down in public and keeps working in private. The city has the truth now; the city also has rent due.',
      'MOTH stays in your ear. It sounds lighter. It sounds almost free.',
    ],
  },
  vanish: {
    id: 'vanish',
    title: 'CUT THE LEASH',
    kicker: '// ENDING 03 — GHOST',
    summary: 'Take the proof, leave the tower standing, and disappear.',
    color: '#7dffcf',
    body: [
      'You do not destroy the archive. You copy it, scrub your name, and walk out through the staff exit with a courier bag and a borrowed face.',
      'Helix keeps the Spire. You keep the only leverage that matters. The debt is still real, but it belongs to someone else now.',
      'The rain keeps falling. Somewhere the market opens for the night. You have a gun. That is usually enough.',
    ],
  },
  remember: {
    id: 'remember',
    title: 'SAME GHOST',
    kicker: '// ENDING 04 — COPY',
    summary: 'Accept the copy and let the original stay dead.',
    color: '#b38cff',
    body: [
      'You walk out of the Spire wearing the same face the file says was terminated six years ago.',
      'The Sublevel records a second set of vitals under your name. They are steady. They are not yours.',
      'The city cannot tell the difference. Neither, by morning, can you.',
    ],
  },
};

export const ENDING_ORDER: EndingId[] = ['burn', 'broadcast', 'vanish', 'remember'];

export interface EndingUnlockState {
  story: Record<string, string>;
}

export function endingUnlocked(id: EndingId, state: EndingUnlockState): boolean {
  if (id !== 'remember') return true;
  return state.story['faction:sublevel'] === 'sublevel-remember';
}

export function availableEndings(state: EndingUnlockState): EndingId[] {
  return ENDING_ORDER.filter((id) => endingUnlocked(id, state));
}

export function endingFor(id: string | null | undefined): EndingDef | null {
  if (!id) return null;
  return ENDINGS[id as EndingId] ?? null;
}

export interface EpilogueProfile {
  reputation: Record<string, number>;
  role: string | null;
  lifepath: string | null;
}

/** Extra epilogue lines from the highest faction, role and lifepath. */
export function epilogueConsequences(profile: EpilogueProfile): string[] {
  const lines: string[] = [];
  const faction = (['helix', 'teeth', 'orbit', 'sublevel', 'market'] as const)
    .filter((id) => (profile.reputation[id] ?? 0) >= 5)
    .sort((a, b) => (profile.reputation[b] ?? 0) - (profile.reputation[a] ?? 0))[0];
  if (faction) lines.push(t(`epilogue.faction.${faction}` as never));
  if (profile.role) lines.push(t(`epilogue.role.${profile.role}` as never));
  if (profile.lifepath) lines.push(t(`epilogue.path.${profile.lifepath}` as never));
  return lines;
}
