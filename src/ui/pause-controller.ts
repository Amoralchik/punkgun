import { getLocale } from '../core/i18n';
import { TOUR_STEPS, renderTourStep } from '../core/manual';

export interface PauseHooks {
  onResume: () => void;
  onSettingsSync: () => void;
  onManual: () => void;
  onAbandon: () => void;
  onManualClosed: () => void;
  onTourClosed: () => void;
}

/** Pause, manual and tour overlays. */
export class PauseController {
  private readonly root = document.getElementById('overlay-pause')!;
  private readonly settings = document.getElementById('pause-settings')!;
  private readonly manualRoot = document.getElementById('overlay-manual')!;
  private readonly tourRoot = document.getElementById('overlay-tour')!;
  private readonly tourStepEl = document.getElementById('tour-grid')!;
  private readonly tourCountEl = document.getElementById('tour-count')!;
  private readonly tourPrevEl = document.getElementById(
    'tour-prev',
  ) as HTMLButtonElement;
  private readonly tourNextEl = document.getElementById(
    'tour-next',
  ) as HTMLButtonElement;
  private readonly abandon = document.querySelector<HTMLButtonElement>(
    '#overlay-pause [data-act="abandon"]',
  )!;
  private manual = false;
  private tour = false;
  private tourIndex = 0;
  private abandonArmed = false;
  private abandonTimer: number | null = null;

  constructor(private readonly hooks: PauseHooks) {
    this.root.addEventListener('click', (event) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset
        .act;
      if (action === 'resume') this.hooks.onResume();
      else if (action === 'settings') {
        this.settings.classList.toggle('hidden');
        this.hooks.onSettingsSync();
      } else if (action === 'manual') this.hooks.onManual();
      else if (action === 'abandon') this.confirmAbandon();
    });
    this.tourRoot.addEventListener('click', (event) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset
        .act;
      if (action === 'tour-close') this.closeTour();
      else if (action === 'tour-next') this.advanceTour();
      else if (action === 'tour-prev') this.retreatTour();
    });
    this.manualRoot.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('[data-act="close-manual"]')) {
        this.closeManual();
      }
    });
  }

  get isManualOpen(): boolean {
    return this.manual;
  }

  get isTourOpen(): boolean {
    return this.tour;
  }

  openPause(): void {
    this.root.classList.remove('hidden');
    this.settings.classList.add('hidden');
    this.resetAbandon();
  }

  closePause(): void {
    this.root.classList.add('hidden');
  }

  showManual(): void {
    this.manual = true;
    this.manualRoot.classList.remove('hidden');
    (document.getElementById('manual-close') as HTMLButtonElement | null)?.focus();
  }

  closeManual(): void {
    this.manual = false;
    this.manualRoot.classList.add('hidden');
    this.hooks.onManualClosed();
  }

  showTour(): void {
    this.tour = true;
    this.tourIndex = 0;
    this.renderTour();
    this.tourRoot.classList.remove('hidden');
    this.tourNextEl.focus();
  }

  advanceTour(): void {
    if (this.tourIndex >= TOUR_STEPS.length - 1) {
      this.closeTour();
      return;
    }
    this.tourIndex++;
    this.renderTour();
    this.tourNextEl.focus();
  }

  retreatTour(): void {
    if (this.tourIndex <= 0) return;
    this.tourIndex--;
    this.renderTour();
    this.tourNextEl.focus();
  }

  private renderTour(): void {
    const step = TOUR_STEPS[this.tourIndex];
    this.tourStepEl.innerHTML = renderTourStep(step, getLocale());
    this.tourCountEl.textContent = `${this.tourIndex + 1} / ${TOUR_STEPS.length}`;
    this.tourPrevEl.disabled = this.tourIndex === 0;
    this.tourNextEl.textContent =
      this.tourIndex === TOUR_STEPS.length - 1 ? 'FINISH' : 'NEXT';
  }

  closeTour(): void {
    this.tour = false;
    this.tourRoot.classList.add('hidden');
    this.hooks.onTourClosed();
  }

  closeAll(): void {
    this.root.classList.add('hidden');
    this.manual = false;
    this.manualRoot.classList.add('hidden');
    this.tour = false;
    this.tourRoot.classList.add('hidden');
    this.resetAbandon();
  }

  private confirmAbandon(): void {
    if (!this.abandonArmed) {
      this.abandonArmed = true;
      this.abandon.textContent = 'CONFIRM ABANDON';
      if (this.abandonTimer !== null) window.clearTimeout(this.abandonTimer);
      this.abandonTimer = window.setTimeout(() => this.resetAbandon(), 5000);
      return;
    }
    this.resetAbandon();
    this.root.classList.add('hidden');
    this.hooks.onAbandon();
  }

  private resetAbandon(): void {
    this.abandonArmed = false;
    this.abandon.textContent = 'ABANDON RUN';
    if (this.abandonTimer !== null) window.clearTimeout(this.abandonTimer);
    this.abandonTimer = null;
  }
}
