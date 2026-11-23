import { dist } from '../core/math';
import { assignSquads } from './world-ai';
import type { Level } from './map';
import { pickSpawnPoints } from './level-spawns';
import type { RunMods } from './progression';
import type { Enemy, EnemyKind, EnemyState, Player, WorldEvent } from './world-types';

/** World surface used by heat and reinforcement waves. */
export interface EncounterHost {
  player: Player;
  level: Level;
  enemies: Enemy[];
  mods: RunMods;
  heat: number;
  peakHeat: number;
  reinforcementWave: number;
  heatShift: number;
  modifierHeat: number;
  exitOpen: boolean;
  addEnemy(
    x: number,
    y: number,
    strafeSign?: number,
    state?: EnemyState,
    forcedKind?: EnemyKind,
  ): Enemy;
  emit(event: WorldEvent): void;
  /** Sight test; when present (with real geometry) waves spawn out of view. */
  lineClear?(ax: number, ay: number, bx: number, by: number): boolean;
}

/**
 * Spawn a wave. With real level geometry the points come from
 * `pickSpawnPoints`: out of sight, outside the player's room, spread apart
 * and optionally converging on an anchor (exit, defense zone). Hosts without
 * geometry fall back to the furthest authored spawns.
 */
export function spawnReinforcements(
  host: EncounterHost,
  count: number,
  forcedKind?: EnemyKind,
  anchor?: { x: number; y: number } | null,
): void {
  const p = host.player;
  const points = host.level.walls && host.level.w
    ? pickSpawnPoints(host.level, {
        from: p,
        count,
        anchor,
        lineClear: host.lineClear ? (ax, ay, bx, by) => host.lineClear!(ax, ay, bx, by) : undefined,
      })
    : [...host.level.enemies]
        .map((spawn) => ({ ...spawn, d: dist(spawn.x, spawn.y, p.x, p.y) }))
        .sort((a, b) => b.d - a.d)
        .slice(0, count);
  for (const point of points) {
    host.addEnemy(point.x, point.y, 1, 'chase', forcedKind ?? point.kind);
  }
  assignSquads(host.enemies);
  host.emit({ type: 'siren', x: p.x, y: p.y, angle: 0 });
}

/** Add heat and trigger the two authored reinforcement thresholds. */
export function addHeat(host: EncounterHost, amount: number): void {
  host.heat = Math.min(
    100,
    host.heat + amount * host.mods.heatMult * host.modifierHeat,
  );
  host.peakHeat = Math.max(host.peakHeat, host.heat);
  if (host.exitOpen) return;
  const firstWave = Math.max(25, 55 - host.heatShift);
  const secondWave = Math.max(55, 90 - host.heatShift);
  if (host.heat >= firstWave && host.reinforcementWave < 1) {
    host.reinforcementWave = 1;
    spawnReinforcements(host, 2);
  }
  if (host.heat >= secondWave && host.reinforcementWave < 2) {
    host.reinforcementWave = 2;
    spawnReinforcements(host, 2);
  }
}
