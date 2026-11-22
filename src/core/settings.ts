const KEY = 'punkgun.settings.v1';

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
};

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

export class Settings {
  data: SettingsData;

  constructor() {
    this.data = this.load();
  }

  private load(): SettingsData {
    try {
      const raw = localStorage.getItem(KEY);
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
