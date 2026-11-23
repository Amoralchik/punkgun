/** Full-screen pulse when a boss plate shatters. */
export class BossPhaseOverlay {
  private readonly root = document.getElementById('boss-phase')!;
  private timer: number | null = null;

  flash(label = 'PHASE SHIFT'): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.root.dataset.label = label;
    this.root.classList.remove('hidden', 'show');
    void this.root.offsetWidth;
    this.root.classList.add('show');
    this.timer = window.setTimeout(() => this.hide(), 720);
  }

  hide(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.root.classList.add('hidden');
    this.root.classList.remove('show');
  }
}
