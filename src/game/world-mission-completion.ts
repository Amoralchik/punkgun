import type { BossId } from './bosses';
import type { ObjectiveKind } from './missions';
import type { Enemy, ObjectiveNode, Player, WorldEvent } from './world-types';

/** World surface used to decide when the exit opens. */
export interface MissionCompletionHost {
  objective: ObjectiveKind;
  exitOpen: boolean;
  aliveEnemies: number;
  enemies: Enemy[];
  targetId: number | null;
  boss: Enemy | null;
  bossRush: boolean;
  bossRushQueue: BossId[];
  bossRushIndex: number;
  collectedLoot: number;
  requiredLoot: number;
  objectives: ObjectiveNode[];
  player: Player;
  exit: { x: number; y: number };
  spawnBoss(id: BossId): void;
  emit(event: WorldEvent): void;
}

/**
 * Resolve the current objective. Boss rushes advance the wave instead of
 * opening the exit until the final boss dies.
 */
export function checkMissionComplete(host: MissionCompletionHost): void {
  if (host.exitOpen) return;
  let done = false;
  if (host.objective === 'purge') {
    done = host.aliveEnemies === 0;
  } else if (host.objective === 'target' || host.objective === 'hunt') {
    const target = host.enemies.find((e) => e.id === host.targetId);
    done = !!target && !target.alive;
  } else if (host.objective === 'boss') {
    const boss = host.boss;
    done = !!boss && !boss.alive;
    if (
      done &&
      host.bossRush &&
      host.bossRushIndex < host.bossRushQueue.length - 1
    ) {
      host.bossRushIndex++;
      host.spawnBoss(host.bossRushQueue[host.bossRushIndex]);
      host.player.invulnT = Math.max(host.player.invulnT, 1);
      const current = host.boss;
      host.emit({
        type: 'bossRushWave',
        x: current?.x ?? host.player.x,
        y: current?.y ?? host.player.y,
        angle: 0,
        wave: host.bossRushIndex + 1,
        total: host.bossRushQueue.length,
      });
      return;
    }
  } else if (host.objective === 'sabotage') {
    done = host.objectives.length > 0 && host.objectives.every((n) => n.completed);
  } else if (host.objective === 'extraction') {
    done = host.objectives[0]?.completed === true;
  } else if (host.objective === 'defense') {
    done = host.objectives[0]?.completed === true;
  } else {
    done = host.collectedLoot >= host.requiredLoot;
  }
  if (!done) return;
  host.exitOpen = true;
  host.emit({ type: 'exitOpen', x: host.exit.x, y: host.exit.y, angle: 0 });
}
