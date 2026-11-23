import type { AudioEngine } from '../core/audio';
import type { Renderer } from '../render/renderer';
import type { Hud } from '../ui/hud';
import { APPROACH_MAP, type ApproachId } from './attributes';
import { CONSUMABLE_MAP } from './consumables';
import type { Contract } from './missions';
import type { Profile } from './profile';
import { WEAPONS } from './weapons';
import type { World } from './world';

export interface HudSyncContext {
  state: 'playing' | 'paused' | 'breach' | 'dead' | 'win';
  world: World;
  profile: Profile;
  contract: Contract | null;
  approach: ApproachId;
  mouseX: number;
  mouseY: number;
  lastShotsHit: number;
  lastKills: number;
  hud: Hud;
  renderer: Renderer;
  audio: AudioEngine;
  setVignettePoint: (x: number, y: number) => void;
}

/** Per-frame HUD projection from world/profile state. */
export function syncHud(ctx: HudSyncContext): { lastShotsHit: number; lastKills: number } {
  const { world, hud, profile, contract, state } = ctx;
  const p = world.player;
  hud.setStats(
    world.aliveEnemies,
    p.weapon,
    p.variant,
    p.attachment,
    p.clip,
    p.ammo,
    p.reloadT > 0,
    world.time,
    world.lootValue,
    p.armor,
    p.maxArmor,
    world.exitOpen,
    state === 'playing' ? world.promptText() : null,
  );
  hud.setHacked(p.hackedT > 0);
  hud.setObjective(contract?.title ?? 'OBJECTIVE', world.objectiveText(), world.exitOpen);
  const supply = p.supplyType
    ? `${CONSUMABLE_MAP[p.supplyType].name} ×${p.supplyCharges}`
    : '';
  hud.setConsumable(supply, !!p.supplyType && p.supplyCharges > 0);
  const boss = world.boss;
  hud.setBoss(
    world.bossName,
    boss?.armor ?? 0,
    boss?.maxArmor ?? 0,
    !!boss && boss.alive && state === 'playing',
    boss ? Math.max(1, boss.maxArmor - boss.armor + 1) : 1,
  );
  let { lastShotsHit, lastKills } = ctx;
  if (world.shotsHit > lastShotsHit || world.kills > lastKills) {
    hud.hitmarker(world.kills > lastKills);
    lastShotsHit = world.shotsHit;
    lastKills = world.kills;
  }
  const approach = APPROACH_MAP[ctx.approach];
  if (approach.id === 'blackout') {
    const screen = ctx.renderer.worldToScreen(p.x, p.y);
    ctx.setVignettePoint(screen.x, screen.y);
  }
  hud.setApproach(approach.id === 'standard' ? '' : approach.name, approach.color);
  hud.setHeat(world.heat);
  ctx.audio.setIntensity(world.heat / 100);
  hud.setAbilities(world.abilitySlots());
  hud.setCombo(world.combo, world.comboT, world.comboMax);
  hud.setPsychosis(profile.humanityStage, profile.humanityInfo().label);
  const spread =
    1 +
    Math.min(
      0.38,
      (p.attackCd > 0 ? p.attackCd * 0.9 : 0) + WEAPONS[p.weapon].spread * 1.8,
    );
  hud.crosshairAt(ctx.mouseX, ctx.mouseY, state === 'playing', spread);
  const ex = world.level.exit.x - p.x;
  const ey = world.level.exit.y - p.y;
  const exitDeg = 90 - (Math.atan2(ey, ex) * 180) / Math.PI;
  hud.exitPointer(
    exitDeg,
    Math.round(Math.hypot(ex, ey) / 64),
    world.exitOpen && state === 'playing' && p.alive,
  );
  return { lastShotsHit, lastKills };
}
