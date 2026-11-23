/** Brief screen wash when active cyberware fires. */
export class AbilityFlash {
  private readonly root = document.getElementById('ability-flash')!;
  private timer: number | null = null;

  flash(color: string): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.root.style.setProperty('--ability-color', color);
    this.root.classList.remove('hidden', 'show');
    void this.root.offsetWidth;
    this.root.classList.add('show');
    this.timer = window.setTimeout(() => this.hide(), 360);
  }

  hide(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.root.classList.add('hidden');
    this.root.classList.remove('show');
  }
}
