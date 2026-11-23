import { describe, expect, it } from 'vitest';
import { readGamepad } from './gamepad';

function pad(overrides: Partial<Gamepad> = {}): Gamepad {
  return {
    connected: true,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0, touched: false })),
    ...overrides,
  } as Gamepad;
}

describe('gamepad mapping', () => {
  it('applies radial deadzones to sticks', () => {
    const state = readGamepad(pad({ axes: [0.1, 0.1, 0, 0] }));
    expect(state.moveX).toBe(0);
    expect(state.moveY).toBe(0);
    const pushed = readGamepad(pad({ axes: [1, 0, 0, -1] }));
    expect(pushed.moveX).toBe(1);
    expect(pushed.aimY).toBe(-1);
  });

  it('maps triggers and face buttons', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0, touched: false }));
    buttons[7] = { pressed: true, value: 1, touched: true };
    buttons[0] = { pressed: true, value: 1, touched: true };
    buttons[2] = { pressed: true, value: 1, touched: true };
    buttons[14] = { pressed: true, value: 1, touched: true };
    buttons[13] = { pressed: true, value: 1, touched: true };
    const state = readGamepad(pad({ buttons }));
    expect(state.fire).toBe(true);
    expect(state.dash).toBe(true);
    expect(state.interact).toBe(true);
    expect(state.emp).toBe(true);
    expect(state.camo).toBe(false);
    expect(state.menuLeft).toBe(true);
    expect(state.menuDown).toBe(true);
    expect(state.menuAccept).toBe(true);
  });

  it('returns a disconnected state without a pad', () => {
    expect(readGamepad(null).connected).toBe(false);
    expect(readGamepad(pad({ connected: false })).connected).toBe(false);
  });
});
