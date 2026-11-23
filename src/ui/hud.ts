import { fmtTime } from '../core/math';
import { NamedWeaponId, NAMED_MAP, WeaponId, WEAPONS, weaponFamily } from '../game/weapons';
import { ATTACHMENT_MAP, AttachmentId } from '../game/attachments';

export type ResultKind = 'death' | 'win';

export interface AbilitySlot {
  key: string;
  label: string;
  activeT: number;
  cooldown: number;
  maxCooldown: number;
}

export class Hud {
  private readonly root = document.getElementById('hud')!;
  private readonly enemiesEl = document.getElementById('hud-enemies')!;
  private readonly lootEl = document.getElementById('hud-loot')!;
  private readonly weaponEl = document.getElementById('hud-weapon')!;
  private readonly weaponTypeEl = document.getElementById('hud-weapon-type')!;
  private readonly ammoEl = document.getElementById('hud-ammo')!;
  private readonly modEl = document.getElementById('hud-mod')!;
  private readonly armorLineEl = document.getElementById('hud-armor-line')!;
  private readonly armorEl = document.getElementById('hud-armor')!;
  private readonly damageEl = document.getElementById('damage')!;
  private readonly damageDirEl = document.getElementById('hud-damage-dir')!;
  private readonly heatFillEl = document.getElementById('hud-heat-fill')!;
  private readonly abilitiesEl = document.getElementById('hud-abilities')!;
  private readonly comboEl = document.getElementById('hud-combo')!;
  private readonly comboXEl = document.getElementById('hud-combo-x')!;
  private readonly comboFillEl = document.getElementById('hud-combo-fill')!;
  private readonly bossEl = document.getElementById('hud-boss')!;
  private readonly bossNameEl = document.getElementById('hud-boss-name')!;
  private readonly bossFillEl = document.getElementById('hud-boss-fill')!;
  private readonly bossLabelEl = document.getElementById('hud-boss-label')!;
  private readonly consumableEl = document.getElementById('hud-consumable')!;
  private readonly heatEl = document.getElementById('hud-heat')!;
  private readonly statusEl = document.getElementById('hud-status')!;
  private readonly psychosisEl = document.getElementById('hud-psychosis')!;
  private readonly timeEl = document.getElementById('hud-time')!;
  private readonly promptEl = document.getElementById('hud-prompt')!;
  private readonly subtitleEl = document.getElementById('hud-subtitle')!;
  private readonly logEl = document.getElementById('hud-log')!;
  private readonly approachEl = document.getElementById('hud-approach')!;
  private readonly crosshair = document.getElementById('crosshair')!;
  private readonly objectiveEl = document.getElementById('hud-objective')!;
  private readonly objectiveLabelEl = document.getElementById('hud-objective-label')!;
  private readonly objectiveTextEl = document.getElementById('hud-objective-text')!;
  private readonly exitEl = document.getElementById('hud-exit')!;
  private readonly exitArrow = document.getElementById('hud-exit-arrow')!;
  private readonly exitLabel = document.getElementById('hud-exit-label')!;
  private readonly overlays: Record<ResultKind, HTMLElement> = {
    death: document.getElementById('overlay-death')!,
    win: document.getElementById('overlay-win')!,
  };
  private readonly deathStats = document.getElementById('death-stats')!;
  private readonly deathNote = document.getElementById('death-note')!;
  private readonly winStats = document.getElementById('win-stats')!;
  private readonly winNote = document.getElementById('win-note')!;

  private lastEnemies = '';
  private lastLoot = '';
  private lastWeapon = '';
  private lastWeaponType = '';
  private lastAmmo = '';
  private lastMod = '';
  private lastArmor = '';
  private lastHeat = -1;
  private lastAbilities = '';
  private lastCombo = '';
  private lastBoss = '';
  private lastConsumable = '';
  private lastStatus = '';
  private lastPsychosis = '';
  private lastTime = '';
  private lastPrompt: string | null | undefined;
  private lastObjectiveLabel = '';
  private lastObjectiveText = '';
  private lastObjectiveDone = false;
  private crossOn = false;
  private damageTimer: number | null = null;
  private flashEnabled = true;
  private hitTimer: number | null = null;
  private damageDirTimer: number | null = null;
  private subtitleTimer: number | null = null;
  private subtitlesEnabled = true;
  private logEnabled = true;
  private logLines: string[] = [];

