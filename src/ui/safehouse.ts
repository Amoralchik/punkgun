import { fmtTime } from '../core/math';
import { AMMO_PACKS, LOOT_DEFS, LootKind, WEAPON_ECONOMY } from '../game/economy';
import { StationKind } from '../game/map';
import { Contract, objectiveDetail, objectiveText } from '../game/missions';
import { DOSSIERS, contractTagline, dossierUnlocked, FACTIONS, unlockText } from '../game/lore';
import { MODIFIER_MAP } from '../game/modifiers';
import { BOSSES } from '../game/bosses';
import { ROLE_MAP, type RoleId } from '../game/roles';
import { VENTURE_MAP, type VentureId } from '../game/ventures';
import {
  CYBERWARE_DEFS,
  CyberwareId,
  PERK_DEFS,
  PerkId,
  xpForNext,
} from '../game/progression';
import { Profile, stockKey } from '../game/profile';
import { LIFEPATHS, type LifepathId } from '../game/lifepath';
import { CHALLENGES, CHALLENGE_MAP, type ChallengeId } from '../game/challenges';
import type { RoomId } from '../game/rooms';
import type { TickerId } from '../game/exchange';
import { ATTACHMENT_MAP } from '../game/attachments';
import { renderSanctuary } from './station-sanctuary';
import { renderExchange } from './station-exchange';

import { COMPONENTS, COMPONENT_IDS, RECIPES, costText } from '../game/crafting';
import {
  APPROACHES,
  approachRequirement,
  approachUnlocked,
  ATTRIBUTE_DEFS,
  ATTR_MAX,
  ApproachId,
  AttributeId,
} from '../game/attributes';
import {
  CONSUMABLES,
  CONSUMABLE_MAP,
  ConsumableId,
} from '../game/consumables';
import { GunId, NAMED_MAP, NAMED_WEAPONS, NamedWeaponId, WEAPONS, WeaponId, isGun } from '../game/weapons';
import { CaseView } from './case-view';
import { Workbench } from './workbench';
import { renderVentures } from './station-ventures';
import { renderMarket } from './station-market';
import { renderContracts, renderDeploy } from './station-contracts';
import { renderOperator } from './station-operator';
import { getLocale, t } from '../core/i18n';

export interface SafehouseHooks {
  onDeploy: (contractId: string, approachId: ApproachId, challenge: ChallengeId) => void;
  onReroll: () => Contract[] | null;
  onNewGame: (lifepath: LifepathId, plus: boolean) => void;
  onClick: () => void;
  onError: () => void;
  onManual: () => void;
  onClose: () => void;
}

const SHOP_ORDER: Exclude<WeaponId, 'fists'>[] = [
  'bat',
  'pistol',
  'revolver',
  'shotgun',
  'smg',
  'needler',
  'carbine',
  'rifle',
  'dmr',
  'ak',
  'lmg',
  'plasma',
  'railgun',
];

export class Safehouse {
  private readonly root = document.getElementById('overlay-safehouse')!;
  private readonly moneyEl = document.getElementById('sh-money')!;
  private readonly panelEl = document.querySelector<HTMLElement>('.safehouse-panel')!;
  private readonly levelEl = document.getElementById('sh-level')!;
  private readonly augmentsBtn = document.getElementById('sh-augments')!;
  private readonly augRoot = document.getElementById('overlay-augments')!;
  private readonly augLevelEl = document.getElementById('aug-level')!;
  private readonly augXpTextEl = document.getElementById('aug-xp-text')!;
  private readonly augXpBarEl = document.getElementById('aug-xpbar')!;
  private readonly augPointsEl = document.getElementById('aug-points')!;
  private readonly augMoneyEl = document.getElementById('aug-money')!;
  private readonly augAttrsEl = document.getElementById('aug-attrs')!;
  private readonly augCyberwareEl = document.getElementById('aug-cyberware')!;
  private readonly augPerksEl = document.getElementById('aug-perks')!;
  private readonly augMsgEl = document.getElementById('aug-msg')!;
  private readonly augCloseEl = document.getElementById('aug-close')!;
  private readonly workbenchBtn = document.getElementById('sh-workbench')!;
  private readonly venturesBtn = document.getElementById('sh-ventures')!;
  private readonly contractsEl = document.getElementById('sh-contracts')!;
  private readonly contractDetailEl = document.getElementById('sh-contract-detail')!;
  private readonly deployEl = document.getElementById('sh-deploy') as HTMLButtonElement;
  private readonly equippedEl = document.getElementById('sh-equipped')!;
  private readonly stashEl = document.getElementById('sh-stash')!;
  private readonly suppliesEl = document.getElementById('sh-supplies')!;
  private readonly kitEl = document.getElementById('sh-kit')!;
  private readonly contrabandEl = document.getElementById('sh-contraband')!;
  private readonly intelEl = document.getElementById('sh-intel')!;
  private readonly shopEl = document.getElementById('sh-shop')!;
  private readonly statsEl = document.getElementById('sh-stats')!;
  private readonly summaryEl = document.getElementById('sh-summary')!;
  private readonly msgEl = document.getElementById('sh-msg')!;
  private readonly resetEl = document.getElementById('sh-reset')!;
  private readonly newGameEl = document.getElementById('sh-new-game')!;
  private readonly newGameHeadEl = document.getElementById('sh-new-game-head')!;
  private readonly saveImportEl = document.getElementById('save-import') as HTMLInputElement;
  private readonly stationRoot = document.getElementById('overlay-station')!;
  private readonly stationPanel = document.querySelector<HTMLElement>('.station-panel')!;
  private readonly stationKickerEl = document.getElementById('station-kicker')!;
  private readonly stationTitleEl = document.getElementById('station-title')!;
  private readonly stationMoneyEl = document.getElementById('station-money')!;
  private readonly stationLevelEl = document.getElementById('station-level')!;
  private readonly stationBodyEl = document.getElementById('station-body')!;
  private readonly stationMsgEl = document.getElementById('station-msg')!;
  private readonly lifepathRoot = document.getElementById('overlay-lifepath')!;
  private readonly lifepathGrid = document.getElementById('lifepath-grid')!;
  private readonly lifepathPlus = document.getElementById('lifepath-plus') as HTMLInputElement;
  private readonly caseView: CaseView;
  private readonly workbench: Workbench;

  private contracts: Contract[] = [];
  private selectedId: string | null = null;
  private approachId: ApproachId = 'standard';
  private challengeId: ChallengeId = 'standard';
  private message = '';
  private messageError = false;
  private augMessage = '';
  private augError = false;
  private resetArmed = false;
  private resetTimer: number | null = null;
  private newGameArmed = false;
  private newGameTimer: number | null = null;
  private stationMode = false;
  private stationView:
    | 'contracts'
    | 'deploy'
    | 'market'
    | 'supplies'
    | 'archive'
    | 'fabricator'
    | 'operator'
    | 'ventures'
    | 'sanctuary'
    | 'exchange' = 'contracts';
  private stationOnly = false;
  private archiveId: string | null = null;

