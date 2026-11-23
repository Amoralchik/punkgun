import {
  resolveKeymap,
  type ControlPreset,
  type Palette,
  type Settings,
} from '../core/settings';
import { renderManual, renderTour } from './manual';

/** Settings DOM, remap capture and localized manual/tour rendering. */
export class SettingsPanel {
  private readonly volume = document.getElementById('set-volume') as HTMLInputElement;
  private readonly shake = document.getElementById('set-shake') as HTMLInputElement;
  private readonly bloom = document.getElementById('set-bloom') as HTMLInputElement;
  private readonly flash = document.getElementById('set-flash') as HTMLInputElement;
  private readonly scanlines = document.getElementById('set-scanlines') as HTMLInputElement;
  private readonly cones = document.getElementById('set-cones') as HTMLInputElement;
  private readonly weather = document.getElementById('set-weather') as HTMLInputElement;
  private readonly reducedMotion = document.getElementById(
    'set-reduced-motion',
  ) as HTMLInputElement;
  private readonly controls = document.getElementById('set-controls') as HTMLSelectElement;
  private readonly palette = document.getElementById('set-palette') as HTMLSelectElement;
  private readonly language = document.getElementById('set-locale') as HTMLSelectElement;
  private readonly subtitles = document.getElementById('set-subtitles') as HTMLInputElement;
  private readonly dialogueLog = document.getElementById(
    'set-dialogue-log',
  ) as HTMLInputElement;
  private readonly remapRoot = document.getElementById('set-remap')!;
  private readonly manualSections = document.getElementById('manual-sections')!;
  private readonly tourGrid = document.getElementById('tour-grid')!;
  private remapAction: string | null = null;

  constructor(
    private readonly settings: Settings,
    private readonly onChange: () => void,
  ) {
    for (const element of [this.volume, this.shake, this.bloom]) {
      element.addEventListener('input', () => this.commit());
    }
    for (const element of [
      this.flash,
      this.scanlines,
      this.cones,
      this.weather,
      this.reducedMotion,
      this.subtitles,
      this.dialogueLog,
    ]) {
      element.addEventListener('change', () => this.commit());
    }
    for (const element of [this.controls, this.palette, this.language]) {
      element.addEventListener('change', () => this.commit());
    }
    this.remapRoot.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>('[data-remap]');
      if (!button?.dataset.remap) return;
      this.remapAction = button.dataset.remap;
      this.renderRemapButtons();
    });
    window.addEventListener('keydown', (event) => {
      if (!this.remapAction) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code !== 'Escape') {
        this.settings.set('keymap', {
          ...this.settings.data.keymap,
          [this.remapAction]: event.code,
        });
      }
      this.remapAction = null;
      this.onChange();
      this.sync();
    });
  }

  sync(): void {
    this.volume.value = String(Math.round(this.settings.data.volume * 100));
    this.shake.value = String(Math.round(this.settings.data.shake * 100));
    this.bloom.value = String(Math.round(this.settings.data.bloom * 100));
    this.flash.checked = this.settings.data.flash;
    this.scanlines.checked = this.settings.data.scanlines;
    this.cones.checked = this.settings.data.cones;
    this.weather.checked = this.settings.data.weather;
    this.reducedMotion.checked = this.settings.data.reducedMotion;
    this.controls.value = this.settings.data.controls;
    this.palette.value = this.settings.data.palette;
    this.language.value = this.settings.data.locale;
    this.subtitles.checked = this.settings.data.subtitles;
    this.dialogueLog.checked = this.settings.data.dialogueLog;
    this.manualSections.innerHTML = renderManual(this.settings.data.locale);
    this.tourGrid.innerHTML = renderTour(this.settings.data.locale);
    this.renderRemapButtons();
  }

  private commit(): void {
    this.settings.set('volume', Number(this.volume.value) / 100);
    this.settings.set('shake', Number(this.shake.value) / 100);
    this.settings.set('bloom', Number(this.bloom.value) / 100);
    this.settings.set('flash', this.flash.checked);
    this.settings.set('scanlines', this.scanlines.checked);
    this.settings.set('cones', this.cones.checked);
    this.settings.set('weather', this.weather.checked);
    this.settings.set('reducedMotion', this.reducedMotion.checked);
    this.settings.set('controls', this.controls.value as ControlPreset);
    this.settings.set('palette', this.palette.value as Palette);
    this.settings.set('locale', this.language.value === 'es' ? 'es' : 'en');
    this.settings.set('subtitles', this.subtitles.checked);
    this.settings.set('dialogueLog', this.dialogueLog.checked);
    this.onChange();
    this.sync();
  }

  private renderRemapButtons(): void {
    const labels: Array<[string, string]> = [
      ['KeyW', 'MOVE UP'],
      ['KeyA', 'MOVE LEFT'],
      ['KeyS', 'MOVE DOWN'],
      ['KeyD', 'MOVE RIGHT'],
      ['KeyR', 'RELOAD'],
      ['KeyE', 'INTERACT'],
      ['KeyQ', 'SUPPLY'],
      ['Space', 'DASH'],
      ['ShiftLeft', 'SANDEVISTAN'],
      ['KeyC', 'CAMO'],
      ['KeyX', 'EMP'],
      ['KeyV', 'BERSERK'],
      ['KeyG', 'OVERCLOCK'],
      ['KeyH', 'INTRUSION'],
      ['KeyZ', 'QUICKHACK'],
    ];
    const keymap = resolveKeymap(this.settings.data.controls, this.settings.data.keymap);
    const pretty = (code: string): string => {
      if (code === 'Space') return 'SPACE';
      if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
      if (code.startsWith('Key')) return code.slice(3);
      if (code.startsWith('Digit')) return code.slice(5);
      if (code.startsWith('Arrow')) return code.replace('Arrow', '');
      return code.toUpperCase();
    };
    this.remapRoot.innerHTML = labels
      .map(
        ([code, label]) =>
          `<button class="remap-key${this.remapAction === code ? ' listening' : ''}" data-remap="${code}"><span>${label}</span><b>${
            this.remapAction === code ? 'PRESS KEY' : pretty(keymap[code] ?? code)
          }</b></button>`,
      )
      .join('');
  }
}
