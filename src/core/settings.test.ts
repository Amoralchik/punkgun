import { describe, expect, it } from 'vitest';
import { controlKeymap, resolveKeymap } from './settings';

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

describe('key remap', () => {
  it('merges preset movement with custom key codes', () => {
    expect(resolveKeymap('wasd', { KeyR: 'KeyT' })).toEqual({ KeyR: 'KeyT' });
    expect(resolveKeymap('esdf', { KeyW: 'KeyI' })).toMatchObject({
      KeyW: 'KeyI',
      KeyA: 'KeyS',
      KeyD: 'KeyF',
    });
  });
});
