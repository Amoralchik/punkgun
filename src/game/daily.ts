import { rollContracts, type Contract } from './missions';

export interface DailyState {
  date: string;
  seed: number;
  cleared: boolean;
  bestRank: string | null;
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dailySeed(dateKey: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createDailyContract(seed: number, cleared = false): Contract {
  const generated = rollContracts(1, seed)[0];
  return {
    ...generated,
    id: `daily-${seed.toString(36)}`,
    title: `DAILY // ${generated.title}`,
    reward: Math.round(generated.reward * 1.35),
    tagline: cleared
      ? 'Today is already in the ledger. The sector has not stopped moving.'
      : 'One seeded contract a day. The same city for everyone running it.',
    daily: true,
  };
}
