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
      case 'quickhack':
        this.audio.quickhack();
        this.hud.subtitle(t('event.quickhack'));
        this.hud.logLine('QUICKHACK: target rebooted');
        return true;
      case 'quickhackFail':
        this.audio.quickhackFail();
        this.hud.subtitle(t('event.quickhackFail'), 1600);
        return true;
      case 'medicHeal':
        this.audio.medicHeal();
        this.hud.logLine('MEDIC: ally plate restored');
        return true;
      case 'flash':
        this.audio.flash();
        this.hud.flashDamage('flash');
        return true;
      case 'kerenzikov':
        this.audio.kerenzikov();
        this.hud.subtitle(t('event.kerenzikov'));
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
      case 'netrunnerChannel':
        this.hud.subtitle(t('event.netrunnerChannel'), 2200);
        this.hud.logLine('NETRUNNER: channeling hack');
        return true;
      case 'bossCharge':
        this.hud.subtitle(t('event.bossCharge'), 1800);
        this.hud.logLine('BOSS: charging');
        return true;
      case 'sabotage':
        this.hud.subtitle(t('event.sabotage'));
        this.hud.logLine('SABOTAGE: terminal tapped');
        return true;
      case 'caseSecured':
        this.hud.subtitle(t('event.caseSecured'));
        this.hud.logLine('EXTRACTION: case secured');
        return true;
      case 'caseHeavy':
        this.hud.subtitle(t('event.caseHeavy'), 1200);
        return true;
      case 'civilianDown':
        this.audio.alert();
        this.hud.subtitle(t('event.civilianDown'), 1600);
        this.hud.logLine(`COLLATERAL: ${event.count ?? 1}`);
        return true;
      case 'exitDefended':
        this.audio.alert();
        this.hud.subtitle(t('event.exitDefended'), 2200);
        this.hud.logLine('EXTRACTION: exit held');
        return true;
      case 'objectiveComplete':
        this.hud.subtitle(t('event.objectiveComplete'));
        this.hud.logLine('OBJECTIVE: complete');
        return true;
      case 'networkUnlock':
        this.hud.subtitle(`NETWORK UNLOCKED — ${event.count ?? 0} SAFE${event.count === 1 ? '' : 'S'} OPEN`);
        this.hud.logLine('BREACH: network safes opened');
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
