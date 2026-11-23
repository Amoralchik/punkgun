import { describe, expect, it } from 'vitest';
import { WEAPONS } from './weapons';
import { deathResult, winResult, type RewardSummary } from './results';

const reward: RewardSummary = {
  contractTitle: 'NIGHT SHIFT',
  base: 100,
  bonus: 20,
  payout: 180,
  contrabandCount: 2,
  contrabandValue: 120,
  extracted: { weapon: 'smg', ammo: 24, attachment: null, variant: null },
  xpGain: 50,
  level: 7,
  xp: 97,
  xpNext: 400,
  levelsGained: 1,
  perkPoints: 2,
  rank: 'A',
  rankBonus: 60,
  accuracy: 0.5,
  stealthKills: 1,
  peakHeat: 20,
};

describe('run result text', () => {
  it('formats death with and without a contract', () => {
    const withContract = deathResult({
      contractTitle: 'NIGHT SHIFT',
      time: 65,
      kills: 7,
      lootValue: 120,
      deathCause: 'SHOTGUN',
      carriedWeapon: true,
    });
    expect(withContract.stats).toContain('CONTRACT NIGHT SHIFT');
    expect(withContract.stats).toContain('TIME 01:05.0');
    expect(withContract.stats).toContain('KILLED BY SHOTGUN');
    expect(withContract.note).toBe('CARRIED WEAPON LOST · NO EXTRACTION');

    const withoutContract = deathResult({
      contractTitle: null,
      time: 3,
      kills: 0,
      lootValue: 0,
      deathCause: 'FISTS',
      carriedWeapon: false,
    });
    expect(withoutContract.stats.startsWith('TIME')).toBe(true);
    expect(withoutContract.note).toBe('NO PAYOUT · LOOT LOST');
  });

  it('reports the responsible source and an actionable hint', () => {
    const out = deathResult({
      contractTitle: 'NIGHT SHIFT',
      time: 42,
      kills: 3,
      lootValue: 0,
      deathCause: 'GUNFIRE',
      carriedWeapon: false,
      report: {
        label: 'SNIPER',
        detail: 'PRECISION SHOT · FROM THE NORTH-EAST · LONG RANGE',
        hint: 'PRECISION SHOTS PAINT A RED LINE FIRST. NEVER STAND IN IT.',
      },
    });
    expect(out.stats).toContain('KILLED BY SNIPER');
    expect(out.source).toContain('FROM THE NORTH-EAST');
    expect(out.hint).toContain('RED LINE');
  });

  it('formats extraction, modifiers, finale and balance', () => {
    const out = winResult(reward, {
      approachName: 'GHOST',
      approachMult: 1.2,
      modifierNames: ['ALARM', 'ELITE'],
      final: true,
      money: 1282,
    });
    expect(out.stats).toContain('CONTRACT PAY  $100');
    expect(out.stats).toContain('RANK          A  +$60');
    expect(out.note).toContain(`EXTRACTED: ${WEAPONS.smg.name} · 24 RDS`);
    expect(out.note).toContain('CONTRABAND: 2 ITEMS · $120');
    expect(out.note).toContain('LEVEL UP → 7');
    expect(out.note).toContain('INSERTION: GHOST · 120% PAY');
    expect(out.note).toContain('MODIFIERS: ALARM · ELITE');
    expect(out.note).toContain('BALANCE: $1,282');
    expect(out.note).toContain('THE LEASH IS CUT');

    const ghost = winResult(
      { ...reward, ghostRun: true, ghostBonus: 27 },
      {
        approachName: 'GHOST',
        approachMult: 1.1,
        modifierNames: [],
        final: false,
        money: 500,
      },
    );
    expect(ghost.stats).toContain('GHOST BONUS   $27');
    expect(ghost.note).toContain('STEALTH 1 · GHOST');
  });

  it('formats the chosen ending instead of the generic finale line', () => {
    const out = winResult(reward, {
      approachName: 'GHOST',
      approachMult: 1.2,
      modifierNames: [],
      final: true,
      money: 1282,
      ending: 'broadcast',
    });
    expect(out.note).toContain('ENDING: BROADCAST THE FILE');
    expect(out.note).toContain('Push Project PUNKGUN');
    expect(out.note).not.toContain('THE LEASH IS CUT');
  });

  it('formats an empty extraction and no modifiers', () => {
    const out = winResult(
      { ...reward, extracted: null, contrabandCount: 0, accuracy: null, levelsGained: 0 },
      {
        approachName: 'STANDARD',
        approachMult: 1,
        modifierNames: [],
        final: false,
        money: 0,
      },
    );
    expect(out.note).toContain('EXTRACTED: NOTHING');
    expect(out.note).toContain('CONTRABAND: NONE');
    expect(out.note).toContain('ACC —');
    expect(out.note).not.toContain('MODIFIERS:');
    expect(out.note).not.toContain('THE LEASH IS CUT');
  });
});
