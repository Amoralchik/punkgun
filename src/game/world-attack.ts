import type { RunMods } from './progression';
import { ATTACHMENT_MAP, attachmentPellets } from './attachments';
import { NAMED_MAP, WEAPONS, type GunId } from './weapons';
import { SWING_DURATION } from './world-player';
import type { Bullet, Player, WorldEvent } from './world-types';

/** What a player attack needs from the world. */
export interface PlayerAttackHost {
  player: Player;
  bullets: Bullet[];
  mods: RunMods;
  shotsFired: number;
  shake: number;
  rand(): number;
  emit(event: WorldEvent): void;
  resolveCircle(entity: { x: number; y: number; r: number }): void;
  addCasing(x: number, y: number, angle: number): void;
  alertAt(x: number, y: number, radius: number): void;
  addHeat(amount: number): void;
}

/** Player melee or gunshot for the current trigger pull. */
export function playerAttack(host: PlayerAttackHost): void {
  const p = host.player;
  if (p.attackCd > 0) return;
  if (p.reloadT > 0) return;
  if (p.camoT > 0) {
    p.camoT = 0;
    host.emit({ type: 'camoBreak', x: p.x, y: p.y, angle: p.angle });
  }
  const def = WEAPONS[p.weapon];

  if (def.melee) {
    p.attackCd = def.cooldown * host.mods.meleeCooldown;
    p.swingT = SWING_DURATION;
    p.swingHit = false;
    const dashX = Math.cos(p.angle) * 13;
    const dashY = Math.sin(p.angle) * 13;
    p.x += dashX;
    host.resolveCircle(p);
    p.y += dashY;
    host.resolveCircle(p);
    host.emit({ type: 'swing', x: p.x, y: p.y, angle: p.angle });
    if (p.weapon === 'bat') host.alertAt(p.x, p.y, 190);
    host.shake = Math.min(1, host.shake + def.shake);
    return;
  }

  if (p.clip <= 0) {
    p.attackCd = 0.24;
    host.emit({ type: 'empty', x: p.x, y: p.y, angle: p.angle });
    return;
  }

  p.clip--;
  host.shotsFired++;
  const shotgun = p.weapon === 'shotgun';
  const suppressed = p.attachment === 'suppressor';
  const attachment = p.attachment ? ATTACHMENT_MAP[p.attachment] : null;
  const shotHeat =
    def.sound === 'lmg'
      ? 11
      : def.sound === 'rifle'
        ? 9
        : def.sound === 'ak'
          ? 8
          : shotgun
            ? 16
            : def.sound === 'railgun'
              ? 13
              : def.sound === 'plasma'
                ? 10
                : 7;
  const alertRadius =
    def.sound === 'lmg'
      ? 1180
      : def.sound === 'rifle'
        ? 980
        : def.sound === 'ak'
          ? 860
          : shotgun
            ? 900
            : def.sound === 'railgun'
              ? 1250
              : def.sound === 'plasma'
                ? 950
                : 760;
  host.addHeat(shotHeat * (attachment?.heatMult ?? 1));
  p.attackCd =
    def.cooldown *
    host.mods.gunCooldown *
    (attachment?.cooldownMult ?? 1) *
    (p.overclockT > 0 ? 0.65 : 1);
  p.flashT = 0.06;
  // Recoil knocks the aim off a little; follow-ups must re-steady.
  p.steady = Math.max(0, (p.steady ?? 0) - 0.22);
  const variantSpread = p.variant ? NAMED_MAP[p.variant].spreadMult : 1;
  const precision =
    def.family === 'RIFLE' || def.family === 'DMR' || def.family === 'RAILGUN';
  const overclockSpread = p.overclockT > 0 ? 0.8 : 1;
  // Plant-and-shoot: a steadied gun groups tight, a gun on the move sprays.
  const steadySpread = 1.45 - (p.steady ?? 0) * 0.95;
  const muzzleX = p.x + Math.cos(p.angle) * 26;
  const muzzleY = p.y + Math.sin(p.angle) * 26;

  const pellets = attachmentPellets(p.weapon as GunId, p.attachment);
  for (let i = 0; i < pellets; i++) {
    const a =
      p.angle +
      (host.rand() * 2 - 1) *
        def.spread *
        host.mods.spread *
        (precision ? host.mods.precisionSpread : 1) *
        overclockSpread *
        steadySpread *
        variantSpread *
        (attachment?.spreadMult ?? 1);
    host.bullets.push({
      x: muzzleX,
      y: muzzleY,
      px: muzzleX,
      py: muzzleY,
      vx: Math.cos(a) * def.speed,
      vy: Math.sin(a) * def.speed,
      life: 1.1,
      ownerId: p.id,
      ownerKind: 'player',
      pierce: def.pierce + host.mods.pierce + (attachment?.pierceBonus ?? 0),
    });
  }

  p.vx -= Math.cos(p.angle) * 85;
  p.vy -= Math.sin(p.angle) * 85;
  host.shake = Math.min(1, host.shake + def.shake);
  const soundType =
    def.sound === 'pistol'
      ? 'pistol'
      : def.sound === 'shotgun'
        ? 'shotgun'
        : (`shot-${def.sound}` as const);
  host.addCasing(muzzleX, muzzleY, p.angle);
  host.emit({
    type: suppressed ? (shotgun ? 'suppressedShotgun' : 'suppressedShot') : soundType,
    x: muzzleX,
    y: muzzleY,
    angle: p.angle,
  });
  host.alertAt(p.x, p.y, alertRadius * (attachment?.alertMult ?? 1));
}
