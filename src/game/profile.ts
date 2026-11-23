import { randomSeed, mulberry32 } from '../core/math';
import { GunId, NamedWeaponId, NAMED_MAP, NAMED_WEAPONS, WEAPONS, WeaponId, isGun } from './weapons';
import { AMMO_PACKS, LOOT_DEFS, LootKind, WEAPON_ECONOMY } from './economy';
import { ATTACHMENT_MAP, AttachmentId } from './attachments';
import { canPlace, findFree, type CasePlacement } from './inventory';
import {
  ATTRIBUTE_DEFS,
  ATTR_MAX,
  Attributes,
  EMPTY_ATTRIBUTES,
  attributesSpent,
  normalizeAttributes,
} from './attributes';
import { ComponentId, RECIPES, type Recipe } from './crafting';
import {
  EMPTY_REPUTATION,
  normalizeReputation,
  repDiscount,
  repRank,
  Reputation,
  RepRank,
} from './reputation';
import type { FactionId } from './lore';
import { BOSS_ORDER, type BossId } from './bosses';
import { ENDINGS, type EndingId } from './endings';
import {
  CONSUMABLE_MAP,
  ConsumableId,
  SUPPLY_MAX,
} from './consumables';
import {
  computeMods,
  CYBERWARE_DEFS,
  CyberwareId,
  CyberwareRanks,
  EMPTY_CYBERWARE,
  EMPTY_PERKS,
  PerkId,
  PerkRanks,
  PERK_DEFS,
  RunMods,
  humanityCapacity,
  humanityLabel,
  humanityStage,
  humanityUsed,
  xpForNext,
} from './progression';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'punkgun.save.v2';
export const LEGACY_SAVE_KEY = 'punkgun.save.v1';
export const SAVE_SLOT_COUNT = 3;

export type RecoverySource = 'backup' | 'legacy' | 'quarantine';

export interface SaveRecovery {
  source: RecoverySource;
  /** Key holding the rejected payload, when one was preserved. */
  quarantinedKey: string | null;
  /** True when the primary slot was unreadable and had to be bypassed. */
  primaryCorrupt: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface SaveEnvelope {
  version: number;
  savedAt: number;
  profile: ProfileData;
}

export interface SaveSlotInfo {
  slot: number;
  exists: boolean;
  version: number | null;
  savedAt: number | null;
  money: number | null;
  level: number | null;
  runs: number | null;
  clears: number | null;
}

export function normalizeSaveSlot(slot: number): number {
  const n = Math.floor(slot);
  if (!Number.isFinite(n)) return 1;
  return Math.min(SAVE_SLOT_COUNT, Math.max(1, n));
}

/** Slot 1 uses the canonical key; additional slots are namespaced. */
export function slotKey(slot: number): string {
  const n = normalizeSaveSlot(slot);
  return n === 1 ? SAVE_KEY : `${SAVE_KEY}.slot.${n}`;
}

/** Previous known-good payload for a slot. */
export function backupKey(slot: number): string {
  return `${slotKey(slot)}.bak`;
}

/** Last rejected payload for a slot, preserved for manual recovery. */
export function corruptKey(slot: number): string {
  return `${slotKey(slot)}.corrupt`;
}

function getBrowserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function encodeSave(data: ProfileData, savedAt = Date.now()): string {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, savedAt, profile: data };
  return JSON.stringify(envelope);
}

/**
 * Accept a v2 envelope or a raw v1 profile. Future versions and arbitrary
 * objects are rejected instead of being silently coerced into a profile.
 */
export function unwrapSave(root: unknown): Partial<ProfileData> | null {
  if (!root || typeof root !== 'object') return null;
  const obj = root as Record<string, unknown>;
  if (typeof obj.version === 'number') {
    if (obj.version !== SAVE_VERSION) return null;
    if (!obj.profile || typeof obj.profile !== 'object') return null;
    return obj.profile as Partial<ProfileData>;
  }
  if ('stash' in obj || 'money' in obj || 'level' in obj) {
    return obj as Partial<ProfileData>;
  }
  return null;
}

/** Read slot metadata without migrating or replacing anything. */
export function listSaveSlots(
  storage: StorageLike | null = getBrowserStorage(),
): SaveSlotInfo[] {
  const out: SaveSlotInfo[] = [];
  for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
    const primary = storage?.getItem(slotKey(slot)) ?? null;
    const legacy = slot === 1 ? storage?.getItem(LEGACY_SAVE_KEY) ?? null : null;
    const raw = primary ?? legacy;
    if (!raw) {
      out.push({
        slot,
        exists: false,
        version: null,
        savedAt: null,
        money: null,
        level: null,
        runs: null,
        clears: null,
      });
      continue;
    }
    let version: number | null = null;
    let savedAt: number | null = null;
    let profile: Partial<ProfileData> | null = null;
    try {
      const root = JSON.parse(raw) as unknown;
      const obj = root && typeof root === 'object' ? (root as Record<string, unknown>) : null;
      version = obj && typeof obj.version === 'number' ? obj.version : 1;
      savedAt =
        obj && typeof obj.savedAt === 'number' && Number.isFinite(obj.savedAt)
          ? obj.savedAt
          : null;
      profile = unwrapSave(root);
    } catch {
      version = null;
    }
    out.push({
      slot,
      exists: true,
      version,
      savedAt,
      money: numberOrNull(profile?.money),
      level: numberOrNull(profile?.level),
      runs: numberOrNull(profile?.runs),
      clears: numberOrNull(profile?.clears),
    });
  }
  return out;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface StashItem extends CasePlacement {
  id: string;
  weapon: WeaponId;
  ammo: number;
  attachment: AttachmentId | null;
  variant: NamedWeaponId | null;
}

