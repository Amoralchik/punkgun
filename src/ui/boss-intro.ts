/** Center-screen boss encounter card. */
export class BossIntro {
  private readonly root = document.getElementById('boss-intro')!;
  private readonly kicker = document.getElementById('boss-intro-kicker')!;
  private readonly name = document.getElementById('boss-intro-name')!;
  private readonly sub = document.getElementById('boss-intro-sub')!;
  private timer: number | null = null;

  show(kicker: string, name: string, sub: string): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.kicker.textContent = kicker;
    this.name.textContent = name;
    this.sub.textContent = sub;
    this.root.classList.remove('hidden');
    this.root.classList.remove('show');
    void this.root.offsetWidth;
    this.root.classList.add('show');
    this.timer = window.setTimeout(() => this.hide(), 2600);
  }

  hide(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    this.root.classList.add('hidden');
    this.root.classList.remove('show');
  }

  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }
}
