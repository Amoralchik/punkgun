import { t, type MessageKey } from '../core/i18n';
import type { ProfileData } from '../game/profile';
import type { Station, StationKind } from '../game/map';
import { xpForNext } from '../game/progression';

const STATION_LABELS: Record<StationKind, MessageKey> = {
  contracts: 'station.contracts',
  workbench: 'station.workbench',
  clinic: 'station.clinic',
  market: 'station.market',
  supplies: 'station.supplies',
  archive: 'station.archive',
  fabricator: 'station.fabricator',
  operator: 'station.operator',
  sanctuary: 'station.sanctuary',
  deploy: 'station.deploy',
};

/** Safehouse hub overlay: level/credits and the nearest-station prompt. */
export class Hub {
  private readonly root = document.getElementById('hub')!;
  private readonly prompt = document.getElementById('hub-prompt')!;
  private readonly level = document.getElementById('hub-level')!;
  private readonly money = document.getElementById('hub-money')!;

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  updateStats(data: ProfileData): void {
    this.level.textContent = `LVL ${data.level} · ${data.xp}/${xpForNext(data.level)} XP`;
    this.money.textContent = `$${data.money.toLocaleString('en-US')}`;
  }

  updatePrompt(station: Station | null, recoveryNote: string | null): void {
    this.prompt.textContent = station
      ? `E — ${t(STATION_LABELS[station.kind])}`
      : recoveryNote
        ? `${recoveryNote} · TAB — OPEN TERMINAL`
        : 'TAB — OPEN TERMINAL';
  }
}