  constructor(
    private readonly profile: Profile,
    private readonly hooks: SafehouseHooks,
  ) {
    this.challengeId = this.profile.data.challenge;
    this.caseView = new CaseView(this.profile, {
      onClick: () => this.hooks.onClick(),
      onClose: () => this.render(),
    });
    this.workbench = new Workbench(this.profile, {
      onClick: () => this.hooks.onClick(),
      onError: () => this.hooks.onError(),
      onClose: () => {
        if (this.stationOnly) {
          this.stationOnly = false;
          this.hooks.onClose();
          return;
        }
        this.workbenchBtn.focus();
        this.render();
      },
    });
    this.root.addEventListener('click', (ev) => this.handleClick(ev));
    this.stationRoot.addEventListener('click', (ev) => this.handleClick(ev));
    this.augRoot.addEventListener('click', (ev) => this.handleAugClick(ev));
    this.saveImportEl.addEventListener('change', () => {
      void this.importSaveFile();
    });
  }

  get caseOpen(): boolean {
    return this.caseView.isOpen;
  }

  get augmentsOpen(): boolean {
    return !this.augRoot.classList.contains('hidden');
  }

  get workbenchOpen(): boolean {
    return this.workbench.isOpen;
  }

  openStation(kind: StationKind): void {
    this.message = '';
    this.messageError = false;
    this.augRoot.classList.add('hidden');
    this.workbench.hide();
    this.root.classList.add('hidden');
    this.stationRoot.classList.add('hidden');
    this.caseView.close();
    this.stationOnly = false;
    if (kind === 'workbench') {
      this.stationOnly = true;
      this.openWorkbench();
      return;
    }
    if (kind === 'clinic') {
      this.stationOnly = true;
      this.openAugments();
      return;
    }
    if (kind === 'deploy') {
      this.openDeploy();
      return;
    }
    this.stationView = kind;
    this.stationMode = true;
    this.stationRoot.classList.remove('hidden');
    this.render();
    this.stationPanel.scrollTop = 0;
  }

  openDeploy(): void {
    this.message = '';
    this.messageError = false;
    this.augRoot.classList.add('hidden');
    this.workbench.hide();
    this.root.classList.add('hidden');
    this.stationOnly = false;
    this.stationView = 'deploy';
    this.stationMode = true;
    this.stationRoot.classList.remove('hidden');
    this.render();
    this.stationPanel.scrollTop = 0;
  }

  openVentures(): void {
    this.message = '';
    this.messageError = false;
    this.augRoot.classList.add('hidden');
    this.workbench.hide();
    this.root.classList.add('hidden');
    this.stationOnly = false;
    this.stationView = 'ventures';
    this.stationMode = true;
    this.stationRoot.classList.remove('hidden');
    this.render();
    this.stationPanel.scrollTop = 0;
  }

  openExchange(): void {
    this.message = '';
    this.messageError = false;
    this.augRoot.classList.add('hidden');
    this.workbench.hide();
    this.root.classList.add('hidden');
    this.stationOnly = false;
    this.stationView = 'exchange';
    this.stationMode = true;
    this.stationRoot.classList.remove('hidden');
    this.render();
    this.stationPanel.scrollTop = 0;
  }

  openNewGame(): void {
    this.showLifepath();
  }

  private showLifepath(): void {
    const es = getLocale() === 'es';
    this.lifepathGrid.innerHTML = LIFEPATHS.map(
      (path) => `<button class="lifepath-card" style="--path:${path.color}" data-act="lifepath" data-id="${path.id}">
        <span>${path.kicker}</span>
        <b>${path.name}</b>
        <p>${es ? path.descEs : path.desc}</p>
        <small>$${path.money} · ${path.startWeapon ? `START WITH ${path.startWeapon.toUpperCase()}` : 'START WITH PISTOL'}</small>
      </button>`,
    ).join('');
    this.lifepathPlus.disabled = !this.profile.data.finalCleared;
    this.lifepathPlus.checked = false;
    this.lifepathPlus.parentElement?.classList.toggle('locked', !this.profile.data.finalCleared);
    this.lifepathRoot.classList.remove('hidden');
    (this.lifepathGrid.querySelector('button') as HTMLButtonElement | null)?.focus();
  }

  private hideLifepath(): void {
    this.lifepathRoot.classList.add('hidden');
  }

  openCase(): void {
    this.augRoot.classList.add('hidden');
    this.workbench.hide();
    this.stationRoot.classList.add('hidden');
    this.stationMode = false;
    this.stationOnly = false;
    this.root.classList.remove('hidden');
    this.render();
    this.caseView.open();
  }

  closeCase(): void {
    this.caseView.close();
    this.render();
  }

  rotateSelectedCase(): void {
    this.caseView.rotate();
  }

  /** Closes the top most clinic/workbench modal; returns false when only the board remains. */
  handleEscape(): boolean {
    if (this.augmentsOpen) {
      this.closeAugments();
      return true;
    }
    if (this.workbenchOpen) {
      this.workbench.close();
      return true;
    }
    if (this.caseOpen) {
      this.closeCase();
      return true;
    }
    return false;
  }

  setContracts(contracts: Contract[]): void {
    this.contracts = contracts;
    this.selectedId = contracts[0]?.id ?? null;
    this.render();
  }

  setNotice(text: string): void {
    this.message = text;
    this.messageError = false;
    this.render();
  }

  private get selectedContract(): Contract | null {
    return this.contracts.find((c) => c.id === this.selectedId) ?? null;
  }

  show(): void {
    this.message = '';
    this.messageError = false;
    this.augRoot.classList.add('hidden');
    this.workbench.hide();
    this.stationRoot.classList.add('hidden');
    this.caseView.close();
    this.stationMode = false;
    this.stationOnly = false;
    this.lifepathRoot.classList.add('hidden');
    this.root.classList.remove('hidden');
    this.panelEl.scrollTop = 0;
    this.render();
  }

