import { mulberry32 } from '../core/math';

export type BreachStatus = 'ready' | 'won' | 'lost';
export type BreachAxis = 'row' | 'column';

export interface BreachState {
  grid: string[][];
  target: string[];
  solution: Array<{ row: number; column: number }>;
  buffer: string[];
  used: boolean[][];
  axis: BreachAxis;
  row: number;
  column: number | null;
  progress: number;
  status: BreachStatus;
  timeLeft: number;
}

const TOKENS = ['A1', 'B2', 'C3', 'D4', 'E5', 'F6', '7A', '8B', '9C', '0D', 'FF', '1B', '2C', '3D'];

export const BREACH_SIZE = 4;
export const BREACH_BUFFER = 6;
export const BREACH_TIME = 22;

export function generateBreach(seed: number, targetLength = 3): BreachState {
  const rng = mulberry32(seed);
  const grid = Array.from({ length: BREACH_SIZE }, () =>
    Array.from({ length: BREACH_SIZE }, () => TOKENS[Math.floor(rng() * TOKENS.length)]),
  );
  // Carve a guaranteed solvable path: row → column → row → column...
  let row = 0;
  let column = Math.floor(rng() * BREACH_SIZE);
  const target = [grid[row][column]];
  const solution = [{ row, column }];
  const used = new Set<string>([`${row}:${column}`]);
  for (let i = 1; i < targetLength; i++) {
    let guard = 0;
    do {
      if (i % 2 === 1) row = Math.floor(rng() * BREACH_SIZE);
      else column = Math.floor(rng() * BREACH_SIZE);
      guard++;
    } while (used.has(`${row}:${column}`) && guard < 40);
    used.add(`${row}:${column}`);
    target.push(grid[row][column]);
    solution.push({ row, column });
  }
  return {
    grid,
    target,
    solution,
    buffer: [],
    used: Array.from({ length: BREACH_SIZE }, () => Array(BREACH_SIZE).fill(false)),
    axis: 'row',
    row: 0,
    column: null,
    progress: 0,
    status: 'ready',
    timeLeft: BREACH_TIME,
  };
}

export interface BreachSelection {
  ok: boolean;
  reason?: string;
  won?: boolean;
  lost?: boolean;
}

export function selectBreachCell(
  state: BreachState,
  row: number,
  column: number,
): BreachSelection {
  if (state.status !== 'ready') return { ok: false, reason: 'SESSION CLOSED' };
  if (row < 0 || column < 0 || row >= BREACH_SIZE || column >= BREACH_SIZE) {
    return { ok: false, reason: 'OUT OF GRID' };
  }
  if (state.used[row][column]) return { ok: false, reason: 'NODE SPENT' };
  if (state.column === null) {
    if (row !== 0) return { ok: false, reason: 'START IN ROW 1' };
  } else if (state.axis === 'column') {
    if (column !== state.column) return { ok: false, reason: 'FOLLOW COLUMN' };
  } else if (row !== state.row) {
    return { ok: false, reason: 'FOLLOW ROW' };
  }

  state.used[row][column] = true;
  const token = state.grid[row][column];
  state.buffer.push(token);
  if (token === state.target[state.progress]) {
    state.progress++;
  }
  state.row = row;
  state.column = column;
  state.axis = state.axis === 'row' ? 'column' : 'row';

  if (state.progress >= state.target.length) {
    state.status = 'won';
    return { ok: true, won: true };
  }
  if (state.buffer.length >= BREACH_BUFFER) {
    state.status = 'lost';
    return { ok: true, lost: true };
  }
  return { ok: true };
}

export function tickBreach(state: BreachState, dt: number): void {
  if (state.status !== 'ready') return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft <= 0) state.status = 'lost';
}

export function breachReward(state: BreachState): number {
  return 40 + state.target.length * 15;
}
