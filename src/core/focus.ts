/**
 * Keyboard/focus helpers shared by input collection and overlay navigation.
 * Kept DOM-shape tolerant so the decision rules are unit-testable without a DOM.
 */

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Player-facing keys whose browser default (scrolling/page action) must not run. */
export const DEFAULT_SCROLL_KEYS: Partial<Record<string, true>> = {
  Space: true,
  ArrowUp: true,
  ArrowDown: true,
  ArrowLeft: true,
  ArrowRight: true,
};

interface ElementLike {
  tagName?: unknown;
  isContentEditable?: unknown;
  closest?: (selector: string) => unknown;
}

export function elementTarget(target: EventTarget | null): ElementLike | null {
  if (!target || typeof target !== 'object') return null;
  const candidate = target as ElementLike;
  return typeof candidate.closest === 'function' ? candidate : null;
}

/** True while the user is typing or operating a native form control. */
export function isFormTarget(target: EventTarget | null): boolean {
  const element = elementTarget(target);
  if (!element) return false;
  const tag = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
  if (element.isContentEditable === true) return true;
  return Boolean(element.closest?.('[contenteditable="true"]'));
}

/** True for native controls that own Space/Enter activation. */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  const element = elementTarget(target);
  if (!element) return false;
  if (isFormTarget(element as unknown as EventTarget)) return true;
  const tag = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : '';
  if (tag === 'BUTTON' || tag === 'A') return true;
  return Boolean(
    element.closest?.('button, a[href], [role="button"], [tabindex]:not([tabindex="-1"])'),
  );
}

/** True for focus left inside a dismissed overlay. */
export function isHiddenOverlayTarget(target: EventTarget | null): boolean {
  const element = elementTarget(target);
  return Boolean(element?.closest?.('.overlay.hidden'));
}

export function nextFocusIndex(index: number, count: number, backwards = false): number {
  if (count <= 0) return -1;
  if (index < 0) return backwards ? count - 1 : 0;
  const step = backwards ? -1 : 1;
  return (index + step + count) % count;
}

/** Focusable elements that are actually reachable in the current overlay state. */
export function visibleFocusables(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.closest('.hidden') &&
      element.getClientRects().length > 0 &&
      window.getComputedStyle(element).visibility !== 'hidden',
  );
}

/** Tabbable set for the top-most visible overlay, if any. */
export function topVisibleOverlay(): HTMLElement | null {
  const overlays = Array.from(document.querySelectorAll<HTMLElement>('.overlay:not(.hidden)'));
  return overlays.at(-1) ?? null;
}
