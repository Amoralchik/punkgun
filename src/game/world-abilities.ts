import type { Input } from '../core/input';
import { dist } from '../core/math';
import type { RunMods } from './progression';
import type {
  Camera,
  Enemy,
  Laser,
  Player,
  Turret,
  WorldEvent,
} from './world-types';

/** Everything active cyberware needs from the world, and nothing else. */
export interface AbilityHost {
  player: Player;
  enemies: Enemy[];
  cameras: Camera[];
  turrets: Turret[];
  lasers: Laser[];
  mods: RunMods;
  shake: number;
  quickhackFxT: number;
  quickhackX: number;
  quickhackY: number;
  emit(event: WorldEvent): void;
  lineClear(ax: number, ay: number, bx: number, by: number): boolean;
  smokeBlocks(ax: number, ay: number, bx: number, by: number): boolean;
  addHeat(amount: number): void;
}

/** Edge-triggered active cyberware; every activation is gated by hackedT. */
export function activateAbilities(host: AbilityHost, input: Input): void {
  const p = host.player;
  if (p.hackedT > 0) return;
  if (host.mods.deck > 0 && p.quickhackCd <= 0 && input.wasPressed('KeyZ')) {
    triggerQuickhack(host);
  }
  if (
    (input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight')) &&
    host.mods.sandevistan > 0 &&
    p.slowCd <= 0
  ) {
    p.slowT = 2.5 + (host.mods.sandevistan - 1) * 0.8;
    p.slowCd = (14 - (host.mods.sandevistan - 1) * 3) * host.mods.abilityCd;
    host.emit({ type: 'sandevistan', x: p.x, y: p.y, angle: p.angle });
  }
  if (input.wasPressed('KeyC') && host.mods.camo > 0 && p.camoCloakCd <= 0) {
    p.camoT = 2.5 + (host.mods.camo - 1) * 0.8;
    p.camoCloakCd = (12 - (host.mods.camo - 1) * 2) * host.mods.abilityCd;
    host.emit({ type: 'camo', x: p.x, y: p.y, angle: p.angle });
  }
  if (input.wasPressed('KeyX') && host.mods.emp > 0 && p.empCd <= 0) {
    triggerEmp(host);
  }
  if (input.wasPressed('KeyV') && host.mods.berserk > 0 && p.berserkCd <= 0) {
    p.berserkT = 4 + (host.mods.berserk - 1) * 0.8;
    p.berserkCd = (20 - (host.mods.berserk - 1) * 3) * host.mods.abilityCd;
    host.emit({ type: 'berserk', x: p.x, y: p.y, angle: p.angle });
  }
  if (input.wasPressed('KeyG') && host.mods.overclock > 0 && p.overclockCd <= 0) {
    p.overclockT = 3.5 + (host.mods.overclock - 1) * 0.7;
    p.overclockCd = (18 - (host.mods.overclock - 1) * 3) * host.mods.abilityCd;
    host.emit({ type: 'overclock', x: p.x, y: p.y, angle: p.angle });
  }
  if (input.wasPressed('KeyH') && host.mods.deck > 0 && p.deckCd <= 0) {
    triggerDeck(host);
  }
}

export function triggerEmp(host: AbilityHost): void {
  const p = host.player;
  const rank = host.mods.emp;
  if (rank <= 0) return;
  const radius = 220 + rank * 40;
  p.empCd = (20 - (rank - 1) * 3) * host.mods.abilityCd;
  for (const e of host.enemies) {
    if (!e.alive) continue;
    if (dist(p.x, p.y, e.x, e.y) > radius) continue;
    e.stunT = Math.max(e.stunT, 2.5 + rank * 0.5);
    e.aiming = false;
    e.hackT = 0;
  }
  for (const c of host.cameras) {
    if (c.alive && dist(p.x, p.y, c.x, c.y) <= radius) c.disabledT = 7;
  }
  for (const t of host.turrets) {
    if (t.alive && dist(p.x, p.y, t.x, t.y) <= radius) t.disabledT = 7;
  }
  for (const l of host.lasers) {
    if (l.alive && dist(p.x, p.y, l.x, l.y) <= radius) l.disabledT = 7;
  }
  host.shake = Math.min(1, host.shake + 0.3);
  host.emit({ type: 'emp', x: p.x, y: p.y, angle: p.angle });
}

export function triggerDeck(host: AbilityHost): void {
  const p = host.player;
  const rank = host.mods.deck;
  if (rank <= 0) return;
  const radius = 360 + rank * 60;
  p.deckCd = (22 - (rank - 1) * 3) * host.mods.abilityCd;
  for (const c of host.cameras) {
    if (c.alive && dist(p.x, p.y, c.x, c.y) <= radius) c.disabledT = 8 + rank;
  }
  for (const t of host.turrets) {
    if (t.alive && dist(p.x, p.y, t.x, t.y) <= radius) t.disabledT = 8 + rank;
  }
  for (const l of host.lasers) {
    if (l.alive && dist(p.x, p.y, l.x, l.y) <= radius) l.disabledT = 8 + rank;
  }
  host.emit({ type: 'deck', x: p.x, y: p.y, angle: p.angle });
}

export function triggerQuickhack(host: AbilityHost): void {
  const p = host.player;
  if (host.mods.deck <= 0) return;
  let target: Enemy | null = null;
  let best = 70;
  for (const e of host.enemies) {
    if (!e.alive || e.kind === 'boss') continue;
    if (dist(p.x, p.y, e.x, e.y) > 520) continue;
    const aimD = dist(e.x, e.y, p.aimX, p.aimY);
    if (aimD >= best) continue;
    if (!host.lineClear(p.x, p.y, e.x, e.y)) continue;
    if (host.smokeBlocks(p.x, p.y, e.x, e.y)) continue;
    target = e;
    best = aimD;
  }
  if (!target) {
    host.emit({ type: 'quickhackFail', x: p.x, y: p.y, angle: p.angle });
    return;
  }
  p.quickhackCd = (10 - (host.mods.deck - 1) * 2) * host.mods.abilityCd;
  host.quickhackFxT = 0.3;
  host.quickhackX = target.x;
  host.quickhackY = target.y;
  target.stunT = Math.max(target.stunT, 1.2 + host.mods.deck * 0.7);
  target.aiming = false;
  target.flashT = 0.25;
  target.hackT = 0;
  if (target.kind === 'netrunner') target.hackCd = 8;
  if (target.kind === 'operator') target.deployCd = 8;
  host.addHeat(3);
  host.emit({ type: 'quickhack', x: target.x, y: target.y, angle: target.angle });
}