  setStats(
    hostiles: number,
    weapon: WeaponId,
    variant: NamedWeaponId | null,
    attachment: AttachmentId | null,
    clip: number,
    reserve: number,
    reloading: boolean,
    time: number,
    lootValue: number,
    armor: number,
    maxArmor: number,
    exitOpen: boolean,
    prompt: string | null,
  ): void {
    const e = String(hostiles).padStart(2, '0');
    if (e !== this.lastEnemies) {
      this.enemiesEl.textContent = e;
      this.lastEnemies = e;
    }
    const loot = `$${lootValue.toLocaleString('en-US')}`;
    if (loot !== this.lastLoot) {
      this.lootEl.textContent = loot;
      this.lastLoot = loot;
    }
    const w = variant ? NAMED_MAP[variant].name : WEAPONS[weapon].name;
    if (w !== this.lastWeapon) {
      this.weaponEl.textContent = w;
      this.lastWeapon = w;
    }
    const type = weaponFamily(weapon);
    if (type !== this.lastWeaponType) {
      this.weaponTypeEl.textContent = type;
      this.lastWeaponType = type;
    }
    const mod = attachment ? ATTACHMENT_MAP[attachment].name : '';
    if (mod !== this.lastMod) {
      this.modEl.textContent = mod;
      this.lastMod = mod;
    }
    const a = WEAPONS[weapon].melee
      ? '—'
      : reloading
        ? 'RL'
        : reserve > 0
          ? `${clip}/${reserve}`
          : String(clip).padStart(2, '0');
    if (a !== this.lastAmmo) {
      this.ammoEl.textContent = a;
      this.lastAmmo = a;
    }
    const armorText = maxArmor > 0 ? `${armor}/${maxArmor}` : '';
    if (armorText !== this.lastArmor) {
      this.armorEl.textContent = armorText;
      this.armorLineEl.classList.toggle('off', maxArmor === 0);
      this.lastArmor = armorText;
    }
    const s = exitOpen ? 'EXIT OPEN' : 'EXIT SEALED';
    if (s !== this.lastStatus) {
      this.statusEl.textContent = s;
      this.statusEl.classList.toggle('open', exitOpen);
      this.lastStatus = s;
    }
    const t = fmtTime(time);
    if (t !== this.lastTime) {
      this.timeEl.textContent = t;
      this.lastTime = t;
    }
    if (prompt !== this.lastPrompt) {
      this.promptEl.textContent = prompt ?? '';
      this.promptEl.classList.toggle('on', !!prompt);
      this.lastPrompt = prompt;
    }
  }

  setApproach(label: string, color: string): void {
    if (!label) {
      if (this.approachEl.classList.contains('on')) {
        this.approachEl.classList.remove('on');
        this.approachEl.textContent = '';
      }
      return;
    }
    if (this.approachEl.textContent !== label) this.approachEl.textContent = label;
    this.approachEl.style.color = color;
    this.approachEl.classList.add('on');
  }

  setHeat(value: number): void {
    const rounded = Math.round(value);
    if (rounded === this.lastHeat) return;
    this.lastHeat = rounded;
    this.heatFillEl.style.width = `${rounded}%`;
    this.heatEl.classList.toggle('hot', rounded >= 55);
  }

