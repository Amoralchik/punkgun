import { APPROACH_MAP, type ApproachId } from './attributes';
import { ATTACHMENT_MAP } from './attachments';
import { timeBonus } from './economy';
import { modifierPayBonus } from './modifiers';
import { repPayBonus } from './reputation';
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
  score += world.loot.filter((item) => item.collected).length * 4;
  score += world.aliveEnemies === 0 ? 5 : 0;
  score = Math.max(0, Math.min(150, score));
  const rank = score >= 95 ? 'S' : score >= 80 ? 'A' : score >= 60 ? 'B' : 'C';
  const rankBonus = rank === 'S' ? 120 : rank === 'A' ? 60 : rank === 'B' ? 20 : 0;
  const boonBonus = world.boons.includes('pay') ? Math.round((base + bonus + rankBonus) * 0.12) : 0;
  const payout = base + bonus + rankBonus + boonBonus;

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
  if (contract?.chapter === 'final') {
    profile.data.finalCleared = true;
    profile.data.bossesCleared.board = true;
  }
  if (contract?.objective === 'boss') {
    profile.data.bossCleared = true;
    if (contract.bossId) profile.data.bossesCleared[contract.bossId] = true;
  }
  if (contract?.authored && !profile.data.completedContracts.includes(contract.id)) {
    profile.data.completedContracts.push(contract.id);
  }
  if (contract && contract.objective !== 'boss' && contract.chapter !== 'final') {
    profile.data.regularClears++;
  }
  if (contract) profile.data.reputation[contract.faction]++;
  profile.save();

  const collected = world.loot.filter((item) => item.collected);
  const contrabandValue = profile.addLoot(collected.map((item) => item.kind));
  if (world.boons.includes('components')) profile.addComponent(3);

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
  const xpGain = riskXp + objectiveXp + world.kills * 4 + Math.round(bonus * 0.25) + rankXp;
  const levelInfo = profile.addXp(xpGain);

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
    accuracy,
    stealthKills: world.stealthKills,
    peakHeat: world.peakHeat,
  };

  return { reward, levelsGained: levelInfo.levels };
}
