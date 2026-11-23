import { describe, expect, it } from 'vitest';
import type { Contract } from './missions';
import { buildMissionSpec } from './mission-spec';

describe('mission spec', () => {
  it('copies contract, insertion and meta state into the world spec', () => {
    const contract = {
      objective: 'hunt',
      requiredLoot: 0,
      modifiers: ['alarm'],
      bossId: 'grin',
      bossRush: true,
      risk: 'HIGH',
    } as unknown as Contract;
    expect(buildMissionSpec(contract, 'ghost', ['pay'], 2)).toEqual({
      objective: 'hunt',
      requiredLoot: 0,
      approach: 'ghost',
      modifiers: ['alarm'],
      bossId: 'grin',
      bossRush: true,
      risk: 'HIGH',
      ngPlus: 2,
      boons: ['pay'],
    });
  });
});
