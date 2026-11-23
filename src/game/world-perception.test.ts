import { describe, expect, it, vi } from 'vitest';
import { baseMods } from './progression';
import { alertAt, canSee, noticeCorpse, spot, type PerceptionHost } from './world-perception';
import type { Enemy, Player } from './world-types';

function enemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    id: 1,
    kind: 'grunt',
    x: 0,
    y: 0,
    angle: 0,
    state: 'idle',
    stateT: 0,
    visionMult: 1,
    alive: true,
    corpseFound: false,
    lastSeenX: 0,
    lastSeenY: 0,
    searchT: 0,
    markT: 0,
    fireCd: 0,
    ...overrides,
  } as unknown as Enemy;
}

function host(overrides: Partial<PerceptionHost> = {}): PerceptionHost {
  return {
    player: { x: 100, y: 0, camoT: 0 } as unknown as Player,
    enemies: [],
    mods: baseMods(),
    approachVision: 1,
    modifierVision: 1,
    spotted: new Set<number>(),
    detections: 0,
    rand: () => 0.5,
    emit: vi.fn(),
    lineClear: () => true,
    smokeBlocks: () => false,
    ...overrides,
  };
}

describe('enemy perception', () => {
  it('respects camo, range, facing and cover', () => {
    expect(canSee(host({ player: { x: 100, y: 0, camoT: 1 } as unknown as Player }), enemy())).toBe(false);

    const h = host();
    h.player.x = 900;
    expect(canSee(h, enemy())).toBe(false);

    h.player.x = 300;
    const facingAway = enemy({ angle: Math.PI });
    expect(canSee(h, facingAway)).toBe(false);

    const committed = enemy({ angle: Math.PI, state: 'chase' });
    h.player.x = 150;
    expect(canSee(h, committed)).toBe(true);

    h.lineClear = () => false;
    expect(canSee(h, committed)).toBe(false);
    h.lineClear = () => true;
    h.smokeBlocks = () => true;
    expect(canSee(h, committed)).toBe(false);
  });

  it('spots once and propagates to nearby idle allies', () => {
    const h = host();
    const ally = enemy({ id: 2, x: 50 });
    const e = enemy({ id: 1, x: 0 });
    h.enemies = [e, ally];
    spot(h, e);
    expect(e.state).toBe('alert');
    expect(e.markT).toBe(0.9);
    expect(e.fireCd).toBeGreaterThan(0);
    expect(h.spotted.has(e.id)).toBe(true);
    expect(h.detections).toBe(1);
    expect(ally.state).toBe('chase');
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'alert' }));

    spot(h, e);
    expect(h.detections).toBe(1);
  });

  it('alerts only idle enemies inside the radius', () => {
    const near = enemy({ id: 1, x: 20 });
    const far = enemy({ id: 2, x: 500 });
    const already = enemy({ id: 3, x: 10, state: 'chase' });
    const h = host({ enemies: [near, far, already] });
    alertAt(h, 0, 0, 100);
    expect(near.state).toBe('chase');
    expect(near.lastSeenX).toBe(0);
    expect(far.state).toBe('idle');
    expect(already.markT).toBe(0);
  });

  it('discovers a body, raises the squad and counts the detection', () => {
    const body = enemy({ id: 9, alive: false, x: 50, corpseFound: false });
    const ally = enemy({ id: 2, x: 40 });
    const e = enemy({ id: 1, x: 0 });
    const h = host({ enemies: [body, ally, e] });
    noticeCorpse(h, e);
    expect(body.corpseFound).toBe(true);
    expect(e.state).toBe('chase');
    expect(e.lastSeenX).toBe(50);
    expect(h.detections).toBe(1);
    expect(ally.state).toBe('chase');
    expect(h.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'bodyFound' }));
  });

  it('ignores bodies behind cover or already seen', () => {
    const body = enemy({ id: 9, alive: false, x: 50, corpseFound: false });
    const h = host({ enemies: [body], lineClear: () => false });
    const e = enemy({ id: 1 });
    noticeCorpse(h, e);
    expect(body.corpseFound).toBe(false);
    expect(e.state).toBe('idle');

    body.corpseFound = true;
    h.lineClear = () => true;
    noticeCorpse(h, e);
    expect(e.state).toBe('idle');
  });
});
