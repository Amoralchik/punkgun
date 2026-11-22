import { fmtTime } from '../core/math';
import { AMMO_PACKS, LOOT_DEFS, LootKind, WEAPON_ECONOMY } from '../game/economy';
import { StationKind } from '../game/map';
import { Contract, objectiveDetail, objectiveText } from '../game/missions';
import { DOSSIERS, dossierUnlocked, FACTIONS, handlerLine, unlockText } from '../game/lore';
import { nextRepRank, repDiscount, repPayBonus } from '../game/reputation';
import { MODIFIER_MAP } from '../game/modifiers';
import {
  CYBERWARE_DEFS,
  CyberwareId,
  PERK_DEFS,
  PerkId,
  xpForNext,
} from '../game/progression';
import { Profile } from '../game/profile';
import { ATTACHMENTS, ATTACHMENT_MAP, AttachmentId } from '../game/attachments';

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
  SUPPLY_MAX,
} from '../game/consumables';
import { GunId, NAMED_MAP, NAMED_WEAPONS, NamedWeaponId, WEAPONS, WeaponId, isGun } from '../game/weapons';
import { CaseView } from './case-view';

export interface SafehouseHooks {
  onDeploy: (contractId: string, approachId: ApproachId) => void;
  onReroll: () => Contract[] | null;
  onClick: () => void;
  onError: () => void;
  onManual: () => void;
  onClose: () => void;
}

