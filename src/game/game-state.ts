export type GameState = 'safehouse' | 'playing' | 'paused' | 'breach' | 'dead' | 'win';

const TRANSITIONS: Record<GameState, GameState[]> = {
  safehouse: ['playing', 'safehouse'],
  playing: ['playing', 'paused', 'breach', 'dead', 'win', 'safehouse'],
  paused: ['paused', 'playing', 'safehouse'],
  breach: ['breach', 'playing', 'safehouse'],
  dead: ['dead', 'safehouse', 'playing'],
  win: ['win', 'safehouse'],
};

export function canTransition(from: GameState, to: GameState): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Validated top-level phase. */
export class GameStateMachine {
  private current: GameState = 'safehouse';

  get state(): GameState {
    return this.current;
  }

  transition(to: GameState): boolean {
    if (!canTransition(this.current, to)) return false;
    this.current = to;
    return true;
  }
}
