import { describe, expect, it, vi } from 'vitest';
import { runBossCharge, type BossChargeHost } from './world-boss-ai';
import type { Enemy, Player } from './world-types';

function boss(overrides: Partial<Enemy> = {}): Enemy {
  return {
    kind: 'boss',
    x: 0,
    y: 0,
    angle: 0,
    armor: 2,
    maxArmor: 3,
    bossChargeT: 0,
    bossChargeCd: 0,
    bossWeakT: 0,
    meleeCd: 1,
    ...overrides,
  } as unknown as Enemy;
}

function host(overrides: Partial<BossChargeHost> = {}): BossChargeHost {
  return {
    player: { x: 300, y: 0 } as unknown as Player,
    bossChargeEnabled: true,
    emit: vi.fn(),
    steer: vi.fn(),
    enemyPunch: vi.fn(),
    ...overrides,
  };
}

describe('boss charge', () => {
  it('starts a charge in phase two at range', () => {
    const h = host();
    const e = boss();
    expect(runBossCharge(h, e, 0.016, true, 300)).toBe(true);
    expect(e.bossChargeT).toBe(0.7);
    expect(e.bossChargeCd).toBe(8);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'bossCharge' }));
  });

  it('does not charge out of phase, out of range, or without the flag', () => {
    expect(runBossCharge(host(), boss({ armor: 3 }), 0.016, true, 300)).toBe(false);
    expect(runBossCharge(host(), boss(), 0.016, true, 50)).toBe(false);
    expect(
      runBossCharge(host({ bossChargeEnabled: false }), boss(), 0.016, true, 300),
    ).toBe(false);
  });

  it('smashes a close target and exposes the core', () => {
    const h = host();
    const e = boss({ bossChargeT: 0.5, meleeCd: 0 });
    h.player = { x: 40, y: 0 } as unknown as Player;
    expect(runBossCharge(h, e, 0.1, true, 40)).toBe(true);
    expect(h.enemyPunch).toHaveBeenCalledWith(e);
    expect(e.bossChargeT).toBe(0);
    expect(e.bossWeakT).toBe(1.1);
    expect(e.bossChargeCd).toBe(6);
  });

  it('exposes the core when the charge expires', () => {
    const h = host();
    const e = boss({ bossChargeT: 0.1 });
    expect(runBossCharge(h, e, 0.2, true, 300)).toBe(true);
    expect(e.bossChargeT).toBe(0);
    expect(e.bossWeakT).toBe(1.2);
    expect(h.enemyPunch).not.toHaveBeenCalled();
  });

  it('ignores non-bosses', () => {
    expect(runBossCharge(host(), boss({ kind: 'grunt' }), 0.016, true, 300)).toBe(false);
  });
});
