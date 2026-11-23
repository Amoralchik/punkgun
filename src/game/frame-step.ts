export const FIXED_STEP = 1 / 120;

export interface StepOptions {
  state: 'safehouse' | 'playing' | 'dead' | 'win' | 'paused' | 'breach';
  reducedMotion: boolean;
  briefActive?: boolean;
}

interface Steppable {
  hitstop: number;
  update(dt: number, aim: { x: number; y: number }, edge: boolean): void;
}

/** Advance a world with fixed 120 Hz simulation steps. */
export function stepWorld(
  world: Steppable,
  acc: number,
  dt: number,
  aim: { x: number; y: number },
  options: StepOptions,
): { acc: number; edges: boolean } {
  if (options.briefActive) return { acc: 0, edges: true };
  if (!options.reducedMotion && world.hitstop > 0 && options.state !== 'safehouse') {
    world.hitstop = Math.max(0, world.hitstop - dt);
    world.update(dt * 0.08, aim, true);
    return { acc, edges: true };
  }
  const scale = options.state === 'dead' && !options.reducedMotion ? 0.32 : 1;
  let next = Math.min(acc + dt * scale, 0.2);
  let edges = false;
  let edge = true;
  let guard = 0;
  while (next >= FIXED_STEP && guard++ < 16) {
    world.update(FIXED_STEP, aim, edge);
    if (edge) edges = true;
    edge = false;
    next -= FIXED_STEP;
  }
  return { acc: next, edges };
}
