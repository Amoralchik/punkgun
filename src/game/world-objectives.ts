import { t } from '../core/i18n';
import { dist } from '../core/math';
import type { Level } from './map';
import { tileCenter } from './map';
import type { LootItem, MissionSpec, ObjectiveNode, Player } from './world-types';

/** Datum positions for terminals/cases, biased to existing caches and spawns. */
export function objectivePositions(
  level: Level,
  loot: LootItem[],
  count: number,
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (const item of loot) {
    if (positions.length >= count) break;
    positions.push({ x: item.x, y: item.y });
  }
  for (const enemy of level.enemies) {
    if (positions.length >= count) break;
    if (positions.some((point) => dist(point.x, point.y, enemy.x, enemy.y) < 80)) continue;
    positions.push({ x: enemy.x, y: enemy.y });
  }
  while (positions.length < count) {
    const center = tileCenter(level.w >> 1, level.h >> 1, level.h);
    positions.push({
      x: center.x + (positions.length - 1) * 34,
      y: center.y + (positions.length % 2 === 0 ? 34 : -34),
    });
  }
  return positions;
}

export function createObjectiveNodes(
  mission: MissionSpec,
  level: Level,
  loot: LootItem[],
  nextId: () => number,
): ObjectiveNode[] {
  const nodes: ObjectiveNode[] = [];
  if (mission.objective === 'sabotage') {
    const count = Math.max(1, mission.requiredLoot);
    for (const pos of objectivePositions(level, loot, count)) {
      nodes.push({
        id: nextId(),
        x: pos.x,
        y: pos.y,
        kind: 'terminal',
        progress: 0,
        required: 1,
        completed: false,
        radius: 58,
      });
    }
  } else if (mission.objective === 'extraction') {
    let best = level.loot[0] ?? { x: level.exit.x, y: level.exit.y };
    let bestD = -1;
    for (const item of level.loot) {
      const d = dist(item.x, item.y, level.spawn.x, level.spawn.y);
      if (d > bestD) {
        bestD = d;
        best = item;
      }
    }
    nodes.push({
      id: nextId(),
      x: best.x,
      y: best.y,
      kind: 'case',
      progress: 0,
      required: 1,
      completed: false,
      radius: 58,
    });
  } else if (mission.objective === 'defense') {
    nodes.push({
      id: nextId(),
      x: level.exit.x,
      y: level.exit.y,
      kind: 'zone',
      progress: 0,
      required: 45,
      completed: false,
      radius: 170,
    });
  }
  return nodes;
}

export function nearestObjectiveNode(
  nodes: ObjectiveNode[],
  player: Player,
): ObjectiveNode | null {
  let best: ObjectiveNode | null = null;
  let bestD = Infinity;
  for (const node of nodes) {
    if (node.completed || node.kind === 'zone') continue;
    const d = dist(player.x, player.y, node.x, node.y);
    if (d <= node.radius && d < bestD) {
      bestD = d;
      best = node;
    }
  }
  return best;
}

export function objectiveNodeText(
  mission: MissionSpec,
  nodes: ObjectiveNode[],
): string | null {
  if (mission.objective === 'sabotage') {
    const done = nodes.filter((node) => node.completed).length;
    return t('hud.sabotage', { done, total: nodes.length });
  }
  if (mission.objective === 'extraction') {
    return nodes[0]?.completed ? t('hud.caseSecured') : t('hud.case');
  }
  if (mission.objective === 'defense') {
    const zone = nodes[0];
    const left = Math.max(0, Math.ceil((zone?.required ?? 45) - (zone?.progress ?? 0)));
    return zone?.completed ? t('hud.zoneHeld') : t('hud.holdZone', { seconds: left });
  }
  return null;
}
