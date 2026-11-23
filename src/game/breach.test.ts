import { describe, expect, it } from 'vitest';
import {
  generateBreach,
  selectBreachCell,
  tickBreach,
} from './breach';

describe('breach protocol', () => {
  it('generates deterministic solvable grids', () => {
    const a = generateBreach(123);
    const b = generateBreach(123);
    expect(a.grid).toEqual(b.grid);
    expect(a.target).toEqual(b.target);
    expect(a.target).toHaveLength(3);
  });

  it('rejects out-of-turn selections', () => {
    const state = generateBreach(7);
    expect(selectBreachCell(state, 1, 1).ok).toBe(false);
    expect(selectBreachCell(state, 0, 0).ok).toBe(true);
    expect(selectBreachCell(state, 0, 2).ok).toBe(false);
    expect(selectBreachCell(state, 2, 0).ok).toBe(true);
  });

  it('wins on the target sequence and loses on timeout', () => {
    const state = generateBreach(9);
    for (const step of state.solution) {
      expect(selectBreachCell(state, step.row, step.column).ok).toBe(true);
    }
    expect(state.status).toBe('won');

    const timed = generateBreach(9);
    tickBreach(timed, 30);
    expect(timed.status).toBe('lost');
  });
});
