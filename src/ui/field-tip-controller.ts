import { t } from '../core/i18n';
import type { Settings } from '../core/settings';
import type { Hud } from '../ui/hud';
import { isGun } from '../game/weapons';
import type { World } from '../game/world';
import type { WorldEvent } from '../game/world-types';
import { FIELD_TIP_IDS, FIELD_TIP_KEYS, pickFieldTip } from '../game/field-tips';

/** First-use combat tips. Seen state lives in Settings so tips do not repeat. */
export class FieldTipController {
  private elapsed = 0;
  private armorHit = false;
  private cooldown = 0;

  constructor(
    private readonly settings: Settings,
    private readonly hud: Hud,
  ) {}

  reset(): void {
    this.elapsed = 0;
    this.armorHit = false;
    this.cooldown = 0;
    this.hud.hideTip();
  }

  observe(event: WorldEvent): void {
    if (event.type === 'armorHit') this.armorHit = true;
  }

  tick(world: World, dt: number, active: boolean): void {
    if (!active) return;
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.settings.data.fieldTips || this.cooldown > 0) return;
    const seen = this.settings.data.fieldTipsSeen;
    if (FIELD_TIP_IDS.every((id) => seen.includes(id))) return;
    const player = world.player;
    const id = pickFieldTip(
      {
        deployedFor: this.elapsed,
        armorHit: this.armorHit,
        reloadNeeded:
          !seen.includes('reload') &&
          isGun(player.weapon) &&
          player.clip <= 0 &&
          player.ammo > 0 &&
          player.reloadT <= 0,
        executeReady:
          !seen.includes('execute') && world.promptText() === 'E — EXECUTE',
      },
      seen,
    );
    if (!id) return;
    this.hud.showTip(t(FIELD_TIP_KEYS[id]));
    this.settings.set('fieldTipsSeen', [...seen, id]);
    this.armorHit = false;
    this.cooldown = 6;
  }
}
