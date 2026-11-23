import { angleDelta, dist } from '../core/math';
import type { RunMods } from './progression';
import type { Enemy, Player, WorldEvent } from './world-types';

/** World surface used by perception and alert propagation. */
export interface PerceptionHost {
  player: Player;
  enemies: Enemy[];
  mods: RunMods;
  approachVision: number;
  modifierVision: number;
  spotted: Set<number>;
  detections: number;
  rand(): number;
  emit(event: WorldEvent): void;
  lineClear(ax: number, ay: number, bx: number, by: number): boolean;
  smokeBlocks(ax: number, ay: number, bx: number, by: number): boolean;
  /** Optional listener for every noise (civilian panic, etc.). */
  onNoise?(x: number, y: number, radius: number): void;
}

/** Custom stealth, range, facing-cone, hard-cover and smoke check. */
export function canSee(host: PerceptionHost, e: Enemy): boolean {
  const p = host.player;
  if (p.camoT > 0) return false;
  const d = dist(e.x, e.y, p.x, p.y);
  if (
    d >
    500 * host.mods.vision * e.visionMult * host.approachVision * host.modifierVision
  ) {
    return false;
  }
  const committed = e.state === 'chase' || e.state === 'alert';
  const peripheral =
    committed && d < 200 * host.approachVision * host.modifierVision;
  if (
    !peripheral &&
    d > 110 * host.mods.vision * e.visionMult * host.approachVision * host.modifierVision
  ) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    if (Math.abs(angleDelta(e.angle, a)) > 1.1) return false;
  }
  if (!host.lineClear(e.x, e.y, p.x, p.y)) return false;
  return !host.smokeBlocks(e.x, e.y, p.x, p.y);
}

/** First confirmed sighting: alert the spotter and nearby idle allies. */
export function spot(host: PerceptionHost, e: Enemy): void {
  if (e.state === 'chase' || e.state === 'alert') return;
  if (!host.spotted.has(e.id)) {
    host.spotted.add(e.id);
    host.detections++;
  }
  e.state = 'alert';
  e.stateT = 0.2 + host.rand() * 0.1;
  e.markT = 0.9;
  e.fireCd =
    e.kind === 'sniper' ? 1.0 + host.rand() * 0.4 : 0.4 + host.rand() * 0.35;
  host.emit({ type: 'alert', x: e.x, y: e.y, angle: e.angle });
  for (const other of host.enemies) {
    if (other === e || !other.alive) continue;
    if (other.state !== 'idle') continue;
    if (dist(e.x, e.y, other.x, other.y) > 210) continue;
    other.state = 'chase';
    other.lastSeenX = host.player.x;
    other.lastSeenY = host.player.y;
    other.searchT = 9;
    other.markT = 0.9;
  }
}

/** Propagate a noise/alert point to every idle enemy inside the radius. */
export function alertAt(
  host: PerceptionHost,
  x: number,
  y: number,
  radius: number,
): void {
  host.onNoise?.(x, y, radius);
  for (const e of host.enemies) {
    if (!e.alive || e.state === 'chase' || e.state === 'alert') continue;
    if (dist(x, y, e.x, e.y) > radius) continue;
    e.state = 'chase';
    e.lastSeenX = x;
    e.lastSeenY = y;
    e.searchT = 6;
    e.markT = 0.8;
  }
}

/** Discover a body in view and raise the nearby squad. */
export function noticeCorpse(host: PerceptionHost, e: Enemy): void {
  if (e.state === 'chase' || e.state === 'alert') return;
  for (const body of host.enemies) {
    if (body.alive || body.corpseFound) continue;
    const d = dist(e.x, e.y, body.x, body.y);
    if (d > 260 * e.visionMult) continue;
    if (d > 76) {
      const a = Math.atan2(body.y - e.y, body.x - e.x);
      if (Math.abs(angleDelta(e.angle, a)) > 1.05) continue;
    }
    if (!host.lineClear(e.x, e.y, body.x, body.y)) continue;
    if (host.smokeBlocks(e.x, e.y, body.x, body.y)) continue;
    body.corpseFound = true;
    e.state = 'chase';
    e.lastSeenX = body.x;
    e.lastSeenY = body.y;
    e.searchT = 6;
    e.markT = 1;
    alertAt(host, body.x, body.y, 260);
    host.detections++;
    host.emit({ type: 'bodyFound', x: body.x, y: body.y, angle: e.angle });
    return;
  }
}
