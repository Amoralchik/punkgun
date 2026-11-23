import type { Input } from '../core/input';
import type { Player } from './world-types';
import type { RunMods } from './progression';

export const PLAYER_SPEED = 252;

export interface PlayerInputAxes {
  x: number;
  y: number;
}

/** Aim at the mouse point when it is meaningfully away from the body. */
export function aimPlayer(player: Player, aimX: number, aimY: number): void {
  const dx = aimX - player.x;
  const dy = aimY - player.y;
  if (dx * dx + dy * dy > 16) player.angle = Math.atan2(dy, dx);
}

export function tickPlayerCooldowns(player: Player, dt: number): void {
  player.attackCd = Math.max(0, player.attackCd - dt);
  player.flashT = Math.max(0, player.flashT - dt);
  player.invulnT = Math.max(0, player.invulnT - dt);
  player.slowT = Math.max(0, player.slowT - dt);
  player.slowCd = Math.max(0, player.slowCd - dt);
  player.camoT = Math.max(0, player.camoT - dt);
  player.camoCloakCd = Math.max(0, player.camoCloakCd - dt);
  player.empCd = Math.max(0, player.empCd - dt);
  player.berserkT = Math.max(0, player.berserkT - dt);
  player.berserkCd = Math.max(0, player.berserkCd - dt);
  player.overclockT = Math.max(0, player.overclockT - dt);
  player.overclockCd = Math.max(0, player.overclockCd - dt);
  player.deckCd = Math.max(0, player.deckCd - dt);
  player.kerenCd = Math.max(0, player.kerenCd - dt);
  player.killSpeedT = Math.max(0, player.killSpeedT - dt);
  player.hackedT = Math.max(0, player.hackedT - dt);
  player.dashT = Math.max(0, player.dashT - dt);
  player.dashCd = Math.max(0, player.dashCd - dt);
  player.quickhackCd = Math.max(0, player.quickhackCd - dt);
}

export function movementAxes(input: Input): PlayerInputAxes {
  let x = 0;
  let y = 0;
  if (input.held('KeyA') || input.held('ArrowLeft')) x -= 1;
  if (input.held('KeyD') || input.held('ArrowRight')) x += 1;
  if (input.held('KeyS') || input.held('ArrowDown')) y -= 1;
  if (input.held('KeyW') || input.held('ArrowUp')) y += 1;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

export function playerMoveSpeed(mods: RunMods, player: Player): number {
  return (
    PLAYER_SPEED *
    mods.speed *
    (player.berserkT > 0 ? 1.3 : 1) *
    (1 + (player.killSpeedT > 0 ? mods.killSpeed : 0)) *
    (player.armor <= 0 ? 1 + mods.lowArmorSpeed : 1)
  );
}

/** Dash direction from movement keys, falling back to aim. */
export function dashDirection(input: Input, player: Player): PlayerInputAxes {
  const axes = movementAxes(input);
  if (axes.x !== 0 || axes.y !== 0) return axes;
  return { x: Math.cos(player.angle), y: Math.sin(player.angle) };
}
