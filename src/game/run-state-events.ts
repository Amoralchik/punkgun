import type { AudioEngine } from '../core/audio';
import type { Hud } from '../ui/hud';
import type { ChallengeId } from './challenges';
import type { Contract } from './missions';
import type { Profile } from './profile';
import type { World } from './world';
import type { WorldEvent } from './world-types';
import { WEAPONS } from './weapons';

export interface RunStateHooks {
  world: () => World;
  contract: () => Contract | null;
  challenge: () => ChallengeId;
  onDeath: () => void;
  onWin: () => void;
}

/** Death and win state transitions; result rendering stays in Game. */
export class RunStateEvents {
  private deathRecorded = false;
  private insuredWeapon: string | null = null;
  private insured = false;

  constructor(
    private readonly profile: Profile,
    private readonly audio: AudioEngine,
    private readonly hud: Hud,
    private readonly hooks: RunStateHooks,
  ) {}

  get deathInsured(): boolean {
    return this.insured;
  }

  get deathInsuredWeapon(): string | null {
    return this.insuredWeapon;
  }

  reset(): void {
    this.deathRecorded = false;
    this.insured = false;
    this.insuredWeapon = null;
  }

  handle(event: WorldEvent): boolean {
    if (event.type === 'playerDeath') {
      this.audio.death();
      this.hud.flashDamage('death');
      this.hud.damageDirection(event.angle + Math.PI);
      const policy = this.profile.data.insurance;
      this.insuredWeapon = policy ? WEAPONS[policy.weapon].name : null;
      this.insured = !!this.profile.claimInsurance();
      if (!this.deathRecorded) {
        this.deathRecorded = true;
        const contract = this.hooks.contract();
        this.profile.recordRun({
          title: contract?.title ?? 'UNKNOWN CONTRACT',
          layoutName: contract?.layoutName ?? '',
          time: this.hooks.world().time,
          kills: this.hooks.world().kills,
          payout: 0,
          rank: '—',
          success: false,
          daily: contract?.daily === true,
          challenge: contract?.challenge ?? this.hooks.challenge(),
        });
      }
      this.hooks.onDeath();
      return true;
    }
    if (event.type === 'win') {
      this.audio.win();
      this.hooks.onWin();
      return true;
    }
    return false;
  }
}
