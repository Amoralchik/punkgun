import type { Input } from '../core/input';
import type { Renderer } from '../render/renderer';
import type { MenuNavigation } from '../ui/menu-navigation';
import type { World } from './world';
import type { GameState } from './game-state';

/** Input polling and render/input finalization around a frame. */
export class FrameShell {
  constructor(
    private readonly input: Input,
    private readonly menu: MenuNavigation,
  ) {}

  begin(dt: number): void {
    this.input.pollGamepad(dt);
    this.menu.poll();
  }

  finish(
    renderer: Renderer,
    world: World,
    dt: number,
    edgesConsumed: boolean,
    state: GameState,
  ): void {
    renderer.sync(world, dt);
    // A 165 Hz display can render frames without a fixed 120 Hz sim step.
    // Keep edge-triggered input pending until a step actually consumes it.
    if (edgesConsumed || (state !== 'playing' && state !== 'dead')) {
      this.input.endFrame();
    }
  }
}
