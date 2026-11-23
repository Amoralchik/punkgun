import { describe, expect, it, vi, type Mock } from 'vitest';
import { KeyboardController, type KeyboardHooks } from './keyboard-controller';

function hooks(
  state: 'playing' | 'paused' | 'dead' | 'safehouse' = 'playing',
  overrides: Partial<KeyboardHooks> = {},
) {
  const h = {
    state: () => state,
    toggleMute: vi.fn(),
    isTourOpen: () => false,
    closeTour: vi.fn(),
    tourNext: vi.fn(),
    tourPrev: vi.fn(),
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
    ...overrides,
  } as unknown as KeyboardHooks;
  return h;
}

interface KeyPress {
  event: KeyboardEvent;
  preventDefault: Mock;
}

function key(
  code: string,
  options: { target?: unknown; shiftKey?: boolean; repeat?: boolean } = {},
): KeyPress {
  const preventDefault = vi.fn();
  const event = {
    code,
    preventDefault,
    shiftKey: false,
    repeat: false,
    target: options.target,
    ...options,
  } as unknown as KeyboardEvent;
  return { event, preventDefault };
}

const button = { tagName: 'BUTTON', closest: () => null };
const input = { tagName: 'INPUT', closest: () => null };
const body = { tagName: 'BODY', closest: () => null };

describe('keyboard controller', () => {
  it('routes mute, pause/resume and death retry', () => {
    const h = hooks('playing');
    const controller = new KeyboardController(h);
    controller.handle(key('KeyM').event);
    expect(h.toggleMute).toHaveBeenCalled();
    controller.handle(key('Escape').event);
    expect(h.pause).toHaveBeenCalled();
    const paused = hooks('paused');
    new KeyboardController(paused).handle(key('Escape').event);
    expect(paused.resume).toHaveBeenCalled();
    const dead = hooks('dead');
    new KeyboardController(dead).handle(key('KeyR').event);
    expect(dead.quickRetry).toHaveBeenCalled();
  });

  it('leaves form controls and native activation alone', () => {
    const h = hooks('paused');
    const controller = new KeyboardController(h);
    controller.handle(key('KeyM', { target: input }).event);
    expect(h.toggleMute).not.toHaveBeenCalled();
    const dead = hooks('dead');
    const deadController = new KeyboardController(dead);
    deadController.handle(key('Space', { target: button }).event);
    expect(dead.returnToSafehouse).not.toHaveBeenCalled();
    const space = key('Space', { target: body });
    deadController.handle(space.event);
    expect(dead.returnToSafehouse).toHaveBeenCalled();
    expect(space.preventDefault).not.toHaveBeenCalled();
  });

  it('keeps Tab native inside a panel but opens the terminal from free roam', () => {
    const panel = hooks('safehouse', { isPanelOpen: () => true });
    const panelTab = key('Tab', { target: button });
    new KeyboardController(panel).handle(panelTab.event);
    expect(panel.openPanel).not.toHaveBeenCalled();
    expect(panelTab.preventDefault).not.toHaveBeenCalled();

    const free = hooks('safehouse');
    const freeTab = key('Tab', { target: body });
    new KeyboardController(free).handle(freeTab.event);
    expect(free.openPanel).toHaveBeenCalled();
    expect(freeTab.preventDefault).toHaveBeenCalled();
  });

  it('advances and retreats the tour without stealing native Enter/Space', () => {
    const h = hooks('paused', { isTourOpen: () => true });
    const controller = new KeyboardController(h);
    controller.handle(key('ArrowRight').event);
    expect(h.tourNext).toHaveBeenCalled();
    controller.handle(key('ArrowLeft').event);
    expect(h.tourPrev).toHaveBeenCalled();
    controller.handle(key('Space', { target: button }).event);
    expect(h.closeTour).not.toHaveBeenCalled();
    controller.handle(key('Escape').event);
    expect(h.closeTour).toHaveBeenCalled();
  });

  it('ignores auto-repeat so held global keys do not toggle', () => {
    const h = hooks('playing');
    new KeyboardController(h).handle(key('KeyM', { repeat: true }).event);
    expect(h.toggleMute).not.toHaveBeenCalled();
  });
});
