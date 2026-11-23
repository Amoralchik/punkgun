import type { EndingId } from '../game/endings';
import type { GameState } from '../game/game-state';

export interface KeyboardHooks {
  state: () => GameState;
  toggleMute: () => void;
  isTourOpen: () => boolean;
  closeTour: () => void;
  finishBreach: () => void;
  isDialogueOpen: () => boolean;
  dialogueChoice: (index: number) => string | null;
  cancelDialogue: () => void;
  advanceDialogue: () => void;
  chooseDialogue: (id: string) => void;
  isEpilogue: () => boolean;
  finishEpilogue: () => void;
  isEnding: () => boolean;
  endings: () => EndingId[];
  chooseEnding: (id: EndingId) => void;
  isManualOpen: () => boolean;
  closeManual: () => void;
  pause: () => void;
  resume: () => void;
  isPanelOpen: () => boolean;
  safehouseEscape: () => boolean;
  closePanel: () => void;
  isCaseOpen: () => boolean;
  rotateCase: () => void;
  canOpenDeploy: () => boolean;
  openDeploy: () => void;
  openPanel: () => void;
  quickRetry: () => void;
  returnToSafehouse: () => void;
}

/** Global keyboard routing for overlays, pause, safehouse and run results. */
export class KeyboardController {
  constructor(private readonly hooks: KeyboardHooks) {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (event) => this.handle(event));
    }
  }

  handle(event: KeyboardEvent): void {
    if (event.code === 'KeyM') {
      this.hooks.toggleMute();
      return;
    }
    if (this.hooks.isTourOpen()) {
      if (['Escape', 'Enter', 'Space'].includes(event.code)) {
        event.preventDefault();
        this.hooks.closeTour();
      }
      return;
    }
    const state = this.hooks.state();
    if (state === 'breach') {
      if (event.code === 'Escape') {
        event.preventDefault();
        this.hooks.finishBreach();
      }
      return;
    }
    if (this.hooks.isDialogueOpen()) {
      const choiceIndex = [
        'Digit1',
        'Digit2',
        'Digit3',
        'Digit4',
        'Digit5',
        'Digit6',
        'Digit7',
        'Digit8',
      ].indexOf(event.code);
      if (event.code === 'Escape') {
        event.preventDefault();
        this.hooks.cancelDialogue();
      } else if (choiceIndex >= 0) {
        const choice = this.hooks.dialogueChoice(choiceIndex);
        if (choice) {
          event.preventDefault();
          this.hooks.chooseDialogue(choice);
        }
      } else if (['Enter', 'Space', 'KeyE'].includes(event.code)) {
        event.preventDefault();
        this.hooks.advanceDialogue();
      }
      return;
    }
    if (this.hooks.isEpilogue()) {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.hooks.finishEpilogue();
      }
      return;
    }
    if (this.hooks.isEnding()) {
      const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
      if (index >= 0) {
        event.preventDefault();
        const id = this.hooks.endings()[index];
        if (id) this.hooks.chooseEnding(id);
      }
      return;
    }
    if (this.hooks.isManualOpen()) {
      if (event.code === 'Escape') this.hooks.closeManual();
      return;
    }
    if (state === 'playing') {
      if (event.code === 'Escape') this.hooks.pause();
      return;
    }
    if (state === 'paused') {
      if (event.code === 'Escape') this.hooks.resume();
      return;
    }
    if (state === 'safehouse') {
      if (this.hooks.isPanelOpen()) {
        if (event.code === 'Escape') {
          if (!this.hooks.safehouseEscape()) this.hooks.closePanel();
        } else if (event.code === 'KeyR' && this.hooks.isCaseOpen()) {
          this.hooks.rotateCase();
        } else if (
          event.code === 'Enter' &&
          this.hooks.canOpenDeploy() &&
          !(document.activeElement instanceof HTMLButtonElement)
        ) {
          this.hooks.openDeploy();
        }
        return;
      }
      if (event.code === 'Tab') {
        event.preventDefault();
        this.hooks.openPanel();
      }
      return;
    }
    if (state === 'dead') {
      if (event.code === 'KeyR') this.hooks.quickRetry();
      else if (event.code === 'Space' || event.code === 'Enter') this.hooks.returnToSafehouse();
      return;
    }
    if (state === 'win') {
      if (event.code === 'KeyR' || event.code === 'Enter' || event.code === 'Space') {
        this.hooks.returnToSafehouse();
      }
    }
  }
}
