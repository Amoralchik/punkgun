import type { AudioEngine } from '../core/audio';
import { t } from '../core/i18n';
import type { Hud } from '../ui/hud';
import type { WorldEvent } from './world-types';

/** HUD/audio events that do not change run state. */
export class WorldEventHud {
  constructor(
    private readonly hud: Hud,
    private readonly audio: AudioEngine,
  ) {}

  handle(event: WorldEvent): boolean {
    switch (event.type) {
      case 'secondHeart':
        this.audio.secondHeart();
        this.hud.flashDamage('armor');
        this.hud.subtitle(t('event.secondHeart'));
        this.hud.logLine('SECOND HEART: survived lethal hit');
        return true;
      case 'doorLocked':
        this.audio.uiError();
        this.hud.logLine('DOOR SEALED — KICK TO BREACH');
        return true;
      case 'breachSuccess':
        this.hud.subtitle('BREACH COMPLETE — SECURITY LOOPED');
        this.hud.logLine('BREACH: security looped');
        this.audio.win();
        return true;
      case 'breachFail':
        this.hud.subtitle('BREACH FAILED — SECTOR ALERTED');
        this.hud.logLine('BREACH: failed');
        this.audio.uiError();
        return true;
      case 'netrunnerHack':
        this.audio.uiError();
        this.hud.subtitle(t('event.netrunnerHack'), 3200);
        this.hud.logLine('NETRUNNER: hack landed');
        return true;
      case 'sabotage':
        this.hud.subtitle(t('event.sabotage'));
        this.hud.logLine('SABOTAGE: terminal tapped');
        return true;
      case 'caseSecured':
        this.hud.subtitle(t('event.caseSecured'));
        this.hud.logLine('EXTRACTION: case secured');
        return true;
      case 'objectiveComplete':
        this.hud.subtitle(t('event.objectiveComplete'));
        this.hud.logLine('OBJECTIVE: complete');
        return true;
      case 'exitOpen':
        this.audio.exitOpen();
        this.hud.subtitle(t('event.exitOpen'));
        this.hud.logLine('EXIT: open');
        return true;
      default:
        return false;
    }
  }
}
