import { describe, expect, it } from 'vitest';
import { controlKeymap } from './settings';

describe('control presets', () => {
  it('maps every canonical movement key to the chosen layout', () => {
    expect(controlKeymap('wasd')).toEqual({});
    expect(controlKeymap('esdf')).toEqual({
      KeyW: 'KeyE',
      KeyS: 'KeyD',
      KeyA: 'KeyS',
      KeyD: 'KeyF',
    });
    expect(controlKeymap('arrows')).toEqual({
      KeyW: 'ArrowUp',
      KeyS: 'ArrowDown',
      KeyA: 'ArrowLeft',
      KeyD: 'ArrowRight',
    });
  });
});