  setAbilities(slots: AbilitySlot[]): void {
    const key = slots
      .map((s) => `${s.key}:${s.activeT.toFixed(1)}:${s.cooldown.toFixed(1)}`)
      .join('|');
    if (key === this.lastAbilities) return;
    this.lastAbilities = key;
    if (slots.length === 0) {
      this.abilitiesEl.innerHTML = '';
      this.abilitiesEl.classList.add('off');
      return;
    }
    this.abilitiesEl.classList.remove('off');
    this.abilitiesEl.innerHTML = slots
      .map((slot) => {
        const active = slot.activeT > 0;
        const pct = active
          ? 100
          : slot.cooldown > 0
            ? Math.max(0, (1 - slot.cooldown / Math.max(0.01, slot.maxCooldown)) * 100)
            : 100;
        return `<div class="ability${active ? ' active' : ''}${
          !active && slot.cooldown > 0 ? ' cooling' : ''
        }">
          <span class="ability-key">${slot.key}</span><span class="ability-name">${slot.label}</span>
          <div class="ability-bar"><i style="width:${pct.toFixed(1)}%"></i></div>
        </div>`;
      })
      .join('');
  }

  setCombo(combo: number, comboT: number, max: number): void {
    const visible = combo >= 2;
    const pct = visible ? Math.max(0, Math.min(100, (comboT / Math.max(0.01, max)) * 100)) : 0;
    const key = visible ? `${combo}:${Math.round(pct)}` : '';
    if (key === this.lastCombo) return;
    this.lastCombo = key;
    this.comboEl.classList.toggle('off', !visible);
    this.comboEl.classList.toggle('hot', combo >= 5);
    if (visible) {
      this.comboXEl.textContent = `x${combo}`;
      this.comboFillEl.style.width = `${pct}%`;
    }
  }

  setPsychosis(stage: number, label: string): void {
    const key = `${stage}`;
    if (key === this.lastPsychosis) return;
    this.lastPsychosis = key;
    document.body.classList.toggle('cyberpsycho', stage >= 2);
    this.psychosisEl.classList.toggle('on', stage > 0);
    this.psychosisEl.classList.toggle('critical', stage >= 2);
    this.psychosisEl.textContent = stage > 0 ? `NEURAL ${label}` : '';
  }

  setSubtitlesEnabled(value: boolean): void {
    this.subtitlesEnabled = value;
    if (!value) {
      this.subtitleEl.classList.remove('on');
      this.subtitleEl.textContent = '';
    }
  }

  setLogEnabled(value: boolean): void {
    this.logEnabled = value;
    this.logEl.classList.toggle('off', !value);
    if (value) this.renderLog();
  }

  private renderLog(): void {
    this.logEl.innerHTML = this.logLines
      .slice(-4)
      .map(
        (line) =>
          `<span>${line.replace(
            /[<>&]/g,
            (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] ?? c,
          )}</span>`,
      )
      .join('');
  }

  subtitle(text: string, holdMs = 2600): void {
    if (!this.subtitlesEnabled) return;
    this.subtitleEl.textContent = text;
    this.subtitleEl.classList.add('on');
    if (this.subtitleTimer !== null) window.clearTimeout(this.subtitleTimer);
    this.subtitleTimer = window.setTimeout(() => {
      this.subtitleEl.classList.remove('on');
      this.subtitleTimer = null;
    }, holdMs);
  }

  logLine(text: string): void {
    this.logLines.push(text);
    if (this.logLines.length > 6) this.logLines.shift();
    if (!this.logEnabled) return;
    this.renderLog();
  }

  setConsumable(label: string, visible: boolean): void {
    const key = visible ? label : '';
    if (key === this.lastConsumable) return;
    this.lastConsumable = key;
    this.consumableEl.textContent = visible ? `[Q] ${label}` : '';
    this.consumableEl.classList.toggle('off', !visible);
  }

  setBoss(
    name: string,
    armor: number,
    maxArmor: number,
    visible: boolean,
    phase = 1,
  ): void {
    this.bossEl.classList.toggle('off', !visible);
    if (!visible) return;
    const key = `${name}:${armor}/${maxArmor}:${phase}`;
    if (key === this.lastBoss) return;
    this.lastBoss = key;
    this.bossNameEl.textContent = name;
    this.bossLabelEl.textContent = `PHASE ${phase} · ARMOR ${armor}/${maxArmor}`;
    this.bossFillEl.style.width = maxArmor > 0 ? `${(armor / maxArmor) * 100}%` : '0%';
  }

