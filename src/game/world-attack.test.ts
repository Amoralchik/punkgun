import { describe, expect, it, vi } from 'vitest';
import { baseMods } from './progression';
import { WEAPONS } from './weapons';
import { SWING_DURATION } from './world-player';
import { playerAttack, type PlayerAttackHost } from './world-attack';
import type { Player } from './world-types';

function player(): Player {
  return {
    id: 7,
    x: 0,
    y: 0,
    angle: 0,
    vx: 0,
    vy: 0,
    attackCd: 0,
    reloadT: 0,
    camoT: 0,
    weapon: 'pistol',
    clip: 2,
    ammo: 10,
    attachment: null,
    variant: null,
    overclockT: 0,
    flashT: 0,
    swingT: 0,
    swingHit: true,
  } as unknown as Player;
}

function host(overrides: Partial<PlayerAttackHost> = {}): PlayerAttackHost {
  return {
    player: player(),
    bullets: [],
    mods: baseMods(),
    shotsFired: 0,
    shake: 0,
    rand: () => 0.5,
    emit: vi.fn(),
    resolveCircle: vi.fn(),
    addCasing: vi.fn(),
    alertAt: vi.fn(),
    addHeat: vi.fn(),
    ...overrides,
  };
}

describe('player attack', () => {
  it('fires one round, spends the clip and emits the pistol signature', () => {
    const h = host();
    playerAttack(h);
    expect(h.player.clip).toBe(1);
    expect(h.shotsFired).toBe(1);
    expect(h.bullets).toHaveLength(1);
    expect(h.bullets[0].ownerId).toBe(h.player.id);
    expect(h.player.attackCd).toBeCloseTo(WEAPONS.pistol.cooldown);
    expect(h.player.flashT).toBe(0.06);
    expect(h.addHeat).toHaveBeenCalled();
    expect(h.addCasing).toHaveBeenCalled();
    expect(h.alertAt).toHaveBeenCalled();
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'pistol' }));
  });

  it('emits every shotgun pellet and the suppressed signature', () => {
    const shotgun = host();
    shotgun.player.weapon = 'shotgun';
    playerAttack(shotgun);
    expect(shotgun.bullets).toHaveLength(WEAPONS.shotgun.pellets);
    expect(shotgun.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'shotgun' }));

    const suppressed = host();
    suppressed.player.attachment = 'suppressor';
    playerAttack(suppressed);
    expect(suppressed.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'suppressedShot' }),
    );
  });

  it('clicks dry and blocks attacks during cooldown or reload', () => {
    const dry = host();
    dry.player.clip = 0;
    playerAttack(dry);
    expect(dry.player.attackCd).toBe(0.24);
    expect(dry.bullets).toHaveLength(0);
    expect(dry.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'empty' }));

    const cooling = host();
    cooling.player.attackCd = 1;
    playerAttack(cooling);
    expect(cooling.bullets).toHaveLength(0);
    expect(cooling.emit).not.toHaveBeenCalled();

    const reloading = host();
    reloading.player.reloadT = 1;
    playerAttack(reloading);
    expect(reloading.bullets).toHaveLength(0);
  });

  it('breaks camo and lunges on a melee swing', () => {
    const h = host();
    h.player.weapon = 'bat';
    h.player.camoT = 1;
    playerAttack(h);
    expect(h.player.camoT).toBe(0);
    expect(h.player.swingT).toBe(SWING_DURATION);
    expect(h.player.swingHit).toBe(false);
    expect(h.bullets).toHaveLength(0);
    expect(h.resolveCircle).toHaveBeenCalledTimes(2);
    expect(h.alertAt).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 190);
    expect(h.shake).toBeGreaterThan(0);
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'camoBreak' }));
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'swing' }));
  });
});
