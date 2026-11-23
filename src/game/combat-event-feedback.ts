import type { AudioEngine } from '../core/audio';
import { t } from '../core/i18n';
import type { Hud } from '../ui/hud';
import type { Profile } from './profile';
import type { World } from './world';
import type { WorldEvent } from './world-types';

/** Combat feedback that does not change run state. */
export class CombatEventFeedback {
  constructor(
    private readonly audio: AudioEngine,
    private readonly hud: Hud,
    private readonly profile: Profile,
    private readonly world: () => World,
  ) {}

  handle(event: WorldEvent): boolean {
    switch (event.type) {
      case 'kill':
        this.audio.kill();
        this.audio.combo(this.world().combo);
        this.addSalvage();
        return true;
      case 'stealthKill':
        this.audio.stealthKill();
        this.audio.combo(this.world().combo);
        this.addSalvage();
        return true;
      case 'execution':
        this.audio.execution();
        this.hud.subtitle(t('event.execution'));
        this.hud.logLine('EXECUTION: stunned hostile finished');
        return true;
      case 'armorHit':
        this.audio.armorHit();
        this.hud.flashDamage('armor');
        this.hud.damageDirection(event.angle + Math.PI);
        return true;
      default:
        return false;
    }
  }

  private addSalvage(): void {
    const chance = this.profile.data.perks.scavenger * 0.25;
    this.profile.addComponent(Math.random() < chance ? 2 : 1);
  }
}
