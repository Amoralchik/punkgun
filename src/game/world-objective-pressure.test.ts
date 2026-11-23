import { describe, expect, it, vi } from 'vitest';
import {
  tickObjectivePressure,
  type ObjectivePressureHost,
} from './world-objective-pressure';
import type { ObjectiveNode, Player } from './world-types';

function zone(): ObjectiveNode {
  return {
    id: 1,
    kind: 'zone',
    x: 0,
    y: 0,
    radius: 100,
    progress: 0,
    required: 10,
    completed: false,
  };
}

function host(overrides: Partial<ObjectivePressureHost> = {}): ObjectivePressureHost {
  return {
    objective: 'defense',
    objectives: [zone()],
    player: { x: 0, y: 0, alive: true } as unknown as Player,
    state: 'playing',
    exitOpen: false,
    defenseT: 0,
    defenseWaveT: 12,
    extractionPressureT: 0,
    spawnReinforcements: vi.fn(),
    emit: vi.fn(),
    checkObjective: vi.fn(),
    ...overrides,
  };
}

describe('objective pressure', () => {
  it('fills the defense zone and spawns a wave every 12 seconds', () => {
    const h = host();
    tickObjectivePressure(h, 1);
    expect(h.objectives[0].progress).toBe(1);
    expect(h.defenseT).toBe(1);
    expect(h.defenseWaveT).toBe(11);

    tickObjectivePressure(h, 11);
    expect(h.spawnReinforcements).toHaveBeenCalledWith(2, 'grunt');
    expect(h.defenseWaveT).toBe(12);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'siren' }));
    expect(h.objectives[0].completed).toBe(true);
    expect(h.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'objectiveComplete' }),
    );
    expect(h.checkObjective).toHaveBeenCalledTimes(1);
  });

  it('pauses defense progress outside the zone or while dead', () => {
    const outside = host({ player: { x: 200, y: 0, alive: true } as unknown as Player });
    tickObjectivePressure(outside, 1);
    expect(outside.objectives[0].progress).toBe(0);

    const dead = host({ player: { x: 0, y: 0, alive: false } as unknown as Player });
    tickObjectivePressure(dead, 1);
    expect(dead.objectives[0].progress).toBe(0);
  });

  it('does not run while not playing', () => {
    const h = host({ state: 'dead' });
    tickObjectivePressure(h, 5);
    expect(h.objectives[0].progress).toBe(0);
    expect(h.spawnReinforcements).not.toHaveBeenCalled();
  });

  it('runs extraction convergence only after the case and while the exit is sealed', () => {
    const node = zone();
    node.completed = true;
    const h = host({
      objective: 'extraction',
      objectives: [node],
      extractionPressureT: 0.5,
    });
    tickObjectivePressure(h, 1);
    expect(h.extractionPressureT).toBe(8);
    expect(h.spawnReinforcements).toHaveBeenCalledWith(2, 'rusher');

    const notReady = host({ objective: 'extraction', objectives: [zone()] });
    notReady.extractionPressureT = 0.5;
    tickObjectivePressure(notReady, 1);
    expect(notReady.spawnReinforcements).not.toHaveBeenCalled();

    const open = host({ objective: 'extraction', objectives: [node], exitOpen: true });
    open.extractionPressureT = 0.5;
    tickObjectivePressure(open, 1);
    expect(open.spawnReinforcements).not.toHaveBeenCalled();
  });
});
