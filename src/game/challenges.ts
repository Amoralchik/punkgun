export type ChallengeId = 'standard' | 'fists' | 'glass' | 'rush';

export interface ChallengeDef {
  id: ChallengeId;
  name: string;
  desc: string;
  payBonus: number;
  color: string;
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'standard',
    name: 'STANDARD',
    desc: 'Bring your loadout and armor. No extra rules.',
    payBonus: 0,
    color: '#8a97a8',
  },
  {
    id: 'fists',
    name: 'FISTS ONLY',
    desc: 'Start with empty hands. Your stored weapon is not consumed.',
    payBonus: 0.35,
    color: '#ff7a4c',
  },
  {
    id: 'glass',
    name: 'GLASS',
    desc: 'No armor plates and no Second Heart. One clean hit ends the run.',
    payBonus: 0.4,
    color: '#ff2f8e',
  },
  {
    id: 'rush',
    name: 'RUSH',
    desc: 'A 90-second contract clock. Time out and the run fails.',
    payBonus: 0.3,
    color: '#ffc46b',
  },
];

export const CHALLENGE_MAP: Record<ChallengeId, ChallengeDef> = Object.fromEntries(
  CHALLENGES.map((challenge) => [challenge.id, challenge]),
) as Record<ChallengeId, ChallengeDef>;

export function challengePayBonus(id: ChallengeId | undefined): number {
  return id ? CHALLENGE_MAP[id]?.payBonus ?? 0 : 0;
}
