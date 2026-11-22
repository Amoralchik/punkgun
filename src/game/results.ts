import { fmtTime } from '../core/math';
import { ATTACHMENT_MAP, type AttachmentId } from './attachments';
import { NAMED_MAP, WEAPONS, type NamedWeaponId, type WeaponId } from './weapons';

export interface RewardSummary {
  contractTitle: string;
  base: number;
  bonus: number;
  payout: number;
  contrabandCount: number;
  contrabandValue: number;
  extracted: {
    weapon: WeaponId;
    ammo: number;
    attachment: AttachmentId | null;
    variant: NamedWeaponId | null;
  } | null;
  xpGain: number;
  level: number;
  xp: number;
  xpNext: number;
  levelsGained: number;
  perkPoints: number;
  rank: string;
  rankBonus: number;
  accuracy: number | null;
  stealthKills: number;
  peakHeat: number;
}

export interface DeathResultInput {
  contractTitle: string | null;
  time: number;
  kills: number;
  lootValue: number;
  deathCause: string;
  carriedWeapon: boolean;
}

export interface WinResultContext {
  approachName: string;
  approachMult: number;
  modifierNames: string[];
  final: boolean;
  money: number;
}

export interface ResultText {
  stats: string;
  note: string;
}

export function deathResult(input: DeathResultInput): ResultText {
  const { contractTitle, time, kills, lootValue, deathCause, carriedWeapon } = input;
  const stats = `${contractTitle ? `CONTRACT ${contractTitle}\n` : ''}TIME ${fmtTime(time)}   ·   KILLS ${kills}\nLOOT LOST $${lootValue}\nKILLED BY ${deathCause}`;
  const note = carriedWeapon
    ? 'CARRIED WEAPON LOST · NO EXTRACTION'
    : 'NO PAYOUT · LOOT LOST';
  return { stats, note };
}

export function winResult(r: RewardSummary, ctx: WinResultContext): ResultText {
  const stats = `CONTRACT      ${r.contractTitle}\nCONTRACT PAY  $${r.base}\nTIME BONUS    $${r.bonus}\nRANK          ${r.rank}  +$${r.rankBonus}\nBANKED        $${r.payout}\nXP GAIN       +${r.xpGain}`;
  const ex = r.extracted;
  const extracted = ex
    ? `${ex.variant ? NAMED_MAP[ex.variant].name : WEAPONS[ex.weapon].name} · ${
        ex.weapon === 'bat' ? 'MELEE' : `${ex.ammo} RDS`
      }${ex.attachment ? ` · ${ATTACHMENT_MAP[ex.attachment].name}` : ''}`
    : 'NOTHING';
  const contraband = r.contrabandCount
    ? `CONTRABAND: ${r.contrabandCount} ITEM${r.contrabandCount === 1 ? '' : 'S'} · $${r.contrabandValue} — SELL IN SAFEHOUSE`
    : 'CONTRABAND: NONE';
  const levelLine =
    r.levelsGained > 0
      ? `LEVEL UP → ${r.level} · +${r.levelsGained} PERK POINT${r.levelsGained === 1 ? '' : 'S'} · ${r.xp}/${r.xpNext} XP`
      : `LEVEL ${r.level} · ${r.xp}/${r.xpNext} XP · ${r.perkPoints} PP`;
  const accuracyLine = r.accuracy === null ? 'ACC —' : `ACC ${Math.round(r.accuracy * 100)}%`;
  const performance = `${accuracyLine} · STEALTH ${r.stealthKills} · PEAK HEAT ${Math.round(r.peakHeat)}`;
  const finale = ctx.final ? '\nTHE LEASH IS CUT. THE CITY REMEMBERS.' : '';
  const mods = ctx.modifierNames.join(' · ');
  const note = `EXTRACTED: ${extracted}\n${contraband}\n${levelLine}\n${performance}\nINSERTION: ${ctx.approachName} · ${Math.round(ctx.approachMult * 100)}% PAY${
    mods ? `\nMODIFIERS: ${mods}` : ''
  }\nBALANCE: $${ctx.money.toLocaleString('en-US')}${finale}`;
  return { stats, note };
}
