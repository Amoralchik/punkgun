import { dist } from '../core/math';
import type { ObjectiveKind } from './missions';
import type {
  EnemyKind,
  ObjectiveNode,
  Player,
  WorldEvent,
  WorldState,
} from './world-types';

/** World surface used by objective pressure and its reinforcement waves. */
export interface ObjectivePressureHost {
  objective: ObjectiveKind;
  objectives: ObjectiveNode[];
  player: Player;
  state: WorldState;
  exitOpen: boolean;
  defenseT: number;
  defenseWaveT: number;
  extractionPressureT: number;
  spawnReinforcements(
    count: number,
    forcedKind?: EnemyKind,
    anchor?: { x: number; y: number } | null,
  ): void;
  emit(event: WorldEvent): void;
  checkObjective(): void;
}

/**
 * Defense-zone progress with a wave every 12s, and extraction convergence
 * every 8s while the exit is sealed.
 */
export function tickObjectivePressure(host: ObjectivePressureHost, dt: number): void {
  if (host.state !== 'playing') return;
  const p = host.player;
  if (host.objective === 'defense') {
    const zone = host.objectives[0];
    if (!zone || zone.completed) return;
    if (!p.alive || dist(p.x, p.y, zone.x, zone.y) > zone.radius) return;
    zone.progress = Math.min(zone.required, zone.progress + dt);
    host.defenseT = zone.progress;
    host.defenseWaveT -= dt;
    if (host.defenseWaveT <= 0) {
      host.defenseWaveT = 12;
      host.spawnReinforcements(2, 'grunt');
      host.emit({ type: 'siren', x: p.x, y: p.y, angle: 0 });
    }
    if (zone.progress >= zone.required) {
      zone.completed = true;
      host.emit({ type: 'objectiveComplete', x: zone.x, y: zone.y, angle: 0 });
      host.checkObjective();
    }
    return;
  }
  if (host.objective === 'extraction') {
    const node = host.objectives[0];
    if (!node?.completed || host.exitOpen) return;
    host.extractionPressureT -= dt;
    if (host.extractionPressureT <= 0) {
      host.extractionPressureT = 8;
      host.spawnReinforcements(2, 'rusher');
      host.emit({ type: 'siren', x: p.x, y: p.y, angle: 0 });
    }
  }
}
