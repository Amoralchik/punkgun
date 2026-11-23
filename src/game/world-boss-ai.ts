import { ENEMY_SPEED } from './world-ai';
import type { Enemy, Player, WorldEvent } from './world-types';

export interface BossChargeHost {
  player: Player;
  bossChargeEnabled: boolean;
  emit(event: WorldEvent): void;
  steer(e: Enemy, tx: number, ty: number, speed: number, dt: number): void;
  enemyPunch(e: Enemy): void;
}

/**
 * Boss charge windup, rush, and exposed-core window.
 * Returns true when the branch consumed the turn.
 */
export function runBossCharge(
  host: BossChargeHost,
  e: Enemy,
  dt: number,
  sees: boolean,
  dToPlayer: number,
): boolean {
  if (e.kind !== 'boss') return false;
  const phase = Math.max(1, e.maxArmor - e.armor + 1);
  if (e.bossChargeT > 0) {
    const prev = e.bossChargeT;
    e.bossChargeT = Math.max(0, e.bossChargeT - dt);
    const a = Math.atan2(host.player.y - e.y, host.player.x - e.x);
    e.angle = a;
    host.steer(e, host.player.x, host.player.y, ENEMY_SPEED * 2.8, dt);
    if (dToPlayer < 70 && e.meleeCd <= 0) {
      host.enemyPunch(e);
      e.bossChargeT = 0;
      e.bossChargeCd = 6;
      e.bossWeakT = 1.1;
    } else if (prev > 0 && e.bossChargeT === 0) {
      e.bossWeakT = 1.2;
    }
    return true;
  }
  if (
    e.bossChargeCd <= 0 &&
    host.bossChargeEnabled &&
    sees &&
    phase >= 2 &&
    dToPlayer > 90 &&
    dToPlayer < 560
  ) {
    e.bossChargeT = 0.7;
    e.bossChargeCd = 8;
    host.emit({ type: 'bossCharge', x: e.x, y: e.y, angle: e.angle });
    return true;
  }
  return false;
}
