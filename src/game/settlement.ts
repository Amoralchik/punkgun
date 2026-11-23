import { APPROACH_MAP, type ApproachId } from './attributes';
import { ATTACHMENT_MAP } from './attachments';
import { timeBonus } from './economy';
import { modifierPayBonus } from './modifiers';
import { rolePayMult } from './roles';
import {
  ventureComponentBonus,
  ventureIncome,
  venturePayMult,
  ventureRepBonus,
} from './ventures';
import { repPayBonus } from './reputation';
import { challengePayBonus } from './challenges';
import { BOSS_ORDER } from './bosses';
import { xpForNext } from './progression';
import type { Contract } from './missions';
import type { Profile } from './profile';
import type { GunId } from './weapons';
import type { World } from './world';
import type { RewardSummary } from './results';

export interface Settlement {
  reward: RewardSummary;
  levelsGained: number;
}

/** Bank a cleared run: payout, extraction, rep, loot, XP and result summary. */
export function settleRun(
  profile: Profile,
  world: World,
  contract: Contract | null,
  approachId: ApproachId,
): Settlement {
  const player = world.player;
  const approach = APPROACH_MAP[approachId];
  const factionRep = profile.data.reputation[contract?.faction ?? 'market'] ?? 0;
  const modifierMult = 1 + modifierPayBonus(contract?.modifiers ?? []);
  const base = Math.round(
    (contract?.reward ?? 75) * modifierMult * approach.payoutMult * (1 + repPayBonus(factionRep)),
  );
  const bonus = timeBonus(world.time);
  const accuracy =
    world.shotsFired > 0 ? Math.min(1, world.shotsHit / world.shotsFired) : null;
  let score = 100;
  score -= Math.max(0, world.time - 45) * 1.2;
  score -= world.peakHeat * 0.35;
  score += (accuracy ?? 0.6) * 18;
  score += world.stealthKills * 6;
  score += (world.bestCombo ?? 0) * 3;
  score += world.loot.filter((item) => item.collected).length * 4;
  score += world.aliveEnemies === 0 ? 5 : 0;
  score = Math.max(0, Math.min(150, score));
  const rank = score >= 95 ? 'S' : score >= 80 ? 'A' : score >= 60 ? 'B' : 'C';
  const rankBonus = rank === 'S' ? 120 : rank === 'A' ? 60 : rank === 'B' ? 20 : 0;
  const boonBonus = world.boons.includes('pay') ? Math.round((base + bonus + rankBonus) * 0.12) : 0;
  const roleBonus = Math.round(
    (base + bonus + rankBonus) * (rolePayMult(profile.data.role) - 1),
  );
  const ventureBonus = Math.round(
    (base + bonus + rankBonus) * (venturePayMult(profile.data.ventures) - 1),
  );
  const venturePassive = ventureIncome(profile.data.ventures);
  const dividend = profile.exchangeDividend();
  const dailyBonus =
    contract?.daily && profile.markDailyCleared(rank)
      ? Math.round((base + bonus + rankBonus) * 0.35)
      : 0;
  const challengeBonus = Math.round(
    (base + bonus + rankBonus) * challengePayBonus(contract?.challenge),
  );
  const payout =
    base +
    bonus +
    rankBonus +
    boonBonus +
    roleBonus +
    ventureBonus +
    venturePassive +
    dividend +
    dailyBonus +
    challengeBonus;

  let extractionAmmo = player.ammo + player.clip;
  if (player.attachment && player.weapon !== 'bat' && player.weapon !== 'fists') {
    const ammoBonus =
      ATTACHMENT_MAP[player.attachment].ammoBonus[player.weapon as GunId] ?? 0;
    extractionAmmo = Math.max(0, extractionAmmo - ammoBonus);
  }
  const extracted = profile.bankClear(world.time, payout, {
    weapon: player.weapon,
    ammo: extractionAmmo,
    attachment: player.attachment,
    variant: player.variant,
  });
  profile.advanceExchange();
  profile.clearInsurance();
  if (contract?.chapter === 'final') {
    profile.data.finalCleared = true;
    profile.data.bossesCleared.board = true;
  }
  if (contract?.objective === 'boss') {
    profile.data.bossCleared = true;
    if (contract.bossRush) {
      for (const id of BOSS_ORDER) profile.data.bossesCleared[id] = true;
    } else if (contract.bossId) {
      profile.data.bossesCleared[contract.bossId] = true;
    }
  }
  if (contract?.authored && !profile.data.completedContracts.includes(contract.id)) {
    profile.data.completedContracts.push(contract.id);
  }
  if (contract && contract.objective !== 'boss' && contract.chapter !== 'final') {
    profile.data.regularClears++;
  }
  if (contract) {
    profile.data.reputation[contract.faction] +=
      1 + ventureRepBonus(profile.data.ventures);
  }
  profile.save();

  const collected = world.loot.filter((item) => item.collected);
  const contrabandValue = profile.addLoot(collected.map((item) => item.kind));
  if (world.boons.includes('components')) profile.addComponent(3);
  if (profile.data.role === 'techie') profile.addComponent(1);
  const ventureComponents = ventureComponentBonus(profile.data.ventures);
  if (ventureComponents > 0) profile.addComponent(ventureComponents);

  const riskXp = contract?.risk === 'HIGH' ? 120 : contract?.risk === 'MED' ? 80 : 50;
  const objectiveXp =
    contract?.objective === 'target' || contract?.objective === 'hunt'
      ? 25
      : contract?.objective === 'recover' || contract?.objective === 'sabotage'
        ? 20
        : contract?.objective === 'extraction' || contract?.objective === 'defense'
          ? 30
          : 0;
  const rankXp = rank === 'S' ? 30 : rank === 'A' ? 15 : 0;
  const xpGain =
    riskXp +
    objectiveXp +
    world.kills * 4 +
    (world.bestCombo ?? 0) * 2 +
    Math.round(bonus * 0.25) +
    rankXp;
  const levelInfo = profile.addXp(xpGain);
  profile.maybeQueueVentureEvent();

  const reward: RewardSummary = {
    contractTitle: contract?.title ?? 'CONTRACT',
    base,
    bonus,
    payout,
    contrabandCount: collected.length,
    contrabandValue,
    extracted: extracted
      ? {
          weapon: extracted.weapon,
          ammo: extracted.ammo,
          attachment: extracted.attachment,
          variant: extracted.variant,
        }
      : null,
    xpGain,
    level: profile.data.level,
    xp: profile.data.xp,
    xpNext: xpForNext(profile.data.level),
    levelsGained: levelInfo.levels,
    perkPoints: profile.data.perkPoints,
    rank,
    rankBonus,
    boonBonus,
    roleBonus,
    ventureBonus,
    ventureIncome: venturePassive,
    exchangeDividend: dividend,
    dailyBonus,
    challengeBonus,
    accuracy,
    stealthKills: world.stealthKills,
    peakHeat: world.peakHeat,
    bestCombo: world.bestCombo ?? 0,
  };

  profile.recordRun({
    title: reward.contractTitle,
    layoutName: contract?.layoutName ?? '',
    time: world.time,
    kills: world.kills,
    payout: reward.payout,
    rank: reward.rank,
    success: true,
    daily: contract?.daily === true,
    challenge: contract?.challenge ?? 'standard',
  });

  return { reward, levelsGained: levelInfo.levels };
}