const SHOP_ORDER: Exclude<WeaponId, 'fists'>[] = [
  'bat',
  'pistol',
  'shotgun',
  'smg',
  'rifle',
  'ak',
  'lmg',
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
  private readonly wbRoot = document.getElementById('overlay-workbench')!;
  private readonly wbMoneyEl = document.getElementById('wb-money')!;
  private readonly wbGunsEl = document.getElementById('wb-guns')!;
  private readonly wbAttachmentsEl = document.getElementById('wb-attachments')!;
  private readonly wbMsgEl = document.getElementById('wb-msg')!;
  private readonly wbCloseEl = document.getElementById('wb-close')!;
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
  private readonly saveImportEl = document.getElementById('save-import') as HTMLInputElement;
  private readonly stationRoot = document.getElementById('overlay-station')!;
  private readonly stationPanel = document.querySelector<HTMLElement>('.station-panel')!;
  private readonly stationKickerEl = document.getElementById('station-kicker')!;
  private readonly stationTitleEl = document.getElementById('station-title')!;
  private readonly stationMoneyEl = document.getElementById('station-money')!;
  private readonly stationLevelEl = document.getElementById('station-level')!;
  private readonly stationBodyEl = document.getElementById('station-body')!;
  private readonly stationMsgEl = document.getElementById('station-msg')!;
  private readonly caseView: CaseView;

  private contracts: Contract[] = [];
  private selectedId: string | null = null;
  private approachId: ApproachId = 'standard';
  private message = '';
  private messageError = false;
  private augMessage = '';
  private augError = false;
  private wbMessage = '';
  private wbError = false;
  private wbSelectedId: string | null = null;
  private resetArmed = false;
  private resetTimer: number | null = null;
  private stationMode = false;
  private stationView:
    | 'contracts'
    | 'deploy'
    | 'market'
    | 'supplies'
    | 'archive'
    | 'fabricator'
    | 'operator' = 'contracts';
  private stationOnly = false;
  private archiveId: string | null = null;

  constructor(
    private readonly profile: Profile,
    private readonly hooks: SafehouseHooks,
  ) {
    this.caseView = new CaseView(this.profile, {
      onClick: () => this.hooks.onClick(),
      onClose: () => this.render(),
    });
    this.root.addEventListener('click', (ev) => this.handleClick(ev));
    this.stationRoot.addEventListener('click', (ev) => this.handleClick(ev));
    this.augRoot.addEventListener('click', (ev) => this.handleAugClick(ev));
    this.wbRoot.addEventListener('click', (ev) => this.handleWorkbenchClick(ev));
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
    return !this.wbRoot.classList.contains('hidden');
  }

  openStation(kind: StationKind): void {
    this.message = '';
    this.messageError = false;
    this.augRoot.classList.add('hidden');
    this.wbRoot.classList.add('hidden');
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
    this.wbRoot.classList.add('hidden');
    this.root.classList.add('hidden');
    this.stationOnly = false;
    this.stationView = 'deploy';
    this.stationMode = true;
    this.stationRoot.classList.remove('hidden');
    this.render();
    this.stationPanel.scrollTop = 0;
  }

  openCase(): void {
    this.augRoot.classList.add('hidden');
    this.wbRoot.classList.add('hidden');
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
      this.closeWorkbench();
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

  private get selectedContract(): Contract | null {
    return this.contracts.find((c) => c.id === this.selectedId) ?? null;
  }

  show(): void {
    this.message = '';
    this.messageError = false;
    this.augRoot.classList.add('hidden');
    this.wbRoot.classList.add('hidden');
    this.stationRoot.classList.add('hidden');
    this.caseView.close();
    this.stationMode = false;
    this.stationOnly = false;
    this.root.classList.remove('hidden');
    this.panelEl.scrollTop = 0;
    this.render();
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.stationRoot.classList.add('hidden');
    this.caseView.close();
    this.augRoot.classList.add('hidden');
    this.wbRoot.classList.add('hidden');
    this.stationMode = false;
    this.stationOnly = false;
    this.resetArmed = false;
    if (this.resetTimer !== null) {
      window.clearTimeout(this.resetTimer);
      this.resetTimer = null;
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
          <span class="cnum">0${i + 1} · <b class="risk-${c.risk.toLowerCase()}">${c.risk} RISK</b></span>
          <span class="ctitle">${c.title}${locked ? ' · LOCKED' : ''}</span>
          <span class="cmeta"><b style="color:${FACTIONS[c.faction].color}">${FACTIONS[c.faction].name}</b><br>${
            c.objective === 'boss' ? objectiveText(c) : `${c.layoutName}<br>${objectiveText(c)}`
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
      ? `${objectiveDetail(selected)}<br><span class="cflavor">${selected.tagline}</span>${
          selectedMods ? `<span class="cmods detail-mods">${selectedMods}</span>` : ''
        }${
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

    this.intelEl.textContent = `3 CACHES PER SECTOR — ${(Object.keys(LOOT_DEFS) as LootKind[])
      .map((kind) => `${LOOT_DEFS[kind].name} $${LOOT_DEFS[kind].value}`)
      .join(' · ')}`;

    const baseShop = SHOP_ORDER.map((weapon) => {
      const econ = WEAPON_ECONOMY[weapon];
      const price = this.profile.weaponPrice(weapon);
      const included = econ.ammo > 0 ? `${econ.ammo} RDS INCLUDED` : 'MELEE';
      return `<div class="sh-item">
        <div class="info">
          <span class="wname">${WEAPONS[weapon].name}</span>
          <span class="wmeta">${included} · <b>$${price}</b></span>
        </div>
        <div class="sh-actions">
          <button data-act="buy" data-weapon="${weapon}">BUY $${price}</button>
        </div>
      </div>`;
    }).join('');
    const namedShop = NAMED_WEAPONS.map((def) => {
      const price = this.profile.namedPrice(def.id);
      return `<div class="sh-item">
        <div class="info">
          <span class="wname">${def.name}</span>
          <span class="wmeta">NAMED ${WEAPONS[def.base].name} · ${def.ammo} RDS · <b>$${price}</b></span>
        </div>
        <div class="sh-actions">
          <button data-act="buy-named" data-id="${def.id}">BUY $${price}</button>
        </div>
      </div>`;
    }).join('');
    this.shopEl.innerHTML = baseShop + namedShop;

    const { supplyType, supplyCharges } = this.profile.data;
    this.suppliesEl.innerHTML = CONSUMABLES.map((def) => {
      const packed = supplyType === def.id;
      const full = packed && supplyCharges >= SUPPLY_MAX;
      return `<div class="sh-item${packed ? ' armed' : ''}">
        <div class="info">
          <span class="wname">${def.name}</span>
          <span class="wmeta">${def.desc}</span>
        </div>
        <div class="sh-actions">
          <button data-act="buy-supply" data-id="${def.id}" ${full ? 'disabled' : ''}>${
            full ? 'KIT FULL' : `BUY · $${this.profile.supplyPrice(def.id)}`
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
    if (this.stationMode) this.renderStation();
    if (this.caseView.isOpen) this.caseView.render();
  }

  private renderStation(): void {
    const { money, level, xp, perkPoints } = this.profile.data;
    this.stationMoneyEl.textContent = `$${money.toLocaleString('en-US')}`;
    this.stationLevelEl.textContent = `LVL ${level} · ${xp}/${xpForNext(level)} XP · ${perkPoints} PP`;
    const meta = {
      contracts: { kicker: '// CONTRACT NET', title: 'BOUNTY BOARD' },
      deploy: { kicker: '// DEPLOYMENT', title: 'MISSION SELECT' },
      market: { kicker: '// BLACK MARKET', title: 'THE MARKET' },
      supplies: { kicker: '// SUPPLY DEPOT', title: 'SUPPLIES' },
      archive: { kicker: '// THE ARCHIVE', title: 'GHOSTS & GHOST STORIES' },
      fabricator: { kicker: '// FABRICATOR', title: 'BUILD YOUR OWN' },
      operator: { kicker: '// OPERATOR', title: 'CHARACTER SHEET' },
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
    const contractBlock = `<div class="sh-contracts station-contracts">${contracts}</div>`;
    const approaches = APPROACHES.map((a) => {
      const unlocked = approachUnlocked(a, this.profile.data.attributes);
      const active = a.id === this.approachId;
      return `<button class="approach${active ? ' selected' : ''}${unlocked ? '' : ' locked'}"
        data-act="select-approach" data-id="${a.id}" ${unlocked ? '' : 'disabled'}>
        <span class="approach-code" style="color:${a.color}">${a.code}</span>
        <span class="approach-name">${a.name}</span>
        <span class="approach-desc">${a.desc}</span>
        <span class="approach-req">${
          unlocked ? (active ? 'SELECTED' : 'READY') : `REQUIRES ${approachRequirement(a)}`
        }</span>
      </button>`;
    }).join('');

    if (this.stationView === 'contracts') {
      this.stationBodyEl.innerHTML = `
        <div class="station-grid">
          <section class="station-col">
            <div class="kicker">// AVAILABLE CONTRACTS</div>
            <h2>CONTRACT NET</h2>
            ${contractBlock}
            <button class="sh-augments station-reroll" data-act="reroll">REFRESH BOARD · $75</button>
          </section>
          <section class="station-col">
            <div class="kicker">// BRIEF</div>
            <div class="station-brief">${brief}</div>
            <h2>LOADOUT</h2>
            <div class="sh-equipped station-loadout">${equipped}</div>
            <button class="sh-deploy station-launch" data-act="open-deploy" ${selected && !selected.locked ? '' : 'disabled'}>
              ${selected ? (selected.locked ? `LOCKED · ${selected.title}` : `PROCEED TO DEPLOY · ${selected.title}`) : 'SELECT A CONTRACT'}
            </button>
          </section>
        </div>`;
    } else if (this.stationView === 'deploy') {
      this.stationBodyEl.innerHTML = `
        <div class="station-grid">
          <section class="station-col">
            <div class="kicker">// MISSION BOARD</div>
            <h2>SELECT CONTRACT</h2>
            ${contractBlock}
          </section>
          <section class="station-col">
            <div class="deploy-hero">
              <div class="kicker">// ACTIVE CONTRACT</div>
              <div class="deploy-title">${selected ? selected.title : 'NO CONTRACT'}</div>
              <div class="deploy-faction" style="${selected ? `color:${FACTIONS[selected.faction].color}` : ''}">${selected ? FACTIONS[selected.faction].name : ''}</div>
              <div class="station-brief">${brief}</div>
              <div class="handler-line">MOTH: ${selected ? handlerLine(selected.faction, selected.title.length) : '...'}</div>
            </div>
            <h2>INSERTION</h2>
            <div class="approach-list">${approaches}</div>
            <h2>LOADOUT</h2>
            <div class="sh-equipped station-loadout">${equipped}</div>
            <div class="station-summary">${summary}</div>
            <button class="sh-deploy station-launch" data-act="launch" ${selected && !selected.locked ? '' : 'disabled'}>
              ${selected?.locked ? 'LOCKED — COMPLETE 3 REGULAR CONTRACTS' : 'LAUNCH CONTRACT'}
            </button>
            <p class="sh-note">${
              selected?.locked
                ? `BOSS ACCESS LOCKED — ${this.profile.data.regularClears}/${selected.requiredClears ?? 3} regular clears.`
                : 'The packed kit is consumed on launch. Die in the sector and the carried weapon and loot are lost.'
            }</p>
          </section>
        </div>`;
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
                   <div class="archive-body">${dossier.body.map((p) => `<p>${p}</p>`).join('')}</div>
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
      const data = this.profile.data;
      const mods = this.profile.runMods();
      const attrs = data.attributes;
      const attrRows = ATTRIBUTE_DEFS.map(
        (def) => `<div class="op-attr" style="--attr:${def.color}">
          <span>${def.name}</span><b>${attrs[def.id]}</b><small>${def.short}</small>
        </div>`,
      ).join('');
      const approachRows = APPROACHES.map((a) => {
        const ok = approachUnlocked(a, attrs);
        return `<div class="op-approach${ok ? '' : ' locked'}" style="--approach:${a.color}">
          <span>${a.name}</span><b>${ok ? 'READY' : approachRequirement(a)}</b>
        </div>`;
      }).join('');
      const repRows = (Object.keys(FACTIONS) as (keyof typeof FACTIONS)[])
        .map((id) => {
          const faction = FACTIONS[id];
          const rep = this.profile.rep(id);
          const rank = this.profile.repRank(id);
          const next = nextRepRank(rep);
          const discount = Math.round(repDiscount(rep) * 100);
          const pay = Math.round(repPayBonus(rep) * 100);
          return `<div class="op-rep" style="--faction:${faction.color}">
            <div class="op-rep-name">${faction.name}<b>${rank.name}</b></div>
            <div class="op-rep-meta">${rep} REP · PAY +${pay}%${
              id === 'market' ? ` · MARKET -${discount}%` : ''
            }</div>
            <div class="op-rep-bar"><i style="width:${next ? Math.min(100, (rep / next.rank.min) * 100) : 100}%"></i></div>
            <small>${next ? `${next.remaining} TO ${next.rank.name}` : 'MAX STANDING'}</small>
          </div>`;
        })
        .join('');
      const installed = [
        ...CYBERWARE_DEFS.filter((d) => data.cyberware[d.id] > 0).map(
          (d) => `${d.name} ${data.cyberware[d.id]}/${d.maxRank}`,
        ),
        ...PERK_DEFS.filter((d) => data.perks[d.id] > 0).map(
          (d) => `${d.name} ${data.perks[d.id]}/${d.maxRank}`,
        ),
      ];
      this.stationBodyEl.innerHTML = `
        <div class="station-grid operator-grid">
          <section class="station-col">
            <div class="kicker">// BUILD</div>
            <h2>ATTRIBUTES</h2>
            <div class="op-attrs">${attrRows}</div>
            <p class="sh-note">${data.attributePoints} attribute point${data.attributePoints === 1 ? '' : 's'} available. Spend them at the clinic.</p>
            <h2>DERIVED</h2>
            <div class="op-stats">
              <span>ARMOR <b>${mods.armor}</b></span>
              <span>SPEED <b>${Math.round(mods.speed * 100)}%</b></span>
              <span>GUN CD <b>${Math.round(mods.gunCooldown * 100)}%</b></span>
              <span>SPREAD <b>${Math.round(mods.spread * 100)}%</b></span>
              <span>DETECTION <b>${Math.round(mods.vision * 100)}%</b></span>
              <span>MELEE <b>${Math.round(mods.meleeReach * 100)}%</b></span>
            </div>
            <h2>INSERTION</h2>
            <div class="op-approaches">${approachRows}</div>
          </section>
          <section class="station-col">
            <div class="kicker">// STANDING</div>
            <h2>FACTIONS</h2>
            <div class="op-reps">${repRows}</div>
            <h2>PROGRESS</h2>
            <div class="op-progress">
              <span>REGULAR CLEARS <b>${data.regularClears}/3</b></span>
              <span>BOSS <b>${data.bossCleared ? 'CLEARED' : 'LOCKED'}</b></span>
              <span>FINALE <b>${data.finalCleared ? 'CLEARED' : data.bossCleared ? 'UNLOCKED' : 'LOCKED'}</b></span>
              <span>RUNS <b>${data.runs}</b></span>
              <span>CLEARS <b>${data.clears}</b></span>
              <span>BEST <b>${data.bestTime === null ? '—' : fmtTime(data.bestTime)}</b></span>
            </div>
            <h2>INSTALLED</h2>
            <div class="op-installed">${
              installed.length
                ? installed.map((x) => `<span>${x}</span>`).join('')
                : '<span>NO AUGMENTS INSTALLED</span>'
            }</div>
            <h2>SAVE DATA</h2>
            <div class="op-save">
              <button type="button" data-act="export-save">EXPORT SAVE</button>
              <button type="button" data-act="import-save">IMPORT SAVE</button>
            </div>
            <p class="sh-note">Export a validated v2 JSON snapshot, or import a v1/v2 save. Import replaces current progress.</p>
          </section>
        </div>`;
    } else if (this.stationView === 'market') {
      this.stationBodyEl.innerHTML = `
        <div class="station-grid">
          <section class="station-col">
            <div class="kicker">// BLACK MARKET</div>
            <h2>WEAPONS</h2>
            <div class="sh-list">${shop}</div>
            <h2>SELL STORAGE</h2>
            <div class="sh-list">${stash}</div>
          </section>
          <section class="station-col">
            <h2>CONTRABAND</h2>
            <div class="sh-list">${contraband}</div>
            <p class="sh-note">${intel}</p>
            <p class="sh-note">Buy ammo from storage. Sell guns and contraband here; pack consumables at the supply depot.</p>
          </section>
        </div>`;
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
      case 'launch':
        this.hooks.onClick();
        if (this.selectedId && !this.selectedContract?.locked) {
          this.hooks.onDeploy(this.selectedId, this.approachId);
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
          this.message = 'BOARD REFRESHED · $75';
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
            <span class="aug-attr-short">${def.short}</span>
            <span class="aug-attr-desc">${def.desc}</span>
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

    this.augCyberwareEl.innerHTML = CYBERWARE_DEFS.map((def) => {
      const rank = cyberware[def.id];
      const maxed = rank >= def.maxRank;
      const cost = maxed ? 0 : this.profile.cyberwarePrice(def.id);
      return `<div class="aug-item">
        <div class="aug-info">
          <span class="aug-name">${def.name}</span>
          <span class="aug-desc">${def.desc}</span>
          <span class="aug-rank">RANK ${rank}/${def.maxRank}</span>
        </div>
        <div class="sh-actions aug-action">
          <span class="aug-cost">${maxed ? 'MAX' : `$${cost}`}</span>
          <button data-act="install" data-id="${def.id}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAXED' : 'INSTALL'}</button>
        </div>
      </div>`;
    }).join('');

    this.augPerksEl.innerHTML = PERK_DEFS.map((def) => {
      const rank = perks[def.id];
      const maxed = rank >= def.maxRank;
      return `<div class="aug-item">
        <div class="aug-info">
          <span class="aug-name">${def.name}</span>
          <span class="aug-desc">${def.desc}</span>
          <span class="aug-rank">RANK ${rank}/${def.maxRank}</span>
        </div>
        <div class="sh-actions aug-action">
          <span class="aug-cost">${maxed ? 'MAX' : '1 PT'}</span>
          <button data-act="train" data-id="${def.id}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAXED' : 'TRAIN'}</button>
        </div>
      </div>`;
    }).join('');

    this.augMsgEl.textContent = this.augMessage;
    this.augMsgEl.classList.toggle('err', this.augError);
  }

  private openWorkbench(): void {
    const guns = this.profile.data.stash.filter((item) => isGun(item.weapon));
    if (!guns.some((g) => g.id === this.wbSelectedId)) {
      this.wbSelectedId = guns[0]?.id ?? null;
    }
    this.wbMessage = '';
    this.wbError = false;
    this.wbRoot.classList.remove('hidden');
    this.renderWorkbench();
    this.wbCloseEl.focus();
  }

  private closeWorkbench(): void {
    this.wbRoot.classList.add('hidden');
    if (this.stationOnly) {
      this.stationOnly = false;
      this.hooks.onClose();
      return;
    }
    this.workbenchBtn.focus();
    this.render();
  }

  private renderWorkbench(): void {
    const guns = this.profile.data.stash.filter((item) => isGun(item.weapon));
    if (!guns.some((g) => g.id === this.wbSelectedId)) {
      this.wbSelectedId = guns[0]?.id ?? null;
    }
    const selected = guns.find((g) => g.id === this.wbSelectedId) ?? null;
    const marketDiscount = Math.round(this.profile.discountFor('market') * 100);
    this.wbMoneyEl.textContent = `$${this.profile.data.money.toLocaleString('en-US')}${
      marketDiscount > 0 ? ` · MARKET -${marketDiscount}%` : ''
    }`;

    this.wbGunsEl.innerHTML =
      guns.length === 0
        ? `<div class="sh-note">NO FIREARMS IN STORAGE. BUY A PISTOL OR SHOTGUN FIRST.</div>`
        : guns
            .map((gun) => {
              const name = gun.variant
                ? NAMED_MAP[gun.variant].name
                : WEAPONS[gun.weapon].name;
              const mod = gun.attachment ? ATTACHMENT_MAP[gun.attachment].name : 'NO ATTACHMENT';
              return `<button class="wb-gun${gun.id === this.wbSelectedId ? ' selected' : ''}"
                data-act="select-gun" data-id="${gun.id}">
                <span class="wname">${name}</span>
                <span class="wmeta">${gun.ammo} RDS · ${mod}</span>
              </button>`;
            })
            .join('');

    this.wbAttachmentsEl.innerHTML =
      ATTACHMENTS.map((def) => {
        const installed = selected?.attachment === def.id;
        const disabled = !selected || installed;
        return `<div class="aug-item">
          <div class="aug-info">
            <span class="aug-name">${def.name}</span>
            <span class="aug-desc">${def.desc}</span>
          </div>
          <div class="sh-actions aug-action">
            <span class="aug-cost">$${this.profile.attachmentPrice(def.id)}</span>
            <button data-act="install" data-id="${def.id}" ${disabled ? 'disabled' : ''}>${installed ? 'INSTALLED' : 'INSTALL'}</button>
          </div>
        </div>`;
      }).join('') +
      (selected?.attachment
        ? `<div class="wb-strip"><button class="sh-reset" data-act="strip">STRIP ${ATTACHMENT_MAP[selected.attachment].name}</button></div>`
        : '');

    this.wbMsgEl.textContent = this.wbMessage;
    this.wbMsgEl.classList.toggle('err', this.wbError);
  }

  private handleWorkbenchClick(ev: MouseEvent): void {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    if (act === 'close-workbench') {
      this.hooks.onClick();
      this.closeWorkbench();
      return;
    }
    if (act === 'select-gun') {
      const id = target.dataset.id;
      if (!id) return;
      this.wbSelectedId = id;
      this.hooks.onClick();
      this.renderWorkbench();
      return;
    }
    if (!this.wbSelectedId) return;
    let error: string | null = null;
    let success = '';
    if (act === 'install') {
      const id = target.dataset.id as AttachmentId | undefined;
      if (!id) return;
      error = this.profile.installAttachment(this.wbSelectedId, id);
      success = `${ATTACHMENT_MAP[id].name} INSTALLED`;
    } else if (act === 'strip') {
      error = this.profile.stripAttachment(this.wbSelectedId);
      success = 'ATTACHMENT STRIPPED';
    } else {
      return;
    }
    if (error) {
      this.wbMessage = error;
      this.wbError = true;
      this.hooks.onError();
    } else {
      this.wbMessage = success;
      this.wbError = false;
      this.hooks.onClick();
    }
    this.renderWorkbench();
    this.render();
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

  private handleReset(): void {
    if (!this.resetArmed) {
      this.resetArmed = true;
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
