export type AmbienceKind = 'none' | 'rain' | 'wind' | 'embers';

export function ambienceForLevel(id: string): AmbienceKind {
  if (id === 'sector07' || id === 'nightmarket' || id === 'docks') return 'rain';
  if (id === 'tenements' || id === 'spire') return 'wind';
  if (id === 'sublevel') return 'embers';
  return 'none';
}

/** All sound is synthesized: no audio assets, no network. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private ambienceKind: AmbienceKind = 'none';
  private ambienceSources: AudioScheduledSourceNode[] = [];
  private noiseBuf: AudioBuffer | null = null;
  private step = 0;
  private nextTime = 0;
  private muted = false;
  private volume = 0.85;
  private bossMode = false;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume * 0.7;
    master.connect(ctx.destination);
    this.master = master;

    const music = ctx.createGain();
    music.gain.value = 0.5;
    music.connect(master);
    this.musicBus = music;

    const ambience = ctx.createGain();
    ambience.gain.value = 0;
    ambience.connect(master);
    this.ambienceBus = ambience;

    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    this.startMusic();
    this.rebuildAmbience();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.7;
    return this.muted;
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.7;
  }

  /* ---------------------------------------------------------------- */
  /* primitives                                                        */
  /* ---------------------------------------------------------------- */

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    gain: number,
    at = 0,
    dest?: AudioNode,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = at || ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, f0), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest ?? this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(
    dur: number,
    gain: number,
    filterType: BiquadFilterType,
    freq: number,
    q: number,
    at = 0,
    dest?: AudioNode,
    freqEnd?: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf || !this.master) return;
    const t = at || ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(Math.max(20, freq), t);
    if (freqEnd !== undefined) {
      f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    }
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, gain), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest ?? this.master);
    src.start(t, Math.random() * 0.5, dur + 0.02);
  }

  /* ---------------------------------------------------------------- */
  /* sfx                                                               */
  /* ---------------------------------------------------------------- */

  shot(shotgun: boolean): void {
    if (!this.ctx) return;
    if (shotgun) {
      this.noise(0.24, 0.5, 'lowpass', 1100, 0.8);
      this.noise(0.12, 0.32, 'highpass', 2600, 0.7);
      this.tone('sine', 120, 38, 0.26, 0.5);
      this.tone('square', 220, 60, 0.1, 0.12);
    } else {
      this.noise(0.09, 0.38, 'bandpass', 2100, 0.9);
      this.noise(0.05, 0.28, 'highpass', 4200, 0.7);
      this.tone('sine', 170, 55, 0.14, 0.4);
      this.tone('square', 320, 90, 0.06, 0.1);
    }
  }

  enemyShot(): void {
    this.noise(0.07, 0.17, 'bandpass', 1700, 1.2);
    this.tone('sine', 150, 60, 0.1, 0.16);
  }

  smgShot(): void {
    this.noise(0.05, 0.3, 'bandpass', 2400, 1.1);
    this.noise(0.03, 0.2, 'highpass', 4200, 0.8);
    this.tone('sine', 190, 70, 0.07, 0.25);
    this.tone('square', 360, 140, 0.04, 0.06);
  }

  rifleShot(): void {
    this.noise(0.18, 0.45, 'lowpass', 2000, 0.8);
    this.noise(0.07, 0.3, 'highpass', 4000, 0.8);
    this.tone('sine', 160, 48, 0.28, 0.4);
    this.tone('triangle', 520, 160, 0.09, 0.08);
  }

  akShot(): void {
    this.noise(0.1, 0.4, 'bandpass', 1500, 0.8);
    this.noise(0.05, 0.26, 'highpass', 3000, 0.7);
    this.tone('square', 130, 60, 0.14, 0.2);
    this.tone('sine', 220, 80, 0.08, 0.1);
  }

  lmgShot(): void {
    this.noise(0.11, 0.46, 'lowpass', 1600, 0.7);
    this.noise(0.05, 0.3, 'highpass', 2800, 0.7);
    this.tone('sine', 100, 38, 0.18, 0.4);
    this.tone('square', 190, 70, 0.1, 0.1);
  }

  swing(): void {
    this.noise(0.09, 0.18, 'bandpass', 700, 1.4, 0, undefined, 2200);
  }

  punch(): void {
    this.noise(0.07, 0.3, 'lowpass', 500, 0.8);
    this.tone('sine', 110, 42, 0.1, 0.4);
  }

  stealthKill(): void {
    this.tone('triangle', 920, 170, 0.16, 0.11);
    this.noise(0.09, 0.14, 'lowpass', 650, 1);
  }

  suppressedShot(shotgun: boolean): void {
    this.noise(shotgun ? 0.12 : 0.06, 0.12, 'lowpass', 900, 1);
    this.tone('sine', shotgun ? 100 : 140, 55, 0.1, 0.15);
    this.tone('square', 900, 500, 0.03, 0.02);
  }

  stim(): void {
    this.noise(0.16, 0.14, 'highpass', 2400, 0.8);
    this.tone('sine', 700, 1300, 0.22, 0.08);
    this.tone('square', 180, 240, 0.12, 0.05);
  }

  smoke(): void {
    this.noise(0.7, 0.16, 'bandpass', 1300, 0.8);
    this.noise(0.4, 0.1, 'highpass', 3200, 0.7);
  }

  flash(): void {
    this.noise(0.35, 0.42, 'highpass', 1200, 0.7);
    this.tone('sine', 1200, 220, 0.6, 0.16);
    this.tone('triangle', 2400, 800, 0.4, 0.08);
  }

  fragThrow(): void {
    this.noise(0.2, 0.14, 'bandpass', 900, 1.2);
    this.tone('sine', 260, 120, 0.15, 0.08);
  }

  explosion(): void {
    this.noise(0.65, 0.5, 'lowpass', 700, 0.8);
    this.noise(0.2, 0.3, 'highpass', 2000, 0.7);
    this.tone('sine', 90, 28, 0.6, 0.5);
  }

  bossHit(): void {
    this.tone('triangle', 900, 180, 0.3, 0.2);
    this.noise(0.2, 0.3, 'lowpass', 700, 1);
    this.tone('sine', 90, 35, 0.35, 0.4);
  }

  bossPhase(): void {
    this.tone('sawtooth', 120, 320, 0.5, 0.12);
    this.tone('sawtooth', 300, 70, 0.5, 0.12);
    this.noise(0.4, 0.14, 'bandpass', 800, 1.5);
  }

  shieldHit(): void {
    this.tone('triangle', 1800, 620, 0.2, 0.16);
    this.noise(0.09, 0.16, 'bandpass', 2800, 2.2);
    this.tone('sine', 180, 80, 0.16, 0.22);
  }

  sniperShot(): void {
    this.noise(0.22, 0.42, 'lowpass', 1800, 0.8);
    this.noise(0.08, 0.24, 'highpass', 3800, 0.7);
    this.tone('sine', 150, 45, 0.3, 0.4);
  }

  sandevistan(): void {
    this.tone('sawtooth', 90, 460, 0.45, 0.14);
    this.tone('sine', 1400, 260, 0.5, 0.08);
    this.noise(0.45, 0.13, 'bandpass', 1900, 1.2);
  }

  camo(): void {
    this.noise(0.38, 0.1, 'highpass', 2800, 0.8);
    this.tone('triangle', 1900, 420, 0.32, 0.08);
  }

  camoBreak(): void {
    this.noise(0.18, 0.18, 'bandpass', 1200, 0.8);
    this.tone('square', 260, 140, 0.1, 0.07);
  }

  secondHeart(): void {
    this.tone('sine', 58, 138, 0.22, 0.5);
    this.tone('sine', 150, 52, 0.55, 0.35);
    this.noise(0.45, 0.22, 'lowpass', 520, 0.8);
  }

  biomonitor(): void {
    this.tone('triangle', 540, 760, 0.2, 0.08);
  }

  siren(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('sawtooth', 420, 820, 0.55, 0.075, t);
    this.tone('sawtooth', 820, 420, 0.55, 0.075, t + 0.55);
    this.noise(1.0, 0.08, 'bandpass', 900, 1.4, t);
  }

  kill(): void {
    this.noise(0.2, 0.22, 'lowpass', 1500, 0.6);
    this.tone('sawtooth', 190, 45, 0.22, 0.12);
  }

  death(): void {
    this.noise(0.7, 0.28, 'lowpass', 800, 0.7);
    this.tone('sawtooth', 260, 28, 1.1, 0.22);
    this.tone('square', 130, 20, 0.9, 0.12);
  }

  doorSlam(): void {
    this.tone('sine', 90, 32, 0.3, 0.6);
    this.noise(0.2, 0.3, 'bandpass', 620, 1.5);
    this.noise(0.08, 0.2, 'highpass', 3000, 1.2);
  }

  doorOpen(): void {
    this.noise(0.14, 0.14, 'bandpass', 900, 2);
    this.tone('sine', 140, 70, 0.12, 0.16);
  }

  pickup(): void {
    this.tone('square', 720, 1180, 0.07, 0.1);
  }

  loot(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('triangle', 660, 660, 0.12, 0.1, t);
    this.tone('triangle', 990, 990, 0.2, 0.08, t + 0.08);
  }

  armorHit(): void {
    this.tone('triangle', 1400, 420, 0.24, 0.18);
    this.noise(0.12, 0.22, 'bandpass', 2600, 2);
    this.tone('sine', 120, 55, 0.2, 0.3);
  }

  levelUp(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone('triangle', f, f, 0.45, 0.1, t + i * 0.07);
    });
  }

  uiClick(): void {
    this.tone('square', 880, 1320, 0.05, 0.055);
  }

  uiError(): void {
    this.tone('square', 200, 110, 0.16, 0.08);
  }

  throwSfx(): void {
    this.noise(0.18, 0.2, 'bandpass', 1200, 1.2, 0, undefined, 400);
  }

  empty(): void {
    this.tone('square', 1400, 900, 0.03, 0.08);
  }

  reloadStart(): void {
    if (!this.ctx) return;
    this.noise(0.05, 0.1, 'bandpass', 1800, 2);
    this.tone('square', 260, 180, 0.06, 0.04);
  }

  reloadEnd(): void {
    if (!this.ctx) return;
    this.noise(0.04, 0.08, 'bandpass', 3000, 2);
    this.tone('square', 720, 420, 0.05, 0.05);
  }

  reloadCancel(): void {
    this.tone('square', 420, 300, 0.05, 0.04);
  }

  setBossMode(on: boolean): void {
    this.bossMode = on;
  }

  setAmbience(kind: AmbienceKind): void {
    if (kind === this.ambienceKind) return;
    this.ambienceKind = kind;
    this.rebuildAmbience();
  }

  private rebuildAmbience(): void {
    const ctx = this.ctx;
    const bus = this.ambienceBus;
    if (!ctx || !bus) return;
    for (const source of this.ambienceSources) {
      try {
        source.stop();
      } catch {
        // Source may already have ended.
      }
      source.disconnect();
    }
    this.ambienceSources = [];
    bus.gain.setTargetAtTime(this.ambienceKind === 'none' ? 0 : 1, ctx.currentTime, 0.35);
    if (this.ambienceKind === 'none' || !this.noiseBuf) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuf;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    if (this.ambienceKind === 'rain') {
      filter.type = 'highpass';
      filter.frequency.value = 1400;
      gain.gain.value = 0.055;
    } else if (this.ambienceKind === 'wind') {
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      gain.gain.value = 0.075;
    } else {
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.8;
      gain.gain.value = 0.045;
    }
    noise.connect(filter).connect(gain).connect(bus);
    noise.start();
    this.ambienceSources.push(noise);

    if (this.ambienceKind === 'embers') {
      const drone = ctx.createOscillator();
      drone.type = 'sawtooth';
      drone.frequency.value = 48;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.06;
      drone.connect(droneGain).connect(bus);
      drone.start();
      this.ambienceSources.push(drone);
    }
  }

  alert(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('square', 640, 660, 0.06, 0.09, t);
    this.tone('square', 900, 920, 0.06, 0.09, t + 0.085);
  }

  exitOpen(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('sawtooth', 180, 420, 0.5, 0.16, t);
    this.tone('sine', 90, 180, 0.6, 0.2, t);
  }

  win(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone('triangle', f, f, 0.5, 0.13, t + i * 0.09);
    });
    this.noise(0.6, 0.12, 'highpass', 5000, 0.7, t);
  }

  /* ---------------------------------------------------------------- */
  /* music                                                             */
  /* ---------------------------------------------------------------- */

  private startMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;

    // Low drone bed.
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.11;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    lp.Q.value = 3;
    droneGain.connect(lp).connect(this.musicBus);
    [55, 55.35, 82.4].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sawtooth';
      osc.frequency.value = f;
      osc.connect(droneGain);
      osc.start();
    });

    const stepDur = 60 / 100 / 4;
    this.nextTime = ctx.currentTime + 0.12;
    const schedule = () => {
      if (!this.ctx) return;
      // A backgrounded tab can fall far behind; drop the backlog instead of
      // scheduling thousands of catch-up steps.
      if (this.nextTime < this.ctx.currentTime - 0.5) {
        this.nextTime = this.ctx.currentTime + 0.05;
      }
      while (this.nextTime < this.ctx.currentTime + 0.2) {
        this.playStep(this.step, this.nextTime, stepDur);
        this.nextTime += stepDur;
        this.step = (this.step + 1) % 32;
      }
    };
    window.setInterval(schedule, 40);
    schedule();
  }

  private playStep(step: number, t: number, stepDur: number): void {
    if (!this.musicBus || !this.ctx) return;
    const bus = this.musicBus;
    const s = step % 16;

    if (s % 4 === 0) {
      this.tone('sine', 135, 42, 0.24, 0.75, t, bus);
      this.noise(0.02, 0.1, 'highpass', 2000, 0.7, t, bus);
    }
    if (s % 2 === 1) {
      this.noise(0.03, 0.085, 'highpass', 8200, 0.8, t, bus);
    }
    if (s === 8 || s === 24) {
      this.noise(0.16, 0.16, 'bandpass', 1900, 1.1, t, bus);
      this.tone('triangle', 190, 120, 0.12, 0.1, t, bus);
    }

    const bassPattern = [33, 0, 33, 36, 0, 33, 0, 31, 33, 0, 33, 40, 0, 36, 0, 31];
    const midi = bassPattern[s];
    if (midi) {
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      const g = this.ctx.createGain();
      g.gain.value = 0.16;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(900, t);
      lp.frequency.exponentialRampToValueAtTime(240, t + stepDur * 1.8);
      lp.Q.value = 6;
      g.connect(lp).connect(bus);
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.connect(g);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 1.7);
      osc.start(t);
      osc.stop(t + stepDur * 1.8);
      // Octave shimmer on the last bar.
      if (step >= 16 && s % 4 === 0) {
        this.tone('square', f * 2, f * 2, stepDur * 1.2, 0.025, t, bus);
      }
    }

    if (this.bossMode) {
      if (s % 2 === 0) {
        this.tone('sawtooth', 55, 48, stepDur * 1.5, 0.075, t, bus);
      }
      if (s === 4 || s === 12) {
        this.tone('square', 330, 165, stepDur * 2, 0.03, t, bus);
      }
    }
  }
}
