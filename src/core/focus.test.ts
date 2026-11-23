import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCROLL_KEYS,
  isFormTarget,
  isHiddenOverlayTarget,
  isInteractiveTarget,
  nextFocusIndex,
} from './focus';

interface TargetShape {
  tagName?: string;
  isContentEditable?: boolean;
  closest?: (selector: string) => unknown;
}

function target(shape: TargetShape): EventTarget {
  return shape as unknown as EventTarget;
}

describe('focus helpers', () => {
  it('classifies native form controls and typing surfaces', () => {
    expect(isFormTarget(target({ tagName: 'INPUT', closest: () => null }))).toBe(true);
    expect(isFormTarget(target({ tagName: 'TEXTAREA', closest: () => null }))).toBe(true);
    expect(isFormTarget(target({ tagName: 'SELECT', closest: () => null }))).toBe(true);
    expect(
      isFormTarget(target({ tagName: 'DIV', isContentEditable: true, closest: () => null })),
    ).toBe(true);
    expect(isFormTarget(target({ tagName: 'BODY', closest: () => null }))).toBe(false);
  });

  it('treats buttons and custom controls as interactive but not typing surfaces', () => {
    expect(isInteractiveTarget(target({ tagName: 'BUTTON', closest: () => null }))).toBe(true);
    expect(isInteractiveTarget(target({ tagName: 'A', closest: () => null }))).toBe(true);
    expect(
      isInteractiveTarget(
        target({ tagName: 'DIV', closest: (selector) => (selector.includes('button') ? {} : null) }),
      ),
    ).toBe(true);
    expect(isInteractiveTarget(target({ tagName: 'BODY', closest: () => null }))).toBe(false);
    expect(isFormTarget(target({ tagName: 'BUTTON', closest: () => null }))).toBe(false);
  });

  it('cycles focus indices in both directions', () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1);
    expect(nextFocusIndex(2, 3, false)).toBe(0);
    expect(nextFocusIndex(0, 3, true)).toBe(2);
    expect(nextFocusIndex(-1, 3, false)).toBe(0);
    expect(nextFocusIndex(-1, 3, true)).toBe(2);
    expect(nextFocusIndex(0, 0)).toBe(-1);
  });

  it('detects focus stranded inside a dismissed overlay', () => {
    expect(
      isHiddenOverlayTarget(
        target({ tagName: 'BUTTON', closest: (selector) => (selector === '.overlay.hidden' ? {} : null) }),
      ),
    ).toBe(true);
    expect(isHiddenOverlayTarget(target({ tagName: 'BUTTON', closest: () => null }))).toBe(false);
  });

  it('only guards page-level defaults for gameplay keys', () => {
    expect(DEFAULT_SCROLL_KEYS.Space).toBe(true);
    expect(DEFAULT_SCROLL_KEYS.Tab).toBeUndefined();
  });
});
