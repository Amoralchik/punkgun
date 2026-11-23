import type { AudioEngine } from '../core/audio';
import type { AbilityFlash } from '../ui/ability-flash';
import type { WorldEvent } from './world-types';

/** Active cyberware audio plus screen wash. */
export class AbilityEventFeedback {
  constructor(
    private readonly audio: AudioEngine,
    private readonly flash: AbilityFlash,
  ) {}

  handle(event: WorldEvent): boolean {
    switch (event.type) {
      case 'sandevistan':
        this.audio.sandevistan();
        this.flash.flash('#5ef1ff');
        return true;
      case 'camo':
        this.audio.camo();
        this.flash.flash('#7dffcf');
        return true;
      case 'emp':
      case 'deck':
        this.audio.emp();
        this.flash.flash('#b38cff');
        return true;
      case 'berserk':
        this.audio.berserk();
        this.flash.flash('#ff7a4c');
        return true;
      case 'overclock':
        this.audio.overclock();
        this.flash.flash('#ff2f8e');
        return true;
      case 'camoBreak':
        this.audio.camoBreak();
        return true;
      default:
        return false;
    }
  }
}
