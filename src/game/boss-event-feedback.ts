import type { AudioEngine } from '../core/audio';
import { t } from '../core/i18n';
import type { BossIntro } from '../ui/boss-intro';
import type { BossPhaseOverlay } from '../ui/boss-phase';
import type { Hud } from '../ui/hud';
import type { WorldEvent } from './world-types';

/** Boss-specific presentation events. */
export class BossEventFeedback {
  constructor(
    private readonly audio: AudioEngine,
    private readonly hud: Hud,
    private readonly phase: BossPhaseOverlay,
    private readonly intro: BossIntro,
    private readonly bossName: () => string,
  ) {}

  handle(event: WorldEvent): boolean {
    if (event.type === 'bossPhase') {
      this.phase.flash('ARMOR PLATE SHATTERED');
      this.audio.bossPhase();
      this.hud.subtitle(t('event.bossPhase'));
      this.hud.logLine('BOSS: plate shattered');
      return true;
    }
    if (event.type === 'bossRushWave') {
      const name = this.bossName();
      this.intro.show('// NEXT BOSS', name, `WAVE ${event.wave}/${event.total}`);
      this.audio.alert();
      this.audio.setBossMode(true);
      this.hud.subtitle(`BOSS RUSH ${event.wave}/${event.total} — ${name}`, 4000);
      this.hud.logLine(`BOSS RUSH: wave ${event.wave}/${event.total} — ${name}`);
      return true;
    }
    return false;
  }
}
