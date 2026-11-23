import type { Locale } from './i18n';

const KEY = 'punkgun.settings.v2';

export type Palette = 'default' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type ControlPreset = 'wasd' | 'esdf' | 'arrows';

export interface SettingsData {
  volume: number;
  shake: number;
  bloom: number;
  flash: boolean;
  scanlines: boolean;
  cones: boolean;
  weather: boolean;
  reducedMotion: boolean;
  tutorialSeen: boolean;
  tourSeen: boolean;
  palette: Palette;
  subtitles: boolean;
  dialogueLog: boolean;
  fieldTips: boolean;
  fieldTipsSeen: string[];
  controls: ControlPreset;
  locale: Locale;
  keymap: Record<string, string>;
}

const DEFAULTS: SettingsData = {
  volume: 0.85,
  shake: 1,
  bloom: 1,
  flash: true,
  scanlines: true,
  cones: true,
  weather: true,
  reducedMotion: false,
  tutorialSeen: false,
  tourSeen: false,
  palette: 'default',
  subtitles: true,
  dialogueLog: true,
  fieldTips: true,
  fieldTipsSeen: [],
  controls: 'wasd',
  locale: 'en',
  keymap: {},
};

const PALETTES: Palette[] = ['default', 'deuteranopia', 'protanopia', 'tritanopia'];
const CONTROLS: ControlPreset[] = ['wasd', 'esdf', 'arrows'];

/** Canonical action code -> physical key for the chosen control preset. */
export function controlKeymap(preset: ControlPreset): Record<string, string> {
  if (preset === 'esdf') {
    return {
      KeyW: 'KeyE',
      KeyS: 'KeyD',
      KeyA: 'KeyS',
      KeyD: 'KeyF',
    };
  }
  if (preset === 'arrows') {
    return {
      KeyW: 'ArrowUp',
      KeyS: 'ArrowDown',
      KeyA: 'ArrowLeft',
      KeyD: 'ArrowRight',
    };
  }
  return {};
}

export function resolveKeymap(
  preset: ControlPreset,
  custom: Record<string, string> = {},
): Record<string, string> {
  return { ...controlKeymap(preset), ...custom };
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export class Settings {
  data: SettingsData;

  constructor() {
    this.data = this.load();
  }

  private load(): SettingsData {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem('punkgun.settings.v1');
      if (!raw) return { ...DEFAULTS };
      const p = JSON.parse(raw) as Partial<SettingsData>;
      return {
        volume:
          typeof p.volume === 'number' && Number.isFinite(p.volume)
            ? clamp(p.volume, 0, 1)
            : DEFAULTS.volume,
        shake:
          typeof p.shake === 'number' && Number.isFinite(p.shake)
            ? clamp(p.shake, 0, 1.5)
            : DEFAULTS.shake,
        bloom:
          typeof p.bloom === 'number' && Number.isFinite(p.bloom)
            ? clamp(p.bloom, 0, 1.5)
            : DEFAULTS.bloom,
        flash: typeof p.flash === 'boolean' ? p.flash : DEFAULTS.flash,
        scanlines: typeof p.scanlines === 'boolean' ? p.scanlines : DEFAULTS.scanlines,
        cones: typeof p.cones === 'boolean' ? p.cones : DEFAULTS.cones,
        weather: typeof p.weather === 'boolean' ? p.weather : DEFAULTS.weather,
        reducedMotion:
          typeof p.reducedMotion === 'boolean' ? p.reducedMotion : DEFAULTS.reducedMotion,
        tutorialSeen: typeof p.tutorialSeen === 'boolean' ? p.tutorialSeen : DEFAULTS.tutorialSeen,
        tourSeen: typeof p.tourSeen === 'boolean' ? p.tourSeen : DEFAULTS.tourSeen,
        palette: PALETTES.includes(p.palette as Palette)
          ? (p.palette as Palette)
          : DEFAULTS.palette,
        subtitles: typeof p.subtitles === 'boolean' ? p.subtitles : DEFAULTS.subtitles,
        dialogueLog:
          typeof p.dialogueLog === 'boolean' ? p.dialogueLog : DEFAULTS.dialogueLog,
        fieldTips:
          typeof p.fieldTips === 'boolean' ? p.fieldTips : DEFAULTS.fieldTips,
        fieldTipsSeen: Array.isArray(p.fieldTipsSeen)
          ? p.fieldTipsSeen.filter((id): id is string => typeof id === 'string')
          : [],
        controls: CONTROLS.includes(p.controls as ControlPreset)
          ? (p.controls as ControlPreset)
          : DEFAULTS.controls,
        locale:
          p.locale === 'es' || p.locale === 'en' ? p.locale : DEFAULTS.locale,
        keymap:
          p.keymap && typeof p.keymap === 'object'
            ? Object.fromEntries(
                Object.entries(p.keymap).filter(
                  ([key, value]) =>
                    typeof value === 'string' &&
                    (key.startsWith('Key') ||
                      key.startsWith('Digit') ||
                      key.startsWith('Arrow') ||
                      key === 'Space' ||
                      key.startsWith('Shift')),
                ),
              )
            : {},
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Settings still apply for this session.
    }
  }

  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]): void {
    this.data[key] = value;
    this.save();
  }
}
