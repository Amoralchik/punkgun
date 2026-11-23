import { describe, expect, it, vi } from 'vitest';
import { KeyboardController, type KeyboardHooks } from './keyboard-controller';

function hooks(state: 'playing' | 'paused' | 'dead' = 'playing') {
  const h = {
    state: () => state,
    toggleMute: vi.fn(),
    isTourOpen: () => false,
    closeTour: vi.fn(),
    finishBreach: vi.fn(),
    isDialogueOpen: () => false,
    dialogueChoice: () => null,
    cancelDialogue: vi.fn(),
    advanceDialogue: vi.fn(),
    chooseDialogue: vi.fn(),
    isEpilogue: () => false,
    finishEpilogue: vi.fn(),
    isEnding: () => false,
    endings: () => [],
    chooseEnding: vi.fn(),
    isManualOpen: () => false,
    closeManual: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isPanelOpen: () => false,
    safehouseEscape: () => false,
    closePanel: vi.fn(),
    isCaseOpen: () => false,
    rotateCase: vi.fn(),
    canOpenDeploy: () => true,
    openDeploy: vi.fn(),
    openPanel: vi.fn(),
    quickRetry: vi.fn(),
    returnToSafehouse: vi.fn(),
  } as unknown as KeyboardHooks;
  return h;
}

function key(code: string) {
  return { code, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

describe('keyboard controller', () => {
  it('routes mute, pause/resume and death retry', () => {
    const h = hooks('playing');
    const controller = new KeyboardController(h);
    controller.handle(key('KeyM'));
    expect(h.toggleMute).toHaveBeenCalled();
    controller.handle(key('Escape'));
    expect(h.pause).toHaveBeenCalled();
    const paused = hooks('paused');
    new KeyboardController(paused).handle(key('Escape'));
    expect(paused.resume).toHaveBeenCalled();
    const dead = hooks('dead');
    new KeyboardController(dead).handle(key('KeyR'));
    expect(dead.quickRetry).toHaveBeenCalled();
  });
});