  setObjective(label: string, text: string, done: boolean): void {
    if (label !== this.lastObjectiveLabel) {
      this.objectiveLabelEl.textContent = label;
      this.lastObjectiveLabel = label;
    }
    if (text !== this.lastObjectiveText) {
      this.objectiveTextEl.textContent = text;
      this.lastObjectiveText = text;
    }
    if (done !== this.lastObjectiveDone) {
      this.objectiveEl.classList.toggle('done', done);
      this.lastObjectiveDone = done;
    }
  }

  exitPointer(cssDeg: number, meters: number, visible: boolean): void {
    this.exitEl.classList.toggle('on', visible);
    if (!visible) return;
    this.exitArrow.style.transform = `rotate(${cssDeg.toFixed(1)}deg)`;
    this.exitLabel.textContent = `EXIT ${meters}M`;
  }

  setFlashEnabled(value: boolean): void {
    this.flashEnabled = value;
  }

  damageDirection(worldAngle: number): void {
    const deg = 90 - (worldAngle * 180) / Math.PI;
    this.damageDirEl.style.transform = `translate(-50%, -50%) rotate(${deg.toFixed(1)}deg)`;
    this.damageDirEl.classList.remove('on');
    void this.damageDirEl.offsetWidth;
    this.damageDirEl.classList.add('on');
    if (this.damageDirTimer !== null) window.clearTimeout(this.damageDirTimer);
    this.damageDirTimer = window.setTimeout(() => {
      this.damageDirEl.classList.remove('on');
      this.damageDirTimer = null;
    }, 520);
  }

  flashDamage(kind: 'armor' | 'death' | 'flash'): void {
    if (!this.flashEnabled) return;
    const el = this.damageEl;
    el.classList.remove('armor', 'death');
    // Force a reflow so the animation restarts on rapid hits.
    void el.offsetWidth;
    el.classList.add(kind);
    if (this.damageTimer !== null) window.clearTimeout(this.damageTimer);
    this.damageTimer = window.setTimeout(() => {
      el.classList.remove('armor', 'death', 'flash');
    }, kind === 'death' ? 750 : 500);
  }

  crosshairAt(x: number, y: number, visible: boolean, spread = 1): void {
    this.crosshair.style.transform = `translate(${x}px, ${y}px) scale(${spread.toFixed(3)})`;
    if (visible !== this.crossOn) {
      this.crosshair.classList.toggle('on', visible);
      this.crossOn = visible;
    }
  }

  hitmarker(kill: boolean): void {
    this.crosshair.classList.remove('hit', 'hitkill');
    void this.crosshair.offsetWidth;
    this.crosshair.classList.add(kill ? 'hitkill' : 'hit');
    if (this.hitTimer !== null) window.clearTimeout(this.hitTimer);
    this.hitTimer = window.setTimeout(
      () => {
        this.crosshair.classList.remove('hit', 'hitkill');
        this.hitTimer = null;
      },
      kill ? 240 : 180,
    );
  }

  setVisible(visible: boolean): void {
    this.root.classList.toggle('off', !visible);
  }

  setHacked(value: boolean): void {
    this.root.classList.toggle('hacked', value);
  }

  showResult(kind: ResultKind, stats: string, note: string): void {
    for (const k of Object.keys(this.overlays) as ResultKind[]) {
      this.overlays[k].classList.toggle('hidden', k !== kind);
    }
    if (kind === 'death') {
      this.deathStats.textContent = stats;
      this.deathNote.textContent = note;
    } else {
      this.winStats.textContent = stats;
      this.winNote.textContent = note;
    }
  }

  hideResults(): void {
    for (const k of Object.keys(this.overlays) as ResultKind[]) {
      this.overlays[k].classList.add('hidden');
    }
  }
}
