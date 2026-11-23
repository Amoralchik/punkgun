import type { GameState } from './game-state';
import { stepWorld } from './frame-step';

const DEATH_DELAY = 0.7;
const WIN_DELAY = 0.35;

export interface FrameClock {
  acc: number;
  briefT: number;
  overlayT: number;
  overlayShown: boolean;
}

export interface FrameOutcome extends FrameClock {
  edges: boolean;
  briefHidden: boolean;
  rushExpired: boolean;
  overlayReady: boolean;
}

/** Mission/dead/win timing shared by the main frame loop. */
export function advanceFrame(
  world: Parameters<typeof stepWorld>[0] & { time: number },
  dt: number,
  aim: { x: number; y: number },
  state: GameState,
  clock: FrameClock,
  reducedMotion: boolean,
  rushActive: boolean,
): FrameOutcome {
  const rushExpired =
    state === 'playing' && rushActive && world.time >= 90;
  const effective: GameState = rushExpired ? 'dead' : state;
  if (effective !== 'playing' && effective !== 'dead' && effective !== 'win') {
    return {
      ...clock,
      edges: false,
      briefHidden: false,
      rushExpired,
      overlayReady: false,
    };
  }
  const briefing = effective === 'playing' && clock.briefT > 0;
  const briefT = briefing ? Math.max(0, clock.briefT - dt) : clock.briefT;
  let edges = false;
  if (effective === 'playing' || effective === 'dead') {
    const stepped = stepWorld(world, clock.acc, dt, aim, {
      state: effective,
      reducedMotion,
      briefActive: briefing,
    });
    clock.acc = stepped.acc;
    edges = stepped.edges;
  }
  let overlayT = clock.overlayT;
  let overlayShown = clock.overlayShown;
  let overlayReady = false;
  if (effective === 'dead' || effective === 'win') {
    overlayT += dt;
    const delay = effective === 'dead' ? DEATH_DELAY : WIN_DELAY;
    if (!overlayShown && overlayT >= delay) {
      overlayShown = true;
      overlayReady = true;
    }
  }
  return {
    acc: clock.acc,
    briefT,
    overlayT,
    overlayShown,
    edges,
    briefHidden: briefing && briefT === 0,
    rushExpired,
    overlayReady,
  };
}