export interface MarketState {
  seed: number;
  refreshedRun: number;
  stock: Record<string, number>;
}

export type StockKind = 'weapon' | 'named' | 'attachment' | 'supply';

/** Stable storage key for a market entry. */
export function stockKey(kind: StockKind, id: string): string {
  return `${kind}:${id}`;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const STOCK_RANGE: Record<StockKind, [number, number]> = {
  weapon: [1, 2],
  named: [1, 1],
  attachment: [1, 2],
  supply: [2, 4],
};

function rollStock(seed: number): Record<string, number> {
  const rng = mulberry32(seed);
  const stock: Record<string, number> = {};
  const groups: Array<[StockKind, string[]]> = [
    ['weapon', Object.keys(WEAPON_ECONOMY)],
    ['named', NAMED_WEAPONS.map((def) => def.id)],
    ['attachment', Object.keys(ATTACHMENT_MAP)],
    ['supply', Object.keys(CONSUMABLE_MAP)],
  ];
  for (const [kind, ids] of groups) {
    const [min, max] = STOCK_RANGE[kind];
    for (const id of ids) {
      stock[stockKey(kind, id)] = min + Math.floor(rng() * (max - min + 1));
    }
  }
  return stock;
}

export function priceDrift(seed: number, key: string): number {
  const rng = mulberry32((seed ^ hashString(key)) >>> 0);
  return (rng() * 0.24 - 0.12);
}

export interface ProfileData {
  money: number;
  stash: StashItem[];
  equippedId: string | null;
  bestTime: number | null;
  runs: number;
  clears: number;
  bossCleared: boolean;
  finalCleared: boolean;
  contraband: Record<LootKind, number>;
  level: number;
  xp: number;
  perkPoints: number;
  cyberware: CyberwareRanks;
  perks: PerkRanks;
  supplyType: ConsumableId | null;
  supplyCharges: number;
  components: Record<ComponentId, number>;
  attributes: Attributes;
  attributePoints: number;
  regularClears: number;
  reputation: Reputation;
  /** Boss gates defeated, one flag per authored arena. */
  bossesCleared: Record<BossId, boolean>;
  /** Authored campaign beats already banked. */
  completedContracts: string[];
  /** Chosen finale, null until the Spire falls. */
  ending: EndingId | null;
  /** Seeded rotating market stock and price drift. */
  market: MarketState;
  /** Three quick-loadout recipes pointing at stash fits. */
  presets: Array<LoadoutPreset | null>;
}

const EMPTY_BOSSES: Record<BossId, boolean> = {
  psycho: false,
  grin: false,
  crane: false,
  board: false,
};

const EMPTY_COMPONENTS: Record<ComponentId, number> = {
  scrap: 0,
  circuit: 0,
  polymer: 0,
  biogel: 0,
};

const EMPTY_CONTRABAND: Record<LootKind, number> = { shard: 0, chip: 0, optic: 0 };

export interface RunLoadout {
  weapon: WeaponId;
  ammo: number;
  attachment: AttachmentId | null;
  variant: NamedWeaponId | null;
  supplyType: ConsumableId | null;
  supplyCharges: number;
}

export interface LoadoutPreset {
  name: string;
  weapon: WeaponId;
  variant: NamedWeaponId | null;
  attachment: AttachmentId | null;
  supplyType: ConsumableId | null;
}

function freshId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultData(): ProfileData {
  const starter: StashItem = {
    id: freshId(),
    weapon: 'pistol',
    ammo: 8,
    attachment: null,
    variant: null,
    cellX: 0,
    cellY: 0,
    turned: false,
  };
  return {
    money: 120,
    stash: [starter],
    equippedId: starter.id,
    bestTime: null,
    runs: 0,
    clears: 0,
    bossCleared: false,
    finalCleared: false,
    contraband: { ...EMPTY_CONTRABAND },
    level: 1,
    xp: 0,
    perkPoints: 0,
    cyberware: { ...EMPTY_CYBERWARE },
    perks: { ...EMPTY_PERKS },
    supplyType: null,
    supplyCharges: 0,
    components: { ...EMPTY_COMPONENTS },
    attributes: { ...EMPTY_ATTRIBUTES },
    attributePoints: 0,
    regularClears: 0,
    reputation: { ...EMPTY_REPUTATION },
    bossesCleared: { ...EMPTY_BOSSES },
    completedContracts: [],
    ending: null,
    market: { seed: 0, refreshedRun: 0, stock: {} },
    presets: [null, null, null],
  };
}

const VALID_WEAPONS: Record<WeaponId, true> = {
  fists: true,
  bat: true,
  pistol: true,
  revolver: true,
  shotgun: true,
  smg: true,
  carbine: true,
  needler: true,
  rifle: true,
  dmr: true,
  ak: true,
  lmg: true,
  plasma: true,
  railgun: true,
};

/**
 * Persistent meta state: credits, owned weapons, equipped loadout, run stats.
 * All mutations save immediately; a run is resolved through beginRun()/bankClear().
 */
export class Profile {
  data: ProfileData;
  slot: number;
  /** Set when startup had to bypass or restore a damaged save. */
  lastRecovery: SaveRecovery | null = null;
  private storage: StorageLike | null;
  private lastGoodRaw: string | null = null;
  private lastGoodContent: string | null = null;

  constructor(slot = 1, storage: StorageLike | null = getBrowserStorage()) {
    this.slot = normalizeSaveSlot(slot);
    this.storage = storage;
    this.data = this.load();
    this.ensureMarket();
    this.layoutCase();
    this.save();
  }

  static listSlots(storage: StorageLike | null = getBrowserStorage()): SaveSlotInfo[] {
    return listSaveSlots(storage);
  }

  private load(): ProfileData {
    if (!this.storage) return defaultData();
    const key = slotKey(this.slot);
    const primary = this.storage.getItem(key);
    let primaryCorrupt = false;

    if (primary) {
      const decoded = this.decode(primary);
      if (decoded) {
        this.lastGoodRaw = primary;
        this.lastGoodContent = JSON.stringify(decoded);
        return decoded;
      }
      primaryCorrupt = true;
      const quarantinedKey = this.quarantine(primary);
      const backup = this.storage.getItem(backupKey(this.slot));
      if (backup) {
        const recovered = this.decode(backup);
        if (recovered) {
          this.lastGoodRaw = backup;
          this.lastGoodContent = JSON.stringify(recovered);
          this.lastRecovery = { source: 'backup', quarantinedKey, primaryCorrupt };
          return recovered;
        }
      }
      this.lastRecovery = { source: 'quarantine', quarantinedKey, primaryCorrupt };
    }

    if (this.slot === 1) {
      const legacy = this.storage.getItem(LEGACY_SAVE_KEY);
      if (legacy) {
        const migrated = this.decode(legacy);
        if (migrated) {
          this.lastRecovery = {
            source: 'legacy',
            quarantinedKey: primaryCorrupt ? corruptKey(this.slot) : null,
            primaryCorrupt,
          };
          return migrated;
        }
      }
    }

    return defaultData();
  }

  /** Preserve an unreadable payload without letting it break startup. */
  private quarantine(raw: string): string | null {
    if (!this.storage) return null;
    const key = corruptKey(this.slot);
    try {
      this.storage.setItem(key, raw);
      return key;
    } catch {
      return null;
    }
  }

  private decode(raw: string): ProfileData | null {
    try {
      const root = JSON.parse(raw) as unknown;
      const parsed = unwrapSave(root);
      if (!parsed) return null;

      const fallback = defaultData();
      const stash: StashItem[] = Array.isArray(parsed.stash)
        ? parsed.stash
            .filter(
              (item): item is StashItem =>
                !!item &&
                typeof item.id === 'string' &&
                VALID_WEAPONS[item.weapon as WeaponId] === true &&
                item.weapon !== 'fists' &&
                typeof item.ammo === 'number' &&
                Number.isFinite(item.ammo),
            )
            .map((item) => {
              const attachment =
                item.attachment &&
                ATTACHMENT_MAP[item.attachment] &&
                isGun(item.weapon)
                  ? item.attachment
                  : null;
              const variant =
                item.variant &&
                NAMED_MAP[item.variant] &&
                NAMED_MAP[item.variant].base === item.weapon
                  ? item.variant
                  : null;
              return {
                id: item.id,
                weapon: item.weapon,
                ammo: Math.max(0, Math.floor(item.ammo)),
                attachment,
                variant,
                cellX: typeof item.cellX === 'number' ? Math.floor(item.cellX) : 0,
                cellY: typeof item.cellY === 'number' ? Math.floor(item.cellY) : 0,
                turned: item.turned === true,
              };
            })
        : [];

      const equippedId =
        typeof parsed.equippedId === 'string' && stash.some((s) => s.id === parsed.equippedId)
          ? parsed.equippedId
          : null;

      const contraband = { ...EMPTY_CONTRABAND };
      const rawContraband = parsed.contraband;
      for (const kind of Object.keys(contraband) as LootKind[]) {
        const value = rawContraband?.[kind];
        contraband[kind] =
          typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      }

      const cyberware = { ...EMPTY_CYBERWARE };
      for (const def of CYBERWARE_DEFS) {
        const value = parsed.cyberware?.[def.id];
        cyberware[def.id] =
          typeof value === 'number' && Number.isFinite(value)
            ? Math.max(0, Math.min(def.maxRank, Math.floor(value)))
            : 0;
      }
      const components = { ...EMPTY_COMPONENTS };
      for (const id of Object.keys(components) as ComponentId[]) {
        const value = parsed.components?.[id];
        components[id] =
          typeof value === 'number' && Number.isFinite(value)
            ? Math.max(0, Math.floor(value))
            : 0;
      }
      const perks = { ...EMPTY_PERKS };
      for (const def of PERK_DEFS) {
        const value = parsed.perks?.[def.id];
        perks[def.id] =
          typeof value === 'number' && Number.isFinite(value)
            ? Math.max(0, Math.min(def.maxRank, Math.floor(value)))
            : 0;
      }

      const attributes = normalizeAttributes(parsed.attributes);
      const level =
        typeof parsed.level === 'number' && Number.isFinite(parsed.level)
          ? Math.max(1, Math.floor(parsed.level))
          : 1;
      const attributePoints =
        typeof parsed.attributePoints === 'number' && Number.isFinite(parsed.attributePoints)
          ? Math.max(0, Math.floor(parsed.attributePoints))
          : Math.max(0, level - 1 - attributesSpent(attributes));
      const regularClears =
        typeof parsed.regularClears === 'number' && Number.isFinite(parsed.regularClears)
          ? Math.max(0, Math.floor(parsed.regularClears))
          : Math.max(
              0,
              (typeof parsed.clears === 'number' ? Math.max(0, Math.floor(parsed.clears)) : 0) -
                (parsed.bossCleared === true ? 1 : 0) -
                (parsed.finalCleared === true ? 1 : 0),
            );
      const reputation = normalizeReputation(parsed.reputation);
      const bossesCleared = { ...EMPTY_BOSSES };
      const rawBosses = parsed.bossesCleared as Partial<Record<BossId, boolean>> | undefined;
      for (const id of BOSS_ORDER) {
        bossesCleared[id] = rawBosses?.[id] === true;
      }
      // v2 saves only tracked the first boss; preserve that progress.
      if (parsed.bossCleared === true) bossesCleared.psycho = true;
      const completedContracts = Array.isArray(parsed.completedContracts)
        ? parsed.completedContracts.filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          )
        : [];
      const ending =
        typeof parsed.ending === 'string' && parsed.ending in ENDINGS
          ? (parsed.ending as EndingId)
          : null;
      const rawMarket = parsed.market as Partial<MarketState> | undefined;
      const market: MarketState = {
        seed:
          typeof rawMarket?.seed === 'number' && Number.isFinite(rawMarket.seed)
            ? rawMarket.seed >>> 0
            : 0,
        refreshedRun:
          typeof rawMarket?.refreshedRun === 'number' &&
          Number.isFinite(rawMarket.refreshedRun)
            ? Math.max(0, Math.floor(rawMarket.refreshedRun))
            : 0,
        stock: {},
      };
      if (rawMarket?.stock && typeof rawMarket.stock === 'object') {
        for (const [key, value] of Object.entries(rawMarket.stock)) {
          if (typeof value === 'number' && Number.isFinite(value)) {
            market.stock[key] = Math.max(0, Math.floor(value));
          }
        }
      }
      const presets: Array<LoadoutPreset | null> = [null, null, null];
      const rawPresets = parsed.presets;
      if (Array.isArray(rawPresets)) {
        for (let i = 0; i < presets.length; i++) {
          const raw = rawPresets[i] as Partial<LoadoutPreset> | null | undefined;
          if (!raw || typeof raw !== 'object') continue;
          if (typeof raw.weapon !== 'string' || VALID_WEAPONS[raw.weapon as WeaponId] !== true) {
            continue;
          }
          presets[i] = {
            name: typeof raw.name === 'string' ? raw.name.slice(0, 20) : `PRESET ${i + 1}`,
            weapon: raw.weapon as WeaponId,
            variant:
              typeof raw.variant === 'string' && NAMED_MAP[raw.variant as NamedWeaponId]
                ? (raw.variant as NamedWeaponId)
                : null,
            attachment:
              typeof raw.attachment === 'string' &&
              ATTACHMENT_MAP[raw.attachment as AttachmentId]
                ? (raw.attachment as AttachmentId)
                : null,
            supplyType:
              typeof raw.supplyType === 'string' &&
              CONSUMABLE_MAP[raw.supplyType as ConsumableId]
                ? (raw.supplyType as ConsumableId)
                : null,
          };
        }
      }

      return {
        money:
          typeof parsed.money === 'number' && Number.isFinite(parsed.money)
            ? Math.max(0, Math.floor(parsed.money))
            : fallback.money,
        stash,
        equippedId,
        bestTime:
          typeof parsed.bestTime === 'number' && Number.isFinite(parsed.bestTime) && parsed.bestTime > 0
            ? parsed.bestTime
            : null,
        runs: typeof parsed.runs === 'number' ? Math.max(0, Math.floor(parsed.runs)) : 0,
        clears: typeof parsed.clears === 'number' ? Math.max(0, Math.floor(parsed.clears)) : 0,
        bossCleared: parsed.bossCleared === true,
        finalCleared: parsed.finalCleared === true,
        contraband,
        level,
        xp:
          typeof parsed.xp === 'number' && Number.isFinite(parsed.xp)
            ? Math.max(0, Math.floor(parsed.xp))
            : 0,
        perkPoints:
          typeof parsed.perkPoints === 'number' && Number.isFinite(parsed.perkPoints)
            ? Math.max(0, Math.floor(parsed.perkPoints))
            : 0,
        cyberware,
        perks,
        components,
        attributes,
        attributePoints,
        regularClears,
        reputation,
        bossesCleared,
        completedContracts,
        ending,
        market,
        presets,
        supplyType:
          parsed.supplyType && CONSUMABLE_MAP[parsed.supplyType] ? parsed.supplyType : null,
        supplyCharges:
          parsed.supplyType && CONSUMABLE_MAP[parsed.supplyType] &&
          typeof parsed.supplyCharges === 'number' &&
          Number.isFinite(parsed.supplyCharges)
            ? Math.max(0, Math.min(SUPPLY_MAX, Math.floor(parsed.supplyCharges)))
            : 0,
      };
    } catch {
      return null;
    }
  }

  save(): void {
    if (!this.storage) return;
    try {
      const key = slotKey(this.slot);
      const raw = encodeSave(this.data);
      const content = JSON.stringify(this.data);
      if (this.lastGoodRaw && this.lastGoodContent !== content) {
        this.storage.setItem(backupKey(this.slot), this.lastGoodRaw);
      }
      this.storage.setItem(key, raw);
      this.lastGoodRaw = raw;
      this.lastGoodContent = content;
    } catch {
      // Storage can be unavailable (private mode); the session still plays.
    }
  }

  /** Rotate stock every two runs, or repair a legacy market with missing keys. */
  ensureMarket(force = false): boolean {
    const stale =
      force ||
      this.data.market.seed === 0 ||
      this.data.runs - this.data.market.refreshedRun >= 2;
    if (stale) {
      const seed = randomSeed();
      this.data.market = {
        seed,
        refreshedRun: this.data.runs,
        stock: rollStock(seed),
      };
      this.save();
      return true;
    }
    const expected = rollStock(this.data.market.seed);
    let changed = false;
    for (const [key, value] of Object.entries(expected)) {
      if (this.data.market.stock[key] === undefined) {
        this.data.market.stock[key] = value;
        changed = true;
      }
    }
    if (changed) this.save();
    return false;
  }

  stockFor(key: string): number {
    return Math.max(0, this.data.market.stock[key] ?? 0);
  }

  private takeStock(key: string): boolean {
    const count = this.stockFor(key);
    if (count <= 0) return false;
    this.data.market.stock[key] = count - 1;
    return true;
  }

  priceDrift(key: string): number {
    return priceDrift(this.data.market.seed, key);
  }

  marketPrice(key: string, base: number): number {
    return Math.max(1, Math.round(base * (1 + this.priceDrift(key))));
  }

  refreshMarket(cost = 50): string | null {
    if (this.data.money < cost) return 'NOT ENOUGH CREDITS';
    this.data.money -= cost;
    this.ensureMarket(true);
    this.save();
    return null;
  }

  exportSave(): string {
    return encodeSave(this.data);
  }

  importSave(raw: string): string | null {
    const data = this.decode(raw);
    if (!data) return 'INVALID SAVE';
    this.data = data;
    this.layoutCase();
    this.save();
    return null;
  }

  /** Human-readable startup recovery notice; null when the save was clean. */
  recoveryNote(): string | null {
    const recovery = this.lastRecovery;
    if (!recovery) return null;
    if (recovery.source === 'backup') {
      return 'SAVE RECOVERED FROM LAST KNOWN-GOOD BACKUP';
    }
    if (recovery.source === 'legacy') {
      return 'LEGACY SAVE MIGRATED';
    }
    return recovery.quarantinedKey
      ? 'CORRUPT SAVE QUARANTINED — STARTED FRESH'
      : 'SAVE UNREADABLE — STARTED FRESH';
  }

  /** Switch the active profile to another slot, creating it if empty. */
  loadSlot(slot: number): void {
    this.slot = normalizeSaveSlot(slot);
    this.data = this.load();
    this.ensureMarket();
    this.layoutCase();
    this.save();
  }

  /** Copy the current profile into another slot without switching away. */
  copyToSlot(slot: number): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(slotKey(slot), encodeSave(this.data));
      return true;
    } catch {
      return false;
    }
  }

  get equipped(): StashItem | undefined {
    return this.data.stash.find((item) => item.id === this.data.equippedId);
  }

  layoutCase(): void {
    const placed: StashItem[] = [];
    for (const item of this.data.stash) {
      if (
        item.cellX >= 0 &&
        item.cellY >= 0 &&
        canPlace(placed, item.id, item.weapon, item.cellX, item.cellY, item.turned)
      ) {
        placed.push(item);
        continue;
      }
      const free = findFree(placed, item.id, item.weapon);
      if (free) {
        item.cellX = free.cellX;
        item.cellY = free.cellY;
        item.turned = free.turned;
        placed.push(item);
      } else {
        item.cellX = -1;
        item.cellY = -1;
      }
    }
    this.save();
  }

  autoArrange(): void {
    for (const item of this.data.stash) {
      item.cellX = -1;
      item.cellY = -1;
      item.turned = false;
    }
    this.layoutCase();
  }

  placeItem(id: string, x: number, y: number, turned: boolean): boolean {
    const item = this.data.stash.find((s) => s.id === id);
    if (!item) return false;
    if (!canPlace(this.data.stash, id, item.weapon, x, y, turned)) return false;
    item.cellX = x;
    item.cellY = y;
    item.turned = turned;
    this.save();
    return true;
  }

  rotateItem(id: string): boolean {
    const item = this.data.stash.find((s) => s.id === id);
    if (!item) return false;
    const turned = !item.turned;
    if (canPlace(this.data.stash, id, item.weapon, item.cellX, item.cellY, turned)) {
      item.turned = turned;
      this.save();
      return true;
    }
    const free = findFree(
      this.data.stash.filter((s) => s.id !== id),
      id,
      item.weapon,
    );
    if (!free) return false;
    item.cellX = free.cellX;
    item.cellY = free.cellY;
    item.turned = free.turned;
    this.save();
    return true;
  }

  addComponent(count = 1): ComponentId {
    let id: ComponentId = 'scrap';
    for (let i = 0; i < Math.max(1, count); i++) {
      const roll = Math.random();
      id = roll < 0.45 ? 'scrap' : roll < 0.72 ? 'polymer' : roll < 0.9 ? 'circuit' : 'biogel';
      this.data.components[id]++;
    }
    this.save();
    return id;
  }

  canCraft(recipe: Recipe): boolean {
    return (Object.keys(recipe.cost) as ComponentId[]).every(
      (id) => this.data.components[id] >= (recipe.cost[id] ?? 0),
    );
  }

  craft(recipeId: string): string | null {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return 'UNKNOWN RECIPE';
    if (!this.canCraft(recipe)) return 'MISSING COMPONENTS';
    const out = recipe.output;
    let success = false;
    let error: string | null = null;
    if (out.kind === 'weapon') {
      const id = freshId();
      const free = findFree(this.data.stash, id, out.weapon);
      if (!free) {
        error = 'CASE FULL';
      } else {
        const econ = WEAPON_ECONOMY[out.weapon];
        const item: StashItem = {
          id,
          weapon: out.weapon,
          ammo: econ.ammo,
          attachment: null,
          variant: null,
          ...free,
        };
        this.data.stash.push(item);
        if (!this.data.equippedId) this.data.equippedId = item.id;
        success = true;
      }
    } else if (out.kind === 'ammo') {
      const item = this.equipped;
      if (!item || !isGun(item.weapon)) {
        error = 'EQUIP A FIREARM';
      } else {
        const pack = AMMO_PACKS[item.weapon];
        if (item.ammo >= pack.max) error = 'AMMUNITION AT CAPACITY';
        else {
          item.ammo = Math.min(pack.max, item.ammo + pack.add);
          success = true;
        }
      }
    } else if (out.kind === 'attachment') {
      const item = this.equipped;
      if (!item || !isGun(item.weapon)) error = 'EQUIP A FIREARM';
      else if (item.attachment === out.attachment) error = 'ALREADY INSTALLED';
      else {
        item.attachment = out.attachment;
        success = true;
      }
    } else {
      if (this.data.supplyType && this.data.supplyType !== out.supply) {
        error = 'CLEAR THE CURRENT KIT FIRST';
      } else if (this.data.supplyCharges >= SUPPLY_MAX) {
        error = 'KIT FULL';
      } else {
        this.data.supplyType = out.supply;
        this.data.supplyCharges++;
        success = true;
      }
    }
    if (!success) return error ?? 'FABRICATION FAILED';
    for (const id of Object.keys(recipe.cost) as ComponentId[]) {
      this.data.components[id] = Math.max(
        0,
        this.data.components[id] - (recipe.cost[id] ?? 0),
      );
    }
    this.save();
    return null;
  }

  buyWeapon(weapon: Exclude<WeaponId, 'fists'>): string | null {
    const econ = WEAPON_ECONOMY[weapon];
    const price = this.weaponPrice(weapon);
    if (this.data.money < price) return 'NOT ENOUGH CREDITS';
    const id = freshId();
    const free = findFree(this.data.stash, id, weapon);
    if (!free) return 'CASE FULL';
    if (!this.takeStock(stockKey('weapon', weapon))) return 'OUT OF STOCK';
    this.data.money -= price;
    const item: StashItem = {
      id,
      weapon,
      ammo: econ.ammo,
      attachment: null,
      variant: null,
      ...free,
    };
    this.data.stash.push(item);
    if (!this.data.equippedId) this.data.equippedId = item.id;
    this.save();
    return null;
  }

  buyNamed(id: NamedWeaponId): string | null {
    const def = NAMED_MAP[id];
    if (!def) return 'UNKNOWN WEAPON';
    const price = this.namedPrice(id);
    if (this.data.money < price) return 'NOT ENOUGH CREDITS';
    const itemId = freshId();
    const free = findFree(this.data.stash, itemId, def.base);
    if (!free) return 'CASE FULL';
    if (!this.takeStock(stockKey('named', id))) return 'OUT OF STOCK';
    this.data.money -= price;
    const item: StashItem = {
      id: itemId,
      weapon: def.base,
      ammo: def.ammo,
      attachment: null,
      variant: id,
      ...free,
    };
    this.data.stash.push(item);
    if (!this.data.equippedId) this.data.equippedId = item.id;
    this.save();
    return null;
  }

  installAttachment(itemId: string, attachmentId: AttachmentId): string | null {
    const item = this.data.stash.find((s) => s.id === itemId);
    if (!item) return 'WEAPON NOT FOUND';
    if (!isGun(item.weapon)) return 'MELEE WEAPONS CANNOT TAKE ATTACHMENTS';
    const def = ATTACHMENT_MAP[attachmentId];
    if (!def) return 'UNKNOWN ATTACHMENT';
    if (item.attachment === attachmentId) return 'ALREADY INSTALLED';
    const price = this.attachmentPrice(attachmentId);
    if (this.data.money < price) return 'NOT ENOUGH CREDITS';
    if (!this.takeStock(stockKey('attachment', attachmentId))) return 'OUT OF STOCK';
    this.data.money -= price;
    item.attachment = attachmentId;
    this.save();
    return null;
  }

  stripAttachment(itemId: string): string | null {
    const item = this.data.stash.find((s) => s.id === itemId);
    if (!item) return 'WEAPON NOT FOUND';
    if (!item.attachment) return 'NO ATTACHMENT INSTALLED';
    item.attachment = null;
    this.save();
    return null;
  }

  sellValue(item: StashItem): number {
    if (item.variant) return Math.floor(NAMED_MAP[item.variant].price * 0.55);
    return WEAPON_ECONOMY[item.weapon as Exclude<WeaponId, 'fists'>].sell;
  }

  buyAmmo(id: string): string | null {
    const item = this.data.stash.find((s) => s.id === id);
    if (!item) return 'WEAPON NOT FOUND';
    if (!isGun(item.weapon)) return 'MELEE WEAPONS DO NOT TAKE AMMO';
    const pack = AMMO_PACKS[item.weapon as GunId];
    if (item.ammo >= pack.max) return 'AMMUNITION AT CAPACITY';
    const price = this.ammoPrice(item);
    if (this.data.money < price) return 'NOT ENOUGH CREDITS';
    this.data.money -= price;
    item.ammo = Math.min(pack.max, item.ammo + pack.add);
    this.save();
    return null;
  }

  sell(id: string): string | null {
    const item = this.data.stash.find((s) => s.id === id);
    if (!item) return 'WEAPON NOT FOUND';
    if (item.weapon === 'fists') return 'CANNOT SELL FISTS';
    this.data.money += this.sellValue(item);
    this.data.stash = this.data.stash.filter((s) => s.id !== id);
    if (this.data.equippedId === id) this.data.equippedId = null;
    this.save();
    return null;
  }

  equip(id: string): string | null {
    if (!this.data.stash.some((s) => s.id === id)) return 'WEAPON NOT FOUND';
    this.data.equippedId = id;
    this.save();
    return null;
  }

  savePreset(index: number): string | null {
    if (index < 0 || index >= this.data.presets.length) return 'UNKNOWN PRESET';
    const item = this.equipped;
    this.data.presets[index] = {
      name: item
        ? item.variant
          ? NAMED_MAP[item.variant].name
          : WEAPONS[item.weapon].name
        : 'FISTS',
      weapon: item?.weapon ?? 'fists',
      variant: item?.variant ?? null,
      attachment: item?.attachment ?? null,
      supplyType: this.data.supplyType,
    };
    this.save();
    return null;
  }

  applyPreset(index: number): string | null {
    const preset = this.data.presets[index];
    if (!preset) return 'EMPTY PRESET';
    if (preset.weapon === 'fists') {
      this.data.equippedId = null;
      this.save();
      return null;
    }
    const item = this.data.stash.find(
      (entry) =>
        entry.weapon === preset.weapon &&
        (!preset.variant || entry.variant === preset.variant) &&
        (!preset.attachment || entry.attachment === preset.attachment),
    );
    if (!item) return 'PRESET WEAPON NOT IN STASH';
    this.data.equippedId = item.id;
    this.save();
    return null;
  }

  clearPreset(index: number): void {
    if (index >= 0 && index < this.data.presets.length) {
      this.data.presets[index] = null;
      this.save();
    }
  }

  /** Consumes the equipped weapon for the run and counts the attempt. */
  beginRun(): RunLoadout {
    this.data.runs++;
    this.ensureMarket();
    const item = this.equipped;
    const supplyType = this.data.supplyType;
    const supplyCharges = this.data.supplyCharges;
    this.data.supplyType = null;
    this.data.supplyCharges = 0;
    if (!item) {
      this.save();
      return {
        weapon: 'fists',
        ammo: 0,
        attachment: null,
        variant: null,
        supplyType,
        supplyCharges,
      };
    }
    this.data.stash = this.data.stash.filter((s) => s.id !== item.id);
    this.data.equippedId = null;
    this.save();
    return {
      weapon: item.weapon,
      ammo: item.ammo,
      attachment: item.attachment,
      variant: item.variant,
      supplyType,
      supplyCharges,
    };
  }

  /** A fists-only retry: counts the attempt but touches no stash weapon. */
  recordAttempt(): RunLoadout {
    this.data.runs++;
    this.ensureMarket();
    this.save();
    return {
      weapon: 'fists',
      ammo: 0,
      attachment: null,
      variant: null,
      supplyType: null,
      supplyCharges: 0,
    };
  }

  /** Banks a clear, returns the extracted weapon to storage, and records stats. */
  bankClear(
    time: number,
    payout: number,
    extraction: {
      weapon: WeaponId;
      ammo: number;
      attachment: AttachmentId | null;
      variant: NamedWeaponId | null;
    },
  ): StashItem | null {
    this.data.money += payout;
    this.data.clears++;
    this.data.bestTime = this.data.bestTime === null ? time : Math.min(this.data.bestTime, time);
    let returned: StashItem | null = null;
    if (extraction.weapon !== 'fists') {
      const id = freshId();
      const free = findFree(this.data.stash, id, extraction.weapon);
      if (free) {
        returned = {
          id,
          weapon: extraction.weapon,
          ammo: Math.max(0, Math.floor(extraction.ammo)),
          attachment: isGun(extraction.weapon) ? extraction.attachment : null,
          variant: extraction.variant,
          ...free,
        };
        this.data.stash.push(returned);
        if (!this.data.equippedId) this.data.equippedId = returned.id;
      }
    }
    this.save();
    return returned;
  }

  buySupply(id: ConsumableId): string | null {
    const def = CONSUMABLE_MAP[id];
    if (!def) return 'UNKNOWN SUPPLY';
    if (this.data.supplyType && this.data.supplyType !== id) {
      return 'CLEAR THE CURRENT KIT FIRST';
    }
    if (this.data.supplyCharges >= SUPPLY_MAX) return 'KIT FULL';
    const price = this.supplyPrice(id);
    if (this.data.money < price) return 'NOT ENOUGH CREDITS';
    if (!this.takeStock(stockKey('supply', id))) return 'OUT OF STOCK';
    this.data.money -= price;
    this.data.supplyType = id;
    this.data.supplyCharges++;
    this.save();
    return null;
  }

  clearSupply(): void {
    this.data.supplyType = null;
    this.data.supplyCharges = 0;
    this.save();
  }

  runMods(): RunMods {
    const strain = humanityStage(this.humanityUsed, this.humanityMax);
    return computeMods(this.data.cyberware, this.data.perks, this.data.attributes, strain);
  }

  get humanityUsed(): number {
    return humanityUsed(this.data.cyberware);
  }

  get humanityMax(): number {
    return humanityCapacity(this.data.attributes, this.data.level);
  }

  get humanityStage(): number {
    return humanityStage(this.humanityUsed, this.humanityMax);
  }

  humanityInfo(id?: CyberwareId): {
    used: number;
    max: number;
    stage: number;
    label: string;
    nextCost: number;
    risk: number;
  } {
    const def = id ? CYBERWARE_DEFS.find((entry) => entry.id === id) : null;
    const rank = id ? this.data.cyberware[id] : 0;
    return {
      used: this.humanityUsed,
      max: this.humanityMax,
      stage: this.humanityStage,
      label: humanityLabel(this.humanityStage as 0 | 1 | 2 | 3),
      nextCost: def ? (def.humanity[rank] ?? 0) : 0,
      risk: id ? this.cyberwareRisk(id) : 0,
    };
  }

  /** Chance the next install is rejected by neural strain. */
  cyberwareRisk(id: CyberwareId): number {
    const def = CYBERWARE_DEFS.find((entry) => entry.id === id);
    if (!def) return 0;
    const rank = this.data.cyberware[id];
    if (rank >= def.maxRank) return 0;
    const next = def.humanity[rank] ?? 0;
    const capacity = this.humanityMax;
    const strain = this.humanityUsed / Math.max(1, capacity);
    return Math.max(0, Math.min(0.45, (strain - 0.5) * 0.55 + next / Math.max(1, capacity) * 0.3));
  }

  rep(faction: FactionId): number {
    return this.data.reputation[faction] ?? 0;
  }

  repRank(faction: FactionId): RepRank {
    return repRank(this.rep(faction));
  }

  weaponPrice(weapon: Exclude<WeaponId, 'fists'>): number {
    const key = stockKey('weapon', weapon);
    const base = WEAPON_ECONOMY[weapon].price;
    return Math.max(
      1,
      Math.round(base * (1 - repDiscount(this.rep('market'))) * (1 + this.priceDrift(key))),
    );
  }

  namedPrice(id: NamedWeaponId): number {
    const key = stockKey('named', id);
    const def = NAMED_MAP[id];
    return Math.max(
      1,
      Math.round(def.price * (1 - repDiscount(this.rep('market'))) * (1 + this.priceDrift(key))),
    );
  }

  ammoPrice(item: StashItem): number {
    const pack = AMMO_PACKS[item.weapon as GunId];
    if (!pack) return 0;
    return Math.max(1, Math.round(pack.cost * (1 - repDiscount(this.rep('market')))));
  }

  discountFor(faction: FactionId): number {
    return repDiscount(this.rep(faction));
  }

  /** Clinic pricing follows Helix standing and TECHNOPHILE training. */
  cyberwarePrice(id: CyberwareId): number {
    const def = CYBERWARE_DEFS.find((entry) => entry.id === id);
    if (!def) return 0;
    const rank = this.data.cyberware[id];
    const base = def.costs[rank] ?? 0;
    if (base <= 0) return 0;
    return Math.max(
      1,
      Math.round(base * (1 - this.discountFor('helix')) * (1 - this.data.perks.technophile * 0.08)),
    );
  }

  /** Workbench pricing follows Night Market standing and GUNSMITH training. */
  attachmentPrice(id: AttachmentId): number {
    const def = ATTACHMENT_MAP[id];
    if (!def) return 0;
    return Math.max(
      1,
      Math.round(
        def.cost *
          (1 - this.discountFor('market')) *
          (1 - this.data.perks.gunsmith * 0.1) *
          (1 + this.priceDrift(stockKey('attachment', id))),
      ),
    );
  }

  /** Supply-depot pricing follows Night Market standing. */
  supplyPrice(id: ConsumableId): number {
    const def = CONSUMABLE_MAP[id];
    if (!def) return 0;
    return Math.max(
      1,
      Math.round(
        def.cost *
          (1 - this.discountFor('market')) *
          (1 + this.priceDrift(stockKey('supply', id))),
      ),
    );
  }

  spendAttribute(id: keyof Attributes): string | null {
    if (this.data.attributePoints < 1) return 'NO ATTRIBUTE POINTS';
    const def = ATTRIBUTE_DEFS.find((d) => d.id === id);
    if (!def) return 'UNKNOWN ATTRIBUTE';
    if (this.data.attributes[id] >= ATTR_MAX) return 'ATTRIBUTE AT MAXIMUM';
    this.data.attributes[id]++;
    this.data.attributePoints--;
    this.save();
    return null;
  }

  installCyberware(id: CyberwareId, rng: () => number = Math.random): string | null {
    const def = CYBERWARE_DEFS.find((d) => d.id === id);
    if (!def) return 'UNKNOWN CYBERWARE';
    const rank = this.data.cyberware[id];
    if (rank >= def.maxRank) return 'ALREADY AT MAX RANK';
    const nextLoad = def.humanity[rank] ?? 0;
    if (this.humanityUsed + nextLoad > this.humanityMax) {
      return 'NEURAL CAPACITY EXCEEDED — RAISE BODY OR UPGRADE';
    }
    const cost = this.cyberwarePrice(id);
    if (this.data.money < cost) return 'NOT ENOUGH CREDITS';
    const risk = this.cyberwareRisk(id);
    this.data.money -= cost;
    if (risk > 0 && rng() < risk) {
      this.save();
      return `INSTALL REJECTED — NEURAL STRAIN ${Math.round(risk * 100)}%`;
    }
    this.data.cyberware[id] = rank + 1;
    this.save();
    return null;
  }

  trainPerk(id: PerkId): string | null {
    const def = PERK_DEFS.find((d) => d.id === id);
    if (!def) return 'UNKNOWN PERK';
    if (this.data.perks[id] >= def.maxRank) return 'ALREADY AT MAX RANK';
    if (this.data.perkPoints < 1) return 'NO PERK POINTS';
    this.data.perkPoints--;
    this.data.perks[id]++;
    this.save();
    return null;
  }

  addXp(amount: number): { levels: number; points: number } {
    this.data.xp += Math.max(0, Math.round(amount));
    let levels = 0;
    while (this.data.xp >= xpForNext(this.data.level)) {
      this.data.xp -= xpForNext(this.data.level);
      this.data.level++;
      this.data.perkPoints++;
      this.data.attributePoints++;
      levels++;
    }
    this.save();
    return { levels, points: levels };
  }

  addLoot(kinds: LootKind[]): number {
    let total = 0;
    for (const kind of kinds) {
      this.data.contraband[kind]++;
      total += LOOT_DEFS[kind].value;
    }
    this.save();
    return total;
  }

  sellLoot(kind: LootKind, all: boolean): string | null {
    const have = this.data.contraband[kind];
    if (have <= 0) return 'NO CONTRABAND TO SELL';
    const count = all ? have : 1;
    this.data.contraband[kind] = have - count;
    this.data.money += LOOT_DEFS[kind].value * count;
    this.save();
    return null;
  }

  reset(): void {
    this.data = defaultData();
    this.ensureMarket();
    this.save();
  }
}
