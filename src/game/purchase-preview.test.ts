import { describe, expect, it } from 'vitest';
import { baseMods } from './progression';
import { describeModChanges } from './purchase-preview';

describe('upgrade preview deltas', () => {
  it('shows exact count and percentage changes', () => {
    const before = baseMods();
    const after = { ...before, armor: before.armor + 1, speed: 1.06 };
    expect(describeModChanges(before, after)).toEqual([
      'ARMOR PLATE 0 → 1',
      'MOVE SPEED 100% → 106%',
    ]);
  });

  it('names unlocked abilities and neural strain transitions', () => {
    const before = baseMods();
    const after = { ...before, sandevistan: 1, humanityStage: 1 };
    const lines = describeModChanges(before, after);
    expect(lines).toContain('SANDEVISTAN UNLOCKED');
    expect(lines).toContain('NEURAL LOAD STABLE → STRAINED');
  });

  it('shows second-based windows and rank increases', () => {
    const before = baseMods();
    const after = { ...before, dashInvuln: 0.02, kerenzikov: 2 };
    const lines = describeModChanges(before, after);
    expect(lines).toContain('DASH I-FRAMES 0.00s → 0.02s');
    expect(lines).toContain('KERENZIKOV UNLOCKED');
    expect(describeModChanges(after, { ...after, kerenzikov: 2 })).toEqual([]);
  });
});
