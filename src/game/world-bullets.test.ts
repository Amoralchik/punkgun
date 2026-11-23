import { describe, expect, it, vi } from 'vitest';
import type { Bullet, Player } from './world-types';
import { updateBullets, type BulletHost } from './world-bullets';

describe('enemy bullet lethal hit', () => {
  it('passes the bullet owner and attack name to the death report', () => {
    const bullet: Bullet = {
      x: 5,
      y: 0,
      px: -5,
      py: 0,
      vx: 100,
      vy: 0,
      life: 1,
      ownerId: 7,
      ownerKind: 'enemy',
      attack: 'LMG',
      pierce: 0,
    };
    const player = { x: 0, y: 0, r: 10, alive: true } as Player;
    const source = {
      label: 'HEAVY GUNNER',
      attack: 'LMG',
      cause: 'gunfire' as const,
      x: 400,
      y: 0,
      kind: 'heavy' as const,
    };
    const killPlayer = vi.fn();
    const damageSourceFor = vi.fn(() => source);
    const host = {
      bullets: [bullet],
      barrels: [],
      cameras: [],
      turrets: [],
      lasers: [],
      enemies: [],
      player,
      shotsHit: 0,
      deathCause: 'UNKNOWN',
      solidAt: () => false,
      breakGlassAt: () => false,
      addSparks: () => {},
      emit: () => {},
      blowBarrel: () => {},
      damageBoss: () => {},
      damageHeavy: () => {},
      killEnemy: () => {},
      killPlayer,
      damageSourceFor,
    } as unknown as BulletHost;

    updateBullets(host, 0.016);

    expect(host.deathCause).toBe('GUNFIRE');
    expect(damageSourceFor).toHaveBeenCalledWith(7, expect.any(Number), expect.any(Number), 'LMG');
    expect(killPlayer).toHaveBeenCalledWith(expect.any(Number), source);
    expect(host.bullets).toHaveLength(0);
  });
});
