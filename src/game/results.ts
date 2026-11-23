import { SETPIECES, type SetpieceId } from './setpieces';
import { fmtTime } from '../core/math';
import { ATTACHMENT_MAP, type AttachmentId } from './attachments';
import type { DeathReport } from './damage-report';
import { ENDINGS, type EndingId } from './endings';
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
  /** Dialogue/fixer bonus folded into payout. */
  boonBonus?: number;
  /** Operator role pay bonus folded into payout. */
  roleBonus?: number;
  /** Business pay bonus and passive income folded into payout. */
  ventureBonus?: number;
  ventureIncome?: number;
  exchangeDividend?: number;
  dailyBonus?: number;
  challengeBonus?: number;
  ghostBonus?: number;
  ghostRun?: boolean;
  accuracy: number | null;
  stealthKills: number;
  peakHeat: number;
  bestCombo?: number;
  /** District setpiece the run played under. */
  setpiece?: SetpieceId | null;
  /** Civilians the player killed (market patrol). */
  collateral?: number;
}

export interface DeathResultInput {
  contractTitle: string | null;
  time: number;
  kills: number;
  lootValue: number;
  deathCause: string;
  carriedWeapon: boolean;
  insured?: boolean;
  insuredWeapon?: string | null;
  report?: DeathReport | null;
}

export interface WinResultContext {
  approachName: string;
  approachMult: number;
  modifierNames: string[];
  final: boolean;
  money: number;
  ending?: EndingId | null;
}

export interface ResultText {
  stats: string;
  note: string;
  source?: string;
  hint?: string;
}

export function deathResult(input: DeathResultInput): ResultText {
  const {
    contractTitle,
    time,
    kills,
    lootValue,
    deathCause,
    carriedWeapon,
    insured,
    insuredWeapon,
    report,
  } = input;
  const killer = report?.label ?? deathCause;
  const stats = `${contractTitle ? `CONTRACT ${contractTitle}\n` : ''}TIME ${fmtTime(time)}   ·   KILLS ${kills}\nLOOT LOST $${lootValue}\nKILLED BY ${killer}`;
  const note = insured
    ? `INSURANCE PAID · ${insuredWeapon ?? 'WEAPON'} RETURNED WITH 0 RDS · NO EXTRACTION`
    : carriedWeapon
      ? 'CARRIED WEAPON LOST · NO EXTRACTION'
      : 'NO PAYOUT · LOOT LOST';
  return { stats, note, source: report?.detail, hint: report?.hint };
}

export function winResult(r: RewardSummary, ctx: WinResultContext): ResultText {
  const boonLine = (r.boonBonus ?? 0) > 0 ? `\nFIXER BONUS   $${r.boonBonus}` : '';
  const roleLine = (r.roleBonus ?? 0) > 0 ? `\nROLE BONUS    $${r.roleBonus}` : '';
  const ventureLine =
    (r.ventureBonus ?? 0) + (r.ventureIncome ?? 0) > 0
      ? `\nBUSINESSES    +$${(r.ventureBonus ?? 0) + (r.ventureIncome ?? 0)}`
      : '';
  const dividendLine = (r.exchangeDividend ?? 0) > 0
    ? `\nMARKET DIVIDEND $${r.exchangeDividend}`
    : '';
  const dailyLine = (r.dailyBonus ?? 0) > 0
    ? `\nDAILY BONUS   $${r.dailyBonus}`
    : '';
  const challengeLine = (r.challengeBonus ?? 0) > 0
    ? `\nCHALLENGE     $${r.challengeBonus}`
    : '';
  const ghostLine = (r.ghostBonus ?? 0) > 0 ? `\nGHOST BONUS   $${r.ghostBonus}` : '';
  const stats = `CONTRACT      ${r.contractTitle}\nCONTRACT PAY  $${r.base}\nTIME BONUS    $${r.bonus}\nRANK          ${r.rank}  +$${r.rankBonus}${boonLine}${roleLine}${ventureLine}${dividendLine}${dailyLine}${challengeLine}${ghostLine}\nBANKED        $${r.payout}\nXP GAIN       +${r.xpGain}`;
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
  const comboLine = (r.bestCombo ?? 0) > 0 ? ` · COMBO x${r.bestCombo}` : '';
  const collateralLine = (r.collateral ?? 0) > 0 ? ` · COLLATERAL ${r.collateral}` : '';
  const performance = `${accuracyLine} · STEALTH ${r.stealthKills}${r.ghostRun ? ' · GHOST' : ''} · PEAK HEAT ${Math.round(r.peakHeat)}${comboLine}${collateralLine}`;
  const finale = ctx.final
    ? ctx.ending
      ? `\nENDING: ${ENDINGS[ctx.ending].title}\n${ENDINGS[ctx.ending].summary}`
      : '\nTHE LEASH IS CUT. THE CITY REMEMBERS.'
    : '';
  const mods = [r.setpiece ? SETPIECES[r.setpiece].name : '', ...ctx.modifierNames]
    .filter(Boolean)
    .join(' · ');
  const note = `EXTRACTED: ${extracted}\n${contraband}\n${levelLine}\n${performance}\nINSERTION: ${ctx.approachName} · ${Math.round(ctx.approachMult * 100)}% PAY${
    mods ? `\nMODIFIERS: ${mods}` : ''
  }\nBALANCE: $${ctx.money.toLocaleString('en-US')}${finale}`;
  return { stats, note };
}