  hide(): void {
    this.lifepathRoot.classList.add('hidden');
    this.root.classList.add('hidden');
    this.stationRoot.classList.add('hidden');
    this.caseView.close();
    this.augRoot.classList.add('hidden');
    this.workbench.hide();
    this.stationMode = false;
    this.stationOnly = false;
    this.resetArmed = false;
    if (this.resetTimer !== null) {
      window.clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.newGameArmed = false;
    if (this.newGameTimer !== null) {
      window.clearTimeout(this.newGameTimer);
      this.newGameTimer = null;
    }
  }

  render(): void {
    const { money, stash, equippedId, bestTime, runs, clears, level, xp, perkPoints } =
      this.profile.data;
    this.moneyEl.textContent = `$${money.toLocaleString('en-US')}`;
    this.levelEl.textContent = `LVL ${level} · ${xp}/${xpForNext(level)} XP · ${perkPoints} PP`;
    this.augmentsBtn.textContent = perkPoints > 0 ? `AUGMENTS · ${perkPoints} PP` : 'AUGMENTS';

    this.contractsEl.innerHTML = this.contracts
      .map((c, i) => {
        const locked = c.locked === true;
        const clears = this.profile.data.regularClears;
        const required = c.requiredClears ?? 3;
        const mods = c.modifiers
          .map(
            (id) =>
              `<span class="cmod" style="color:${MODIFIER_MAP[id].color};border-color:${MODIFIER_MAP[id].color}">${MODIFIER_MAP[id].name}</span>`,
          )
          .join('');
        return `<button class="sh-contract${c.id === this.selectedId ? ' selected' : ''}${
          c.objective === 'boss' ? ' boss' : ''
        }${locked ? ' locked' : ''}" data-act="select-contract" data-id="${c.id}">
          <span class="cnum">0${i + 1} · <b class="risk-${c.risk.toLowerCase()}">${c.risk} RISK</b>${
            c.daily ? ' · DAILY' : ''
          }${c.authored ? ' · STORY' : ''}${
            c.challenge && c.challenge !== 'standard' ? ` · ${CHALLENGE_MAP[c.challenge].name}` : ''
          }</span>
          <span class="ctitle">${c.title}${locked ? ' · LOCKED' : ''}</span>
          <span class="cmeta"><b style="color:${FACTIONS[c.faction].color}">${FACTIONS[c.faction].name}</b><br>${
            c.bossId
              ? `${BOSSES[c.bossId].name}<br>${objectiveText(c)}`
              : `${c.layoutName}<br>${objectiveText(c)}`
          }</span>
          ${mods ? `<span class="cmods">${mods}</span>` : ''}
          ${locked ? `<span class="clock">REQUIRES ${required} CLEARS · ${clears}/${required}</span>` : ''}
          <span class="creward">$${c.reward} + TIME</span>
        </button>`;
      })
      .join('');
    const selected = this.selectedContract;
    const selectedLocked = selected?.locked === true;
    const selectedMods = selected
      ? selected.modifiers
          .map(
            (id) =>
              `<span class="cmod" style="color:${MODIFIER_MAP[id].color};border-color:${MODIFIER_MAP[id].color}">${MODIFIER_MAP[id].name}</span>`,
          )
          .join('')
      : '';
    this.contractDetailEl.innerHTML = selected
      ? `${objectiveDetail(selected)}<br><span class="cflavor">${contractTagline(selected)}</span>${
          selected.daily ? '<br><span class="daily-badge">DAILY CONTRACT · ONE SEEDED DROP</span>' : ''
        }${
          selected.challenge && selected.challenge !== 'standard'
            ? `<br><span class="daily-badge">${CHALLENGE_MAP[selected.challenge].name}</span>`
            : ''
        }${selectedMods ? `<span class="cmods detail-mods">${selectedMods}</span>` : ''}${
          selectedLocked
            ? `<br><span class="clock">BOSS ACCESS LOCKED — ${this.profile.data.regularClears}/${selected.requiredClears ?? 3} REGULAR CLEARS</span>`
            : ''
        }`
      : '';
    this.deployEl.textContent = selected
      ? `${selectedLocked ? 'LOCKED · ' : 'DEPLOY · '}${selected.title}`
      : 'DEPLOY';
    this.deployEl.disabled = !!selectedLocked;

    const equipped = stash.find((s) => s.id === equippedId);
    const equippedName = equipped
      ? equipped.variant
        ? NAMED_MAP[equipped.variant].name
        : WEAPONS[equipped.weapon].name
      : 'FISTS';
    const equippedMod = equipped?.attachment
      ? ` · ${ATTACHMENT_MAP[equipped.attachment].name}`
      : '';
    this.equippedEl.innerHTML = equipped
      ? `<span class="name">${equippedName}</span>
         <span class="meta">${equipped.weapon === 'bat' ? 'MELEE' : `${equipped.ammo} RDS`}${equippedMod} · READY</span>`
      : `<span class="name">FISTS</span>
         <span class="meta">NO WEAPON CARRIED</span>`;

    this.stashEl.innerHTML =
      stash.length === 0
        ? `<div class="sh-note">STORAGE EMPTY. BUY A WEAPON OR DEPLOY WITH FISTS.</div>`
        : stash
            .map((item) => {
              const armed = item.id === equippedId;
              const melee = item.weapon === 'bat';
              const pack = melee ? null : AMMO_PACKS[item.weapon as GunId];
              const full = !!pack && item.ammo >= pack.max;
              const ammoCost = pack ? this.profile.ammoPrice(item) : 0;
              const sell = this.profile.sellValue(item);
              const name = item.variant
                ? NAMED_MAP[item.variant].name
                : WEAPONS[item.weapon].name;
              const attach = item.attachment ? ATTACHMENT_MAP[item.attachment].name : 'NO MOD';
              return `<div class="sh-item${armed ? ' armed' : ''}">
                <div class="info">
                  <span class="wname">${name}${armed ? ' · EQUIPPED' : ''}</span>
                  <span class="wmeta">${melee ? 'MELEE' : `<b>${item.ammo}</b> RDS`} · ${attach} · SELL <b>$${sell}</b></span>
                </div>
                <div class="sh-actions">
                  <button data-act="equip" data-id="${item.id}" ${armed ? 'disabled' : ''}>${armed ? 'ARMED' : 'EQUIP'}</button>
                  ${
                    pack
                      ? `<button data-act="ammo" data-id="${item.id}" ${full ? 'disabled' : ''}>+${pack.add} RDS · $${ammoCost}</button>`
                      : ''
                  }
                  <button class="sell" data-act="sell" data-id="${item.id}">SELL $${sell}</button>
                </div>
              </div>`;
            })
            .join('');

    this.contrabandEl.innerHTML =
      (Object.keys(LOOT_DEFS) as LootKind[])
        .filter((kind) => this.profile.data.contraband[kind] > 0)
        .map((kind) => {
          const count = this.profile.data.contraband[kind];
          const def = LOOT_DEFS[kind];
          return `<div class="sh-item">
            <div class="info">
              <span class="wname">${def.name} ×${count}</span>
              <span class="wmeta"><b>$${def.value}</b> EACH</span>
            </div>
            <div class="sh-actions">
              <button data-act="sell-loot" data-kind="${kind}" data-count="1">SELL 1 · $${def.value}</button>
              ${
                count > 1
                  ? `<button class="sell" data-act="sell-loot" data-kind="${kind}" data-count="all">SELL ALL · $${def.value * count}</button>`
                  : ''
              }
            </div>
          </div>`;
        })
        .join('') || `<div class="sh-note">NO CONTRABAND. GRAB LOOT IN THE SECTOR.</div>`;

    const runsToRotate = Math.max(
      0,
      2 - (this.profile.data.runs - this.profile.data.market.refreshedRun),
    );
    this.intelEl.textContent = `3 CACHES PER SECTOR — ${(Object.keys(LOOT_DEFS) as LootKind[])
      .map((kind) => `${LOOT_DEFS[kind].name} $${LOOT_DEFS[kind].value}`)
      .join(' · ')} · STOCK ROTATES IN ${runsToRotate} RUN${runsToRotate === 1 ? '' : 'S'}`;

    const baseShop = SHOP_ORDER.map((weapon) => {
      const econ = WEAPON_ECONOMY[weapon];
      const price = this.profile.weaponPrice(weapon);
      const stock = this.profile.stockFor(stockKey('weapon', weapon));
      const included = econ.ammo > 0 ? `${econ.ammo} RDS INCLUDED` : 'MELEE';
      return `<div class="sh-item">
        <div class="info">
          <span class="wname">${WEAPONS[weapon].name}</span>
          <span class="wmeta">${included} · STOCK ${stock} · <b>$${price}</b></span>
        </div>
        <div class="sh-actions">
          <button data-act="buy" data-weapon="${weapon}" ${stock <= 0 ? 'disabled' : ''}>${
            stock <= 0 ? 'OUT OF STOCK' : `BUY $${price}`
          }</button>
        </div>
      </div>`;
    }).join('');
    const namedShop = NAMED_WEAPONS.map((def) => {
      const price = this.profile.namedPrice(def.id);
      const stock = this.profile.stockFor(stockKey('named', def.id));
      return `<div class="sh-item">
        <div class="info">
          <span class="wname">${def.name}</span>
          <span class="wmeta">NAMED ${WEAPONS[def.base].name} · ${def.ammo} RDS · STOCK ${stock} · <b>$${price}</b></span>
        </div>
        <div class="sh-actions">
          <button data-act="buy-named" data-id="${def.id}" ${stock <= 0 ? 'disabled' : ''}>${
            stock <= 0 ? 'OUT OF STOCK' : `BUY $${price}`
          }</button>
        </div>
      </div>`;
    }).join('');
    this.shopEl.innerHTML = baseShop + namedShop;

    const { supplyType, supplyCharges } = this.profile.data;
    this.suppliesEl.innerHTML = CONSUMABLES.map((def) => {
      const packed = supplyType === def.id;
      const full = packed && supplyCharges >= this.profile.maxSupply();
      const stock = this.profile.stockFor(stockKey('supply', def.id));
      return `<div class="sh-item${packed ? ' armed' : ''}">
        <div class="info">
          <span class="wname">${def.name}</span>
          <span class="wmeta">${def.desc} · STOCK ${stock}</span>
        </div>
        <div class="sh-actions">
          <button data-act="buy-supply" data-id="${def.id}" ${full || stock <= 0 ? 'disabled' : ''}>${
            stock <= 0 ? 'OUT OF STOCK' : full ? 'KIT FULL' : `BUY · $${this.profile.supplyPrice(def.id)}`
          }</button>
        </div>
      </div>`;
    }).join('');
    this.kitEl.innerHTML = supplyType
      ? `PACKED <b>${CONSUMABLE_MAP[supplyType].name} ×${supplyCharges}</b>
         <button data-act="clear-supply">CLEAR</button>`
      : 'KIT EMPTY — BUY CHARGES ABOVE.';

    this.statsEl.innerHTML = `BEST CLEAN <b>${bestTime === null ? '—' : fmtTime(bestTime)}</b><br>
      RUNS <b>${runs}</b> · CLEARS <b>${clears}</b>`;

    const carried = equipped
      ? `${equippedName} · ${equipped.weapon === 'bat' ? 'MELEE' : `${equipped.ammo} RDS`}${equippedMod}`
      : 'FISTS';
    const kit = supplyType ? `${CONSUMABLE_MAP[supplyType].name} ×${supplyCharges}` : 'EMPTY';
    this.summaryEl.innerHTML = `CARRYING <b>${carried}</b> · KIT <b>${kit}</b> · BALANCE <b>$${money.toLocaleString('en-US')}</b>`;

    this.msgEl.textContent = this.message;
    this.msgEl.classList.toggle('err', this.messageError);
    this.resetEl.textContent = this.resetArmed ? 'CONFIRM WIPE' : 'RESET SAVE';
    this.newGameEl.textContent = this.newGameArmed ? 'CONFIRM NEW GAME' : 'NEW GAME';
    this.newGameHeadEl.textContent = this.newGameArmed ? 'CONFIRM NEW GAME' : 'NEW GAME';
    if (this.stationMode) this.renderStation();
    if (this.caseView.isOpen) this.caseView.render();
  }

  private renderStation(): void {
    const { money, level, xp, perkPoints } = this.profile.data;
    this.stationMoneyEl.textContent = `$${money.toLocaleString('en-US')}`;
    this.stationLevelEl.textContent = `LVL ${level} · ${xp}/${xpForNext(level)} XP · ${perkPoints} PP`;
    const meta = {
      contracts: { kicker: '// CONTRACT NET', title: t('station.title.contracts') },
      deploy: { kicker: '// DEPLOYMENT', title: t('station.title.deploy') },
      market: { kicker: '// BLACK MARKET', title: t('station.title.market') },
      supplies: { kicker: '// SUPPLY DEPOT', title: t('station.title.supplies') },
      archive: { kicker: '// THE ARCHIVE', title: t('station.title.archive') },
      fabricator: { kicker: '// FABRICATOR', title: t('station.title.fabricator') },
      operator: { kicker: '// OPERATOR', title: t('station.title.operator') },
      ventures: { kicker: '// STREET BUSINESS', title: 'VENTURES' },
      sanctuary: { kicker: '// SANCTUARY', title: 'SANCTUARY' },
      exchange: { kicker: '// BLACK EXCHANGE', title: 'THE EXCHANGE' },
    } as const;
    const { kicker, title } = meta[this.stationView];
    this.stationKickerEl.textContent = kicker;
    this.stationTitleEl.textContent = title;

    const contracts = this.contractsEl.innerHTML;
    const brief = this.contractDetailEl.innerHTML;
    const equipped = this.equippedEl.innerHTML;
    const summary = this.summaryEl.innerHTML;
    const shop = this.shopEl.innerHTML;
    const stash = this.stashEl.innerHTML;
    const contraband = this.contrabandEl.innerHTML;
    const supplies = this.suppliesEl.innerHTML;
    const kit = this.kitEl.innerHTML;
    const intel = this.intelEl.textContent ?? '';
    const selected = this.selectedContract;
    const es = getLocale() === 'es';
    const contractBlock = `<div class="sh-contracts station-contracts">${contracts}</div>`;
    const approaches = APPROACHES.map((a) => {
      const unlocked = approachUnlocked(a, this.profile.data.attributes);
      const active = a.id === this.approachId;
      return `<button class="approach${active ? ' selected' : ''}${unlocked ? '' : ' locked'}"
        data-act="select-approach" data-id="${a.id}" ${unlocked ? '' : 'disabled'}>
        <span class="approach-code" style="color:${a.color}">${a.code}</span>
        <span class="approach-name">${a.name}</span>
        <span class="approach-desc">${es ? a.descEs : a.desc}</span>
        <span class="approach-req">${
          unlocked ? (active ? 'SELECTED' : 'READY') : `REQUIRES ${approachRequirement(a)}`
        }</span>
      </button>`;
    }).join('');
    const challenges = CHALLENGES.map((challenge) => {
      const active = challenge.id === this.challengeId;
      return `<button class="challenge${active ? ' selected' : ''}" style="--challenge:${challenge.color}"
        data-act="select-challenge" data-id="${challenge.id}">
        <span>${challenge.name}</span>
        <small>${challenge.desc}</small>
        <b>${challenge.payBonus > 0 ? `+${Math.round(challenge.payBonus * 100)}% PAY` : 'NO BONUS'}</b>
      </button>`;
    }).join('');

    if (this.stationView === 'contracts') {
      this.stationBodyEl.innerHTML = renderContracts({
        contractBlock,
        brief,
        equipped,
        selected,
        rerollCost: this.profile.boardRefreshCost(),
      });
    } else if (this.stationView === 'deploy') {
      this.stationBodyEl.innerHTML = renderDeploy({
        contractBlock,
        selected,
        regularClears: this.profile.data.regularClears,
        brief,
        approaches,
        challenges,
        equipped,
        summary,
      });
    } else if (this.stationView === 'archive') {
      const progress = this.profile.data;
      const unlocked = DOSSIERS.filter((d) => dossierUnlocked(d, progress));
      if (!this.archiveId || !unlocked.some((d) => d.id === this.archiveId)) {
        this.archiveId = unlocked[0]?.id ?? null;
      }
      const dossier = unlocked.find((d) => d.id === this.archiveId) ?? null;
      const faction = dossier ? FACTIONS[dossier.faction] : null;
      const list = DOSSIERS.map((d) => {
        const open = dossierUnlocked(d, progress);
        return `<button class="archive-entry${open ? '' : ' locked'}${d.id === this.archiveId ? ' selected' : ''}"
          data-act="archive-entry" data-id="${d.id}" ${open ? '' : 'disabled'}>
          <span class="archive-num">${String(d.order).padStart(2, '0')}</span>
          <span class="archive-name">${open ? d.title : '/// REDACTED'}</span>
          <span class="archive-meta">${open ? d.kicker.replace('// ', '') : unlockText(d)}</span>
        </button>`;
      }).join('');
      this.stationBodyEl.innerHTML = `
        <div class="station-grid archive-grid">
          <section class="station-col">
            <div class="kicker">// STORY ARCHIVE</div>
            <h2>CHRONICLES</h2>
            <div class="archive-list">${list}</div>
          </section>
          <section class="station-col">
            ${
              dossier
                ? `<div class="archive-kicker">${dossier.kicker}</div>
                   <div class="archive-title">${dossier.title}</div>
                   <div class="archive-body">${(es ? dossier.bodyEs : dossier.body).map((p) => `<p>${p}</p>`).join('')}</div>
                   ${
                     faction
                       ? `<div class="archive-faction" style="border-color:${faction.color}">
                            <span style="color:${faction.color}">${faction.name}</span>
                            <p>${faction.blurb}</p>
                          </div>`
                       : ''
                   }`
                : `<p class="sh-note">NO FILES UNLOCKED. CLEAR CONTRACTS TO EARN THE REST.</p>`
            }
          </section>
        </div>`;
    } else if (this.stationView === 'fabricator') {
      const comps = COMPONENT_IDS.map((id) => {
        const d = COMPONENTS[id];
        const count = this.profile.data.components[id];
        return `<div class="component-chip" style="border-color:${d.color}">
          <b style="color:${d.color}">${count}</b>
          <span>${d.name}</span>
          <small>${d.desc}</small>
        </div>`;
      }).join('');
      const recipes = RECIPES.map((r) => {
        const can = this.profile.canCraft(r);
        return `<div class="recipe${can ? '' : ' locked'}">
          <div class="recipe-info">
            <span class="recipe-name">${r.name}</span>
            <span class="recipe-desc">${r.desc}</span>
            <span class="recipe-cost">${costText(r)}</span>
          </div>
          <button data-act="craft" data-id="${r.id}" ${can ? '' : 'disabled'}>FABRICATE</button>
        </div>`;
      }).join('');
      this.stationBodyEl.innerHTML = `
        <div class="station-grid">
          <section class="station-col">
            <div class="kicker">// FABRICATOR</div>
            <h2>COMPONENTS</h2>
            <div class="components">${comps}</div>
            <h2>RECIPES</h2>
            <div class="recipe-list">${recipes}</div>
          </section>
          <section class="station-col">
            <div class="kicker">// FIELD WORK</div>
            <h2>HOW IT WORKS</h2>
            <p class="sh-note">Every kill yields one component. Fabricated weapons go straight into the attaché case; ammo, attachments and stims apply to your carried loadout.</p>
            <h2>LOADOUT</h2>
            <div class="sh-equipped station-loadout">${equipped}</div>
            <div class="sh-kit station-kit">${kit}</div>
            <p class="sh-note">Open the attaché case from the terminal to arrange new weapons.</p>
          </section>
        </div>`;
    } else if (this.stationView === 'operator') {
      this.stationBodyEl.innerHTML = renderOperator(this.profile);
    } else if (this.stationView === 'ventures') {
      this.stationBodyEl.innerHTML = renderVentures(this.profile);
    } else if (this.stationView === 'market') {
      this.stationBodyEl.innerHTML = renderMarket(this.profile, {
        shop,
        stash,
        contraband,
        intel,
      });
    } else if (this.stationView === 'sanctuary') {
      this.stationBodyEl.innerHTML = renderSanctuary(this.profile);
    } else if (this.stationView === 'exchange') {
      this.stationBodyEl.innerHTML = renderExchange(this.profile);
    } else {
      this.stationBodyEl.innerHTML = `
        <div class="station-grid">
          <section class="station-col">
            <div class="kicker">// SUPPLY DEPOT</div>
            <h2>CONSUMABLES</h2>
            <div class="sh-list">${supplies}</div>
          </section>
          <section class="station-col">
            <h2>RUN KIT</h2>
            <div class="sh-kit station-kit">${kit}</div>
            <p class="sh-note">One pack per run. Unused charges are lost on launch. Check the loadout before you deploy.</p>
            <h2>LOADOUT</h2>
            <div class="sh-equipped station-loadout">${equipped}</div>
          </section>
        </div>`;
    }

    this.stationMsgEl.textContent = this.message;
    this.stationMsgEl.classList.toggle('err', this.messageError);
  }

  private exportSaveFile(): void {
    const blob = new Blob([this.profile.exportSave()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `punkgun-save-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.message = 'SAVE EXPORTED';
    this.messageError = false;
    this.render();
  }

  private async importSaveFile(): Promise<void> {
    const file = this.saveImportEl.files?.[0];
    this.saveImportEl.value = '';
    if (!file) return;
    try {
      const error = this.profile.importSave(await file.text());
      if (error) {
        this.message = error;
        this.messageError = true;
        this.hooks.onError();
      } else {
        this.message = 'SAVE IMPORTED';
        this.messageError = false;
        this.hooks.onClick();
      }
    } catch {
      this.message = 'INVALID SAVE';
      this.messageError = true;
      this.hooks.onError();
    }
    this.render();
  }

  private handleClick(ev: MouseEvent): void {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    let error: string | null = null;
    let success = '';

    switch (act) {
      case 'open-case':
        this.hooks.onClick();
        this.openCase();
        return;
      case 'open-deploy':
        this.hooks.onClick();
        this.openDeploy();
        return;
      case 'select-approach': {
        const id = target.dataset.id as ApproachId | undefined;
        if (!id) return;
        const def = APPROACHES.find((a) => a.id === id);
        if (!def || !approachUnlocked(def, this.profile.data.attributes)) return;
        this.approachId = id;
        this.hooks.onClick();
        this.render();
        return;
      }
      case 'select-challenge': {
        const id = target.dataset.id as ChallengeId | undefined;
        if (!id || !CHALLENGES.some((challenge) => challenge.id === id)) return;
        this.challengeId = id;
        this.profile.data.challenge = id;
        this.profile.save();
        this.hooks.onClick();
        this.render();
        return;
      }
      case 'launch':
        this.hooks.onClick();
        if (this.selectedId && !this.selectedContract?.locked) {
          this.hooks.onDeploy(this.selectedId, this.approachId, this.challengeId);
        }
        return;
      case 'close-station':
        this.hooks.onClick();
        this.hooks.onClose();
        return;
      case 'export-save':
        this.hooks.onClick();
        this.exportSaveFile();
        return;
      case 'import-save':
        this.hooks.onClick();
        this.saveImportEl.click();
        return;
      case 'archive-entry': {
        const id = target.dataset.id;
        const dossier = DOSSIERS.find((d) => d.id === id);
        if (!dossier || !dossierUnlocked(dossier, this.profile.data)) return;
        this.archiveId = dossier.id;
        this.hooks.onClick();
        this.render();
        return;
      }
      case 'reroll': {
        const next = this.hooks.onReroll();
        if (!next) {
          this.message = 'NOT ENOUGH CREDITS TO REFRESH';
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.contracts = next;
          this.selectedId = next[0]?.id ?? null;
          this.message = `BOARD REFRESHED · $${this.profile.boardRefreshCost()}`;
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'refresh-market': {
        const error = this.profile.refreshMarket();
        if (error) {
          this.message = error;
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.message = `MARKET STOCK ROTATED · $${this.profile.marketRefreshCost()}`;
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'craft': {
        const id = target.dataset.id;
        if (!id) return;
        const recipe = RECIPES.find((r) => r.id === id);
        const error = this.profile.craft(id);
        if (error) {
          this.message = error;
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.message = recipe ? `${recipe.name} FABRICATED` : 'FABRICATION COMPLETE';
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'open-augments':
        this.hooks.onClick();
        this.openAugments();
        return;
      case 'open-workbench':
        this.hooks.onClick();
        this.openWorkbench();
        return;
      case 'open-ventures':
        this.hooks.onClick();
        this.openVentures();
        return;
      case 'lifepath': {
        const id = target.dataset.id as LifepathId | undefined;
        if (!id || !LIFEPATHS.some((path) => path.id === id)) return;
        this.hideLifepath();
        this.hooks.onClick();
        this.hooks.onNewGame(id, this.lifepathPlus.checked && this.profile.data.finalCleared);
        return;
      }
      case 'lifepath-cancel':
        this.hideLifepath();
        this.render();
        return;
      case 'open-sanctuary':
        this.hooks.onClick();
        this.openStation('sanctuary');
        return;
      case 'open-exchange':
        this.hooks.onClick();
        this.openExchange();
        return;
      case 'open-market':
        this.hooks.onClick();
        this.openStation('market');
        return;
      case 'room': {
        const id = target.dataset.id as RoomId | undefined;
        if (!id) return;
        const error = this.profile.buyRoomUpgrade(id);
        if (error) {
          this.message = error;
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.message = 'SAFEHOUSE UPGRADED';
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'stock-buy':
      case 'stock-sell': {
        const id = target.dataset.id as TickerId | undefined;
        if (!id) return;
        const qty = target.dataset.qty === 'all'
          ? this.profile.exchangeHoldings(id)
          : Number(target.dataset.qty ?? 1);
        const error =
          act === 'stock-buy'
            ? this.profile.buyShares(id, qty)
            : this.profile.sellShares(id, qty);
        if (error) {
          this.message = error;
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.message = `${act === 'stock-buy' ? 'BOUGHT' : 'SOLD'} ${qty} ${id.toUpperCase()} SHARE${qty === 1 ? '' : 'S'}`;
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'venture-event': {
        const id = target.dataset.id;
        if (!id) return;
        const event = this.profile.pendingVentureEvent();
        const choice = event?.choices.find((entry) => entry.id === id);
        const reply = choice
          ? getLocale() === 'es'
            ? choice.replyEs
            : choice.reply
          : null;
        const error = this.profile.resolveVentureEvent(id);
        if (error) {
          this.message = error;
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.message = reply ?? 'STREET EVENT RESOLVED';
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'switch-slot': {
        const slot = Number(target.dataset.id);
        if (!Number.isFinite(slot) || slot < 1 || slot > 3) return;
        const url = new URL(window.location.href);
        if (slot === 1) url.searchParams.delete('slot');
        else url.searchParams.set('slot', String(slot));
        window.location.assign(url.toString());
        return;
      }
      case 'faction-offer': {
        const id = target.dataset.id;
        if (!id) return;
        const error = this.profile.buyFactionOffer(id);
        if (error) {
          this.message = error;
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.message = 'FACTION HARDWARE ADDED TO STORAGE';
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'buy-insurance': {
        const error = this.profile.buyInsurance();
        if (error) {
          this.message = error;
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.message = 'INSURANCE POLICY ACTIVE';
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'cancel-insurance':
        this.profile.cancelInsurance();
        this.message = 'POLICY CANCELLED';
        this.messageError = false;
        this.hooks.onClick();
        this.render();
        return;
      case 'venture': {
        const id = target.dataset.id as VentureId | undefined;
        if (!id || !VENTURE_MAP[id]) return;
        const error = this.profile.buyVenture(id);
        if (error) {
          this.message = error;
          this.messageError = true;
          this.hooks.onError();
        } else {
          this.message = `${VENTURE_MAP[id].name} UPGRADED`;
          this.messageError = false;
          this.hooks.onClick();
        }
        this.render();
        return;
      }
      case 'close-panel':
        this.hooks.onClick();
        this.hooks.onClose();
        return;
      case 'buy-supply': {
        const id = target.dataset.id as ConsumableId | undefined;
        if (!id) return;
        error = this.profile.buySupply(id);
        success = `${CONSUMABLE_MAP[id].name} PACKED`;
        break;
      }
      case 'clear-supply':
        this.profile.clearSupply();
        success = 'KIT CLEARED';
        break;
      case 'buy-named': {
        const id = target.dataset.id as NamedWeaponId | undefined;
        if (!id) return;
        error = this.profile.buyNamed(id);
        success = `${NAMED_MAP[id].name} ADDED TO STORAGE`;
        break;
      }
      case 'manual':
        this.hooks.onClick();
        this.hooks.onManual();
        return;
      case 'select-contract': {
        const id = target.dataset.id;
        if (!id) return;
        this.selectedId = id;
        this.hooks.onClick();
        this.render();
        return;
      }
      case 'buy': {
        const weapon = target.dataset.weapon as Exclude<WeaponId, 'fists'> | undefined;
        if (!weapon) return;
        error = this.profile.buyWeapon(weapon);
        success = `${WEAPONS[weapon].name} ADDED TO STORAGE`;
        break;
      }
      case 'ammo': {
        const id = target.dataset.id;
        if (!id) return;
        error = this.profile.buyAmmo(id);
        success = 'AMMUNITION DELIVERED';
        break;
      }
      case 'sell': {
        const id = target.dataset.id;
        if (!id) return;
        const item = this.profile.data.stash.find((s) => s.id === id);
        error = this.profile.sell(id);
        success = item ? `SOLD ${WEAPONS[item.weapon].name} FOR $${WEAPON_ECONOMY[item.weapon as Exclude<WeaponId, 'fists'>].sell}` : '';
        break;
      }
      case 'sell-loot': {
        const kind = target.dataset.kind as LootKind | undefined;
        if (!kind || !(kind in LOOT_DEFS)) return;
        const all = target.dataset.count === 'all';
        const have = this.profile.data.contraband[kind];
        const count = all ? have : 1;
        const value = LOOT_DEFS[kind].value * count;
        error = this.profile.sellLoot(kind, all);
        success = `SOLD ${count} × ${LOOT_DEFS[kind].name} FOR $${value}`;
        break;
      }
      case 'equip': {
        const id = target.dataset.id;
        if (!id) return;
        error = this.profile.equip(id);
        success = 'LOADOUT UPDATED';
        break;
      }
      case 'role': {
        const id = target.dataset.id as RoleId | undefined;
        if (!id || !ROLE_MAP[id]) return;
        this.profile.setRole(id);
        this.message = `ROLE: ${ROLE_MAP[id].name}`;
        this.messageError = false;
        this.hooks.onClick();
        this.render();
        return;
      }
      case 'preset-save': {
        const index = Number(target.dataset.index);
        error = this.profile.savePreset(index);
        success = `PRESET 0${index + 1} SAVED`;
        break;
      }
      case 'preset-load': {
        const index = Number(target.dataset.index);
        error = this.profile.applyPreset(index);
        success = `PRESET 0${index + 1} EQUIPPED`;
        break;
      }
      case 'preset-clear': {
        const index = Number(target.dataset.index);
        this.profile.clearPreset(index);
        success = `PRESET 0${index + 1} CLEARED`;
        break;
      }
      case 'new-game': {
        this.handleNewGame();
        return;
      }
      case 'reset': {
        this.handleReset();
        return;
      }
      default:
        return;
    }

    if (error) {
      this.message = error;
      this.messageError = true;
      this.hooks.onError();
    } else {
      this.message = success;
      this.messageError = false;
      this.hooks.onClick();
    }
    this.render();
  }

  private openAugments(): void {
    this.augMessage = '';
    this.augError = false;
    this.augRoot.classList.remove('hidden');
    this.renderAugments();
    this.augCloseEl.focus();
  }

  private closeAugments(): void {
    this.augRoot.classList.add('hidden');
    if (this.stationOnly) {
      this.stationOnly = false;
      this.hooks.onClose();
      return;
    }
    this.augmentsBtn.focus();
    this.render();
  }

  private renderAugments(): void {
    const es = getLocale() === 'es';
    const { level, xp, perkPoints, money, cyberware, perks, attributes, attributePoints } =
      this.profile.data;
    const next = xpForNext(level);
    this.augAttrsEl.innerHTML = `
      <div class="aug-attr-head">
        <span class="hud-label">ATTRIBUTES</span>
        <span class="aug-attr-points">${attributePoints} POINT${attributePoints === 1 ? '' : 'S'} AVAILABLE</span>
      </div>
      <div class="aug-attr-grid">
        ${ATTRIBUTE_DEFS.map((def) => {
          const value = attributes[def.id];
          const maxed = value >= ATTR_MAX;
          return `<div class="aug-attr" style="--attr:${def.color}">
            <span class="aug-attr-name">${def.name}<b>${value}</b></span>
            <span class="aug-attr-short">${es ? def.shortEs : def.short}</span>
            <span class="aug-attr-desc">${es ? def.descEs : def.desc}</span>
            <button data-act="attr" data-id="${def.id}" ${maxed || attributePoints < 1 ? 'disabled' : ''}>${maxed ? 'MAX' : '+'}</button>
          </div>`;
        }).join('')}
      </div>`;

    this.augLevelEl.textContent = String(level);
    this.augXpTextEl.textContent = `${xp} / ${next} XP`;
    this.augXpBarEl.style.width = `${Math.min(100, (xp / next) * 100)}%`;
    this.augPointsEl.textContent = String(perkPoints);
    const helixDiscount = Math.round(this.profile.discountFor('helix') * 100);
    this.augMoneyEl.textContent = `$${money.toLocaleString('en-US')}${
      helixDiscount > 0 ? ` · HELIX -${helixDiscount}%` : ''
    }`;

    const humanity = this.profile.humanityInfo();
    const strainPct = Math.min(100, (humanity.used / Math.max(1, humanity.max)) * 100);
    this.augAttrsEl.innerHTML += `
      <div class="aug-humanity stage-${humanity.stage}">
        <div class="aug-humanity-head">
          <span class="hud-label">NEURAL LOAD</span>
          <b>${humanity.used} / ${humanity.max}</b>
          <span class="aug-humanity-state">${humanity.label}</span>
        </div>
        <div class="aug-humanity-bar"><i style="width:${strainPct}%"></i></div>
        <p class="sh-note">Capacity grows with BODY and level. Strain above 60% starts ripperdoc rejection risk; above 85% it starts costing armor and vision.</p>
      </div>`;

    this.augCyberwareEl.innerHTML = CYBERWARE_DEFS.map((def) => {
      const rank = cyberware[def.id];
      const maxed = rank >= def.maxRank;
      const cost = maxed ? 0 : this.profile.cyberwarePrice(def.id);
      const info = this.profile.humanityInfo(def.id);
      const overCapacity = !maxed && info.used + info.nextCost > info.max;
      const riskPct = Math.round(info.risk * 100);
      return `<div class="aug-item${overCapacity ? ' locked' : ''}">
        <div class="aug-info">
          <span class="aug-name">${def.name}</span>
          <span class="aug-desc">${es ? def.descEs : def.desc}</span>
          <span class="aug-rank">RANK ${rank}/${def.maxRank} · LOAD ${
            maxed ? '—' : `+${info.nextCost}`
          }${!maxed && riskPct > 0 ? ` · RISK ${riskPct}%` : ''}${
            overCapacity ? ' · CAPACITY BLOCKED' : ''
          }</span>
        </div>
        <div class="sh-actions aug-action">
          <span class="aug-cost">${maxed ? 'MAX' : `$${cost}`}</span>
          <button data-act="install" data-id="${def.id}" ${
            maxed || overCapacity ? 'disabled' : ''
          }>${maxed ? 'MAXED' : overCapacity ? 'NO CAPACITY' : 'INSTALL'}</button>
        </div>
      </div>`;
    }).join('');

    this.augPerksEl.innerHTML = PERK_DEFS.map((def) => {
      const rank = perks[def.id];
      const maxed = rank >= def.maxRank;
      const blocked = maxed ? null : this.profile.perkBlockReason(def.id);
      return `<div class="aug-item">
        <div class="aug-info">
          <span class="aug-name">${def.name}</span>
          <span class="aug-desc">${es ? def.descEs : def.desc}</span>
          <span class="aug-rank">RANK ${rank}/${def.maxRank}${blocked ? ` · ${blocked}` : ''}</span>
        </div>
        <div class="sh-actions aug-action">
          <span class="aug-cost">${maxed ? 'MAX' : '1 PT'}</span>
          <button data-act="train" data-id="${def.id}" ${maxed || blocked ? 'disabled' : ''}>${maxed ? 'MAXED' : blocked ? 'LOCKED' : 'TRAIN'}</button>
        </div>
      </div>`;
    }).join('');

    this.augMsgEl.textContent = this.augMessage;
    this.augMsgEl.classList.toggle('err', this.augError);
  }

  private openWorkbench(): void {
    this.stationOnly = false;
    this.workbench.open();
  }

  private handleAugClick(ev: MouseEvent): void {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    if (act === 'close-augments') {
      this.hooks.onClick();
      this.closeAugments();
      return;
    }
    if (act === 'attr') {
      const id = target.dataset.id as AttributeId | undefined;
      if (!id) return;
      const error = this.profile.spendAttribute(id);
      if (error) {
        this.augMessage = error;
        this.augError = true;
        this.hooks.onError();
      } else {
        this.augMessage = 'ATTRIBUTE INCREASED';
        this.augError = false;
        this.hooks.onClick();
      }
      this.renderAugments();
      this.render();
      return;
    }

    let error: string | null = null;
    let success = '';
    if (act === 'install') {
      const id = target.dataset.id as CyberwareId | undefined;
      if (!id) return;
      error = this.profile.installCyberware(id);
      success = 'CYBERWARE INSTALLED';
    } else if (act === 'train') {
      const id = target.dataset.id as PerkId | undefined;
      if (!id) return;
      error = this.profile.trainPerk(id);
      success = 'PERK TRAINED';
    } else {
      return;
    }

    if (error) {
      this.augMessage = error;
      this.augError = true;
      this.hooks.onError();
    } else {
      this.augMessage = success;
      this.augError = false;
      this.hooks.onClick();
    }
    this.renderAugments();
    this.render();
  }

  private handleNewGame(): void {
    if (!this.newGameArmed) {
      this.newGameArmed = true;
      this.resetArmed = false;
      this.message = 'PRESS CONFIRM NEW GAME TO WIPE PROGRESS AND REROLL THE CAMPAIGN';
      this.messageError = true;
      if (this.newGameTimer !== null) window.clearTimeout(this.newGameTimer);
      this.newGameTimer = window.setTimeout(() => {
        this.newGameArmed = false;
        this.render();
      }, 5000);
      this.render();
      return;
    }
    if (this.newGameTimer !== null) window.clearTimeout(this.newGameTimer);
    this.newGameTimer = null;
    this.newGameArmed = false;
    this.message = '';
    this.messageError = false;
    this.hooks.onClick();
    this.showLifepath();
  }

  private handleReset(): void {
    if (!this.resetArmed) {
      this.resetArmed = true;
      this.newGameArmed = false;
      if (this.newGameTimer !== null) {
        window.clearTimeout(this.newGameTimer);
        this.newGameTimer = null;
      }
      this.message = 'PRESS CONFIRM WIPE TO DELETE ALL PROGRESS';
      this.messageError = true;
      if (this.resetTimer !== null) window.clearTimeout(this.resetTimer);
      this.resetTimer = window.setTimeout(() => {
        this.resetArmed = false;
        this.render();
      }, 5000);
      this.render();
      return;
    }
    if (this.resetTimer !== null) window.clearTimeout(this.resetTimer);
    this.resetArmed = false;
    this.profile.reset();
    this.message = 'SAVE WIPED — STARTER LOADOUT RESTORED';
    this.messageError = false;
    this.hooks.onClick();
    this.render();
  }
}
