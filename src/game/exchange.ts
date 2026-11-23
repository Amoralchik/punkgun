import { mulberry32 } from '../core/math';

export type TickerId = 'helix' | 'teeth' | 'orbit' | 'sublevel' | 'market';

export interface TickerDef {
  id: TickerId;
  name: string;
  code: string;
  base: number;
  volatility: number;
  dividend: number;
  color: string;
}

export interface ExchangeState {
  seed: number;
  day: number;
  holdings: Record<TickerId, number>;
}

export const TICKERS: TickerDef[] = [
  {
    id: 'helix',
    name: 'HELIX DYNAMICS',
    code: 'HLX',
    base: 120,
    volatility: 0.08,
    dividend: 3,
    color: '#5ef1ff',
  },
  {
    id: 'teeth',
    name: 'CHROME TEETH',
    code: 'TTH',
    base: 65,
    volatility: 0.14,
    dividend: 2,
    color: '#ff2f8e',
  },
  {
    id: 'orbit',
    name: 'LOW ORBIT',
    code: 'ORB',
    base: 90,
    volatility: 0.1,
    dividend: 2,
    color: '#ffc46b',
  },
  {
    id: 'sublevel',
    name: 'SUBLEVEL',
    code: 'SUB',
    base: 45,
    volatility: 0.2,
    dividend: 1,
    color: '#b38cff',
  },
  {
    id: 'market',
    name: 'NIGHT MARKET',
    code: 'MKT',
    base: 75,
    volatility: 0.12,
    dividend: 2,
    color: '#7dffcf',
  },
];

export const TICKER_MAP: Record<TickerId, TickerDef> = Object.fromEntries(
  TICKERS.map((ticker) => [ticker.id, ticker]),
) as Record<TickerId, TickerDef>;

export const EMPTY_EXCHANGE: ExchangeState = {
  seed: 0,
  day: 0,
  holdings: { helix: 0, teeth: 0, orbit: 0, sublevel: 0, market: 0 },
};

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function priceOnDay(def: TickerDef, seed: number, day: number): number {
  if (seed === 0) return def.base;
  const rng = mulberry32((seed ^ hashString(def.id)) >>> 0);
  let price = def.base;
  const steps = Math.min(180, Math.max(0, day));
  for (let i = 0; i < steps; i++) {
    const shock = (rng() * 2 - 1) * def.volatility * 0.35;
    price = Math.max(4, price * (1 + shock));
  }
  return Math.max(4, Math.round(price));
}

export function tickerPrice(def: TickerDef, state: ExchangeState): number {
  return priceOnDay(def, state.seed, state.day);
}

export function priceHistory(def: TickerDef, state: ExchangeState, days = 8): number[] {
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(priceOnDay(def, state.seed, Math.max(0, state.day - i)));
  }
  return out;
}

export function exchangeDividend(state: ExchangeState): number {
  return TICKERS.reduce(
    (sum, ticker) => sum + (state.holdings[ticker.id] ?? 0) * ticker.dividend,
    0,
  );
}
