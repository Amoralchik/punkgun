import { describe, expect, it, vi } from 'vitest';
import {
  checkMissionComplete,
  type MissionCompletionHost,
} from './world-mission-completion';
import type { Enemy, ObjectiveNode, Player } from './world-types';

function node(completed = false): ObjectiveNode {
  return {
    id: 1,
    kind: 'zone',
    x: 0,
    y: 0,
    radius: 100,
    progress: completed ? 1 : 0,
    required: 1,
    completed,
  } as ObjectiveNode;
}

function host(overrides: Partial<MissionCompletionHost> = {}): MissionCompletionHost {
  return {
    objective: 'purge',
    exitOpen: false,
    aliveEnemies: 0,
    enemies: [],
    targetId: null,
    boss: null,
    bossRush: false,
    bossRushQueue: ['psycho', 'grin'],
    bossRushIndex: 0,
    collectedLoot: 0,
    requiredLoot: 0,
    objectives: [],
    player: { x: 10, y: 10, invulnT: 0 } as unknown as Player,
    exit: { x: 100, y: 200 },
    spawnBoss: vi.fn(),
    emit: vi.fn(),
    ...overrides,
  };
}

describe('mission completion', () => {
  it('opens the exit for purge and does nothing once open', () => {
    const blocked = host({ aliveEnemies: 1 });
    checkMissionComplete(blocked);
    expect(blocked.exitOpen).toBe(false);

    const h = host();
    checkMissionComplete(h);
    expect(h.exitOpen).toBe(true);
    expect(h.emit).toHaveBeenCalledWith({ type: 'exitOpen', x: 100, y: 200, angle: 0 });

    const again = host({ exitOpen: true });
    checkMissionComplete(again);
    expect(again.emit).not.toHaveBeenCalled();
  });

  it('resolves target and hunt kills', () => {
    const target = { id: 5, alive: true } as Enemy;
    const alive = host({ objective: 'target', targetId: 5, enemies: [target] });
    checkMissionComplete(alive);
    expect(alive.exitOpen).toBe(false);

    const dead = host({
      objective: 'hunt',
      targetId: 5,
      enemies: [{ id: 5, alive: false } as Enemy],
    });
    checkMissionComplete(dead);
    expect(dead.exitOpen).toBe(true);

    const missing = host({ objective: 'target', targetId: 5, enemies: [] });
    checkMissionComplete(missing);
    expect(missing.exitOpen).toBe(false);
  });

  it('advances a boss rush instead of opening the exit', () => {
    const h = host({
      objective: 'boss',
      boss: { alive: false } as Enemy,
      bossRush: true,
      bossRushIndex: 0,
    });
    h.spawnBoss = vi.fn(() => {
      h.boss = { alive: true, x: 30, y: 40 } as Enemy;
    });
    checkMissionComplete(h);
    expect(h.bossRushIndex).toBe(1);
    expect(h.spawnBoss).toHaveBeenCalledWith('grin');
    expect(h.player.invulnT).toBe(1);
    expect(h.exitOpen).toBe(false);
    expect(h.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bossRushWave', wave: 2, total: 2 }),
    );

    const final = host({
      objective: 'boss',
      boss: { alive: false } as Enemy,
      bossRush: true,
      bossRushIndex: 1,
    });
    checkMissionComplete(final);
    expect(final.exitOpen).toBe(true);
  });

  it('handles sabotage, extraction, defense and loot objectives', () => {
    const sabotage = host({ objective: 'sabotage', objectives: [node(false)] });
    checkMissionComplete(sabotage);
    expect(sabotage.exitOpen).toBe(false);
    sabotage.objectives = [node(true), node(true)];
    checkMissionComplete(sabotage);
    expect(sabotage.exitOpen).toBe(true);

    const extraction = host({ objective: 'extraction', objectives: [node(false)] });
    checkMissionComplete(extraction);
    expect(extraction.exitOpen).toBe(false);
    extraction.objectives = [node(true)];
    checkMissionComplete(extraction);
    expect(extraction.exitOpen).toBe(true);

    const defense = host({ objective: 'defense', objectives: [node(true)] });
    checkMissionComplete(defense);
    expect(defense.exitOpen).toBe(true);

    const recover = host({ objective: 'recover', collectedLoot: 1, requiredLoot: 2 });
    checkMissionComplete(recover);
    expect(recover.exitOpen).toBe(false);
    recover.collectedLoot = 2;
    checkMissionComplete(recover);
    expect(recover.exitOpen).toBe(true);
  });
});
