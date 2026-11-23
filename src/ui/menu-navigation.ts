import type { Input } from '../core/input';

/** Gamepad focus traversal for visible overlays. */
export class MenuNavigation {
  constructor(
    private readonly input: Input,
    private readonly isOpen: () => boolean,
    private readonly onBack: () => void,
  ) {}

  poll(): void {
    if (!this.isOpen()) return;
    const overlays = Array.from(
      document.querySelectorAll<HTMLElement>('.overlay:not(.hidden)'),
    );
    const root = overlays.at(-1);
    if (!root) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled])',
      ),
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    let index = active ? items.indexOf(active) : -1;
    if (index < 0) {
      items[0].focus();
      index = 0;
    }
    if (this.input.wasPressed('MenuDown') || this.input.wasPressed('MenuRight')) {
      items[(index + 1) % items.length].focus();
    } else if (this.input.wasPressed('MenuUp') || this.input.wasPressed('MenuLeft')) {
      items[(index - 1 + items.length) % items.length].focus();
    } else if (this.input.wasPressed('MenuAccept')) {
      if (active && root.contains(active)) active.click();
      else items[0].click();
    } else if (this.input.wasPressed('MenuBack')) {
      this.onBack();
    }
  }
}
