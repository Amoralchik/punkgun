import { describe, expect, it } from 'vitest';
import { GameStateMachine, canTransition } from './game-state';

describe('game state machine', () => {
  it('accepts run, pause, breach, death and win transitions', () => {
    const state = new GameStateMachine();
    expect(state.transition('playing')).toBe(true);
    expect(state.transition('paused')).toBe(true);
    expect(state.transition('playing')).toBe(true);
    expect(state.transition('breach')).toBe(true);
    expect(state.transition('playing')).toBe(true);
    expect(state.transition('dead')).toBe(true);
    expect(state.transition('safehouse')).toBe(true);
    expect(state.transition('playing')).toBe(true);
    expect(state.transition('win')).toBe(true);
  });

  it('rejects impossible transitions', () => {
    expect(canTransition('safehouse', 'dead')).toBe(false);
    expect(canTransition('paused', 'breach')).toBe(false);
    expect(canTransition('win', 'paused')).toBe(false);
  });
});
