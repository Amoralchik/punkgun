import type { Input } from '../core/input';
import {
  nextFocusIndex,
  topVisibleOverlay,
  visibleFocusables,
} from '../core/focus';

/**
 * Gamepad focus traversal plus keyboard focus containment for visible overlays.
 * Native Tab is preserved for ordinary controls; containment only makes sure
 * focus cannot escape the top-most modal into hidden UI.
 */
export class MenuNavigation {
  private wasOpen = false;

  constructor(
    private readonly input: Input,
    private readonly isOpen: () => boolean,
    private readonly onBack: () => void,
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (event) => this.handleKey(event));
    }
  }

  /** Focus the first reachable control of the current top overlay. */
  focusTop(): void {
    const root = topVisibleOverlay();
    if (!root) return;
    visibleFocusables(root)[0]?.focus();
  }

  poll(): void {
    const open = this.isOpen();
    if (!open) {
      if (this.wasOpen) {
        const active = document.activeElement as HTMLElement | null;
        if (active && active.closest('.overlay.hidden')) active.blur();
      }
      this.wasOpen = false;
      return;
    }
    const root = topVisibleOverlay();
    if (!root) return;
    const active = document.activeElement as HTMLElement | null;
    const inside = Boolean(active && root.contains(active));
    if (!this.wasOpen) {
      this.wasOpen = true;
      if (!inside) visibleFocusables(root)[0]?.focus();
      return;
    }
    if (inside) {
      const down =
        this.input.wasPressed('MenuDown') || this.input.wasPressed('MenuRight');
      const up = this.input.wasPressed('MenuUp') || this.input.wasPressed('MenuLeft');
      const accept = this.input.wasPressed('MenuAccept');
      const back = this.input.wasPressed('MenuBack');
      if (!down && !up && !accept && !back) return;
    }
    const items = visibleFocusables(root);
    if (items.length === 0) return;
    if (!inside) {
      items[0].focus();
      return;
    }
    const index = items.indexOf(active as HTMLElement);
    if (this.input.wasPressed('MenuDown') || this.input.wasPressed('MenuRight')) {
      items[nextFocusIndex(index, items.length, false)].focus();
    } else if (this.input.wasPressed('MenuUp') || this.input.wasPressed('MenuLeft')) {
      items[nextFocusIndex(index, items.length, true)].focus();
    } else if (this.input.wasPressed('MenuAccept')) {
      active!.click();
    } else if (this.input.wasPressed('MenuBack')) {
      this.onBack();
    }
  }

  private handleKey(event: KeyboardEvent): void {
    if (event.code !== 'Tab' || !this.isOpen()) return;
    const root = topVisibleOverlay();
    if (!root) return;
    const items = visibleFocusables(root);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const active = document.activeElement as HTMLElement | null;
    const index = active ? items.indexOf(active) : -1;
    items[nextFocusIndex(index, items.length, event.shiftKey)].focus();
  }
}
