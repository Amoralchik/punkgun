import type { ApproachId } from './attributes';
import type { ConsumableId } from './consumables';
import type { LootKind } from './economy';
import type { AttachmentId } from './attachments';
import type { ObjectiveKind } from './missions';
import type { ModifierId } from './modifiers';
import type { BossId } from './bosses';
import type { RunBoon } from './boons';
import type { PathPoint } from './path';
import type { NamedWeaponId } from './weapons';
import type { WeaponId } from './weapons';

export type WorldState = 'playing' | 'dead' | 'won';

export interface MissionSpec {
  objective: ObjectiveKind;
  requiredLoot: number;
  approach?: ApproachId;
  modifiers?: ModifierId[];
  bossId?: BossId;
  boons?: RunBoon[];
  /** Fight the four bosses back-to-back in one arena. */
  bossRush?: boolean;
}

export type ObjectiveNodeKind = 'terminal' | 'case' | 'zone';

export interface ObjectiveNode {
  id: number;
  x: number;
  y: number;
  kind: ObjectiveNodeKind;
  progress: number;
  required: number;
  completed: boolean;
  /** Radius for zones; interaction radius for terminals/cases. */
  radius: number;
}

export type EnemyState = 'idle' | 'alert' | 'chase' | 'dead';

export type EnemyKind =
  | 'grunt'
  | 'shield'
  | 'sniper'
  | 'rusher'
  | 'gunner'
  | 'marksman'
  | 'heavy'
  | 'grenadier'
  | 'blade'
  | 'netrunner'
  | 'operator'
  | 'stalker'
  | 'breacher'
  | 'drone'
  | 'hound'
  | 'medic'
  | 'boss';

export interface Player {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  aimX: number;
  aimY: number;
  alive: boolean;
  weapon: WeaponId;
  /** Rounds in reserve (not loaded). */
  ammo: number;
  /** Rounds currently in the magazine. */
  clip: number;
  /** Remaining reload time; 0 when idle. */
  reloadT: number;
  attackCd: number;
  swingT: number;
  swingHit: boolean;
  flashT: number;
  corpseAngle: number;
  armor: number;
  maxArmor: number;
  invulnT: number;
  attachment: AttachmentId | null;
  variant: NamedWeaponId | null;
  supplyType: ConsumableId | null;
  supplyCharges: number;
  slowT: number;
  slowCd: number;
  camoT: number;
  camoCloakCd: number;
  /** Microgenerator EMP. */
  empCd: number;
  /** Berserk duration and cooldown. */
  berserkT: number;
  berserkCd: number;
  /** Overclock duration and cooldown. */
  overclockT: number;
  overclockCd: number;
  /** Intrusion deck cooldown. */
  deckCd: number;
  /** Automatic Kerenzikov trigger guard. */
  kerenCd: number;
  /** Post-kill speed window. */
  killSpeedT: number;
  revived: boolean;
  regenT: number;
  hackedT: number;
  dashT: number;
  dashCd: number;
  dashDirX: number;
  dashDirY: number;
  quickhackCd: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  isTarget: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  alive: boolean;
  weapon: WeaponId;
  ammo: number;
  state: EnemyState;
  stateT: number;
  fireCd: number;
  meleeCd: number;
  markT: number;
  flashT: number;
  path: PathPoint[];
  pathT: number;
  lastSeenX: number;
  lastSeenY: number;
  searchT: number;
  corpseAngle: number;
  deathVx: number;
  deathVy: number;
  /** A living enemy has already discovered this corpse. */
  corpseFound: boolean;
  patrolX: number;
  patrolY: number;
  patrolT: number;
  baseAngle: number;
  targetAngle: number;
  scanT: number;
  strafeT: number;
  strafeSign: number;
  aiming: boolean;
  stunT: number;
  shieldT: number;
  speedMult: number;
  visionMult: number;
  armor: number;
  maxArmor: number;
  invulnT: number;
  /** Time until the next grenade; only grenadiers use it. */
  grenadeCd: number;
  /** Netrunner channel/cooldown state. */
  hackT: number;
  hackCd: number;
  /** Turret operator deployment cooldown. */
  deployCd: number;
  /** Boss charge windup/cooldown. */
  bossChargeT: number;
  bossChargeCd: number;
  /** Exposed-core window after a charge or plate break. */
  bossWeakT: number;
  squad: number;
  suppressT: number;
  coverT: number;
  coverX: number;
  coverY: number;
  flankT: number;
  flankX: number;
  flankY: number;
  leapT: number;
  leapCd: number;
  healCd: number;
  medicCharges: number;
}

export interface Bullet {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  ownerId: number;
  ownerKind: 'player' | 'enemy';
  /** Remaining enemies this round can pass through. */
  pierce: number;
}

export interface Pickup {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weapon: WeaponId;
  ammo: number;
  flying: boolean;
  angle: number;
  spin: number;
  attachment: AttachmentId | null;
  variant: NamedWeaponId | null;
}

export interface LootItem {
  id: number;
  x: number;
  y: number;
  kind: LootKind;
  value: number;
  collected: boolean;
}

export interface SmokeCloud {
  id: number;
  x: number;
  y: number;
  r: number;
  life: number;
  maxLife: number;
}

export interface Grenade {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  owner: 'player' | 'enemy';
}

export interface Explosion {
  id: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface Steam {
  id: number;
  x: number;
  y: number;
  r: number;
  phase: number;
  active: boolean;
}

export interface Door {
  cx: number;
  cy: number;
  axis: 'h' | 'v';
  open: boolean;
  /** Sealed by the LOCKDOWN modifier; only a player kick can reopen it. */
  locked: boolean;
  angle: number;
  target: number;
  speed: number;
  x: number;
  y: number;
}

export interface Barrel {
  id: number;
  x: number;
  y: number;
  r: number;
  alive: boolean;
}

export interface Camera {
  id: number;
  x: number;
  y: number;
  angle: number;
  baseAngle: number;
  alive: boolean;
  alertT: number;
  /** EMP / intrusion shutdown window. */
  disabledT: number;
}

export interface Turret {
  id: number;
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  aiming: boolean;
  fireCd: number;
  aimT: number;
  flashT: number;
  /** EMP / intrusion shutdown window. */
  disabledT: number;
}

export interface Laser {
  id: number;
  x: number;
  y: number;
  axis: 'h' | 'v';
  phase: number;
  alive: boolean;
  /** EMP / intrusion shutdown window. */
  disabledT: number;
}

export interface Decal {
  x: number;
  y: number;
  rot: number;
  scale: number;
  tex: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  kind: 'spark' | 'blood' | 'casing';
  color: number;
}

export interface WorldEvent {
  type: string;
  x: number;
  y: number;
  angle: number;
  nodeId?: number;
}
