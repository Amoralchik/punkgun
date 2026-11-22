import { GunId, NamedWeaponId, NAMED_MAP, NAMED_WEAPONS, WeaponId, isGun } from './weapons';
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
  xpForNext,
} from './progression';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'punkgun.save.v2';
export const LEGACY_SAVE_KEY = 'punkgun.save.v1';
export const SAVE_SLOT_COUNT = 3;

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
}

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
  };
}

const VALID_WEAPONS: Record<WeaponId, true> = {
  fists: true,
  bat: true,
  pistol: true,
  shotgun: true,
  smg: true,
  rifle: true,
  ak: true,
  lmg: true,
};

/**
 * Persistent meta state: credits, owned weapons, equipped loadout, run stats.
 * All mutations save immediately; a run is resolved through beginRun()/bankClear().
 */
export class Profile {
  data: ProfileData;
  slot: number;
  private storage: StorageLike | null;

  constructor(slot = 1, storage: StorageLike | null = getBrowserStorage()) {
    this.slot = normalizeSaveSlot(slot);
    this.storage = storage;
    this.data = this.load();
    this.layoutCase();
    this.save();
  }

  static listSlots(storage: StorageLike | null = getBrowserStorage()): SaveSlotInfo[] {
    return listSaveSlots(storage);
  }

  private load(): ProfileData {
    if (!this.storage) return defaultData();
    const primary = this.storage.getItem(slotKey(this.slot));
    if (primary) return this.decode(primary) ?? defaultData();
    if (this.slot === 1) {
      const legacy = this.storage.getItem(LEGACY_SAVE_KEY);
      if (legacy) return this.decode(legacy) ?? defaultData();
    }
    return defaultData();
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
      this.storage.setItem(slotKey(this.slot), encodeSave(this.data));
    } catch {
      // Storage can be unavailable (private mode); the session still plays.
    }
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

  /** Switch the active profile to another slot, creating it if empty. */
  loadSlot(slot: number): void {
    this.slot = normalizeSaveSlot(slot);
    this.data = this.load();
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

  addComponent(): ComponentId {
    const roll = Math.random();
    const id: ComponentId =
      roll < 0.45 ? 'scrap' : roll < 0.72 ? 'polymer' : roll < 0.9 ? 'circuit' : 'biogel';
    this.data.components[id]++;
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

  /** Consumes the equipped weapon for the run and counts the attempt. */
  beginRun(): RunLoadout {
    this.data.runs++;
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
    return computeMods(this.data.cyberware, this.data.perks, this.data.attributes);
  }

  rep(faction: FactionId): number {
    return this.data.reputation[faction] ?? 0;
  }

  repRank(faction: FactionId): RepRank {
    return repRank(this.rep(faction));
  }

  weaponPrice(weapon: Exclude<WeaponId, 'fists'>): number {
    const base = WEAPON_ECONOMY[weapon].price;
    return Math.max(1, Math.round(base * (1 - repDiscount(this.rep('market')))));
  }

  namedPrice(id: NamedWeaponId): number {
    const def = NAMED_MAP[id];
    return Math.max(1, Math.round(def.price * (1 - repDiscount(this.rep('market')))));
  }

  ammoPrice(item: StashItem): number {
    const pack = AMMO_PACKS[item.weapon as GunId];
    if (!pack) return 0;
    return Math.max(1, Math.round(pack.cost * (1 - repDiscount(this.rep('market')))));
  }

  discountFor(faction: FactionId): number {
    return repDiscount(this.rep(faction));
  }

  /** Clinic pricing follows Helix standing. */
  cyberwarePrice(id: CyberwareId): number {
    const def = CYBERWARE_DEFS.find((entry) => entry.id === id);
    if (!def) return 0;
    const rank = this.data.cyberware[id];
    const base = def.costs[rank] ?? 0;
    if (base <= 0) return 0;
    return Math.max(1, Math.round(base * (1 - this.discountFor('helix'))));
  }

  /** Workbench pricing follows Night Market standing. */
  attachmentPrice(id: AttachmentId): number {
    const def = ATTACHMENT_MAP[id];
    if (!def) return 0;
    return Math.max(1, Math.round(def.cost * (1 - this.discountFor('market'))));
  }

  /** Supply-depot pricing follows Night Market standing. */
  supplyPrice(id: ConsumableId): number {
    const def = CONSUMABLE_MAP[id];
    if (!def) return 0;
    return Math.max(1, Math.round(def.cost * (1 - this.discountFor('market'))));
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

  installCyberware(id: CyberwareId): string | null {
    const def = CYBERWARE_DEFS.find((d) => d.id === id);
    if (!def) return 'UNKNOWN CYBERWARE';
    const rank = this.data.cyberware[id];
    if (rank >= def.maxRank) return 'ALREADY AT MAX RANK';
    const cost = this.cyberwarePrice(id);
    if (this.data.money < cost) return 'NOT ENOUGH CREDITS';
    this.data.money -= cost;
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
    this.save();
  }
}
