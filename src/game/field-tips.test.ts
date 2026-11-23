import { describe, expect, it } from 'vitest';
import { pickFieldTip, type FieldTipInput } from './field-tips';

function input(overrides: Partial<FieldTipInput> = {}): FieldTipInput {
  return {
    deployedFor: 0,
    armorHit: false,
    reloadNeeded: false,
    executeReady: false,
    ...overrides,
  };
}

describe('first-use field tips', () => {
  it('retires each tip after it is seen', () => {
    expect(pickFieldTip(input({ deployedFor: 2 }), [])).toBe('deploy');
    expect(pickFieldTip(input({ deployedFor: 2 }), ['deploy'])).toBeNull();
  });

  it('prioritizes survival and available actions over the deploy reminder', () => {
    expect(pickFieldTip(input({ deployedFor: 2, armorHit: true }), [])).toBe('armor');
    expect(
      pickFieldTip(input({ deployedFor: 2, armorHit: true, executeReady: true }), ['armor']),
    ).toBe('execute');
    expect(
      pickFieldTip(input({ deployedFor: 2, reloadNeeded: true }), ['armor', 'execute']),
    ).toBe('reload');
  });

  it('does not fire the deploy tip during the opening beat', () => {
    expect(pickFieldTip(input({ deployedFor: 1.39 }), [])).toBeNull();
    expect(pickFieldTip(input({ deployedFor: 1.4 }), [])).toBe('deploy');
  });
});
