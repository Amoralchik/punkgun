import type { AudioEngine } from '../core/audio';
import type { Locale } from '../core/i18n';
import type { DialogueController } from '../ui/dialogue-controller';
import type { ApproachId } from './attributes';
import type { ChallengeId } from './challenges';
import type { RunBoon } from './boons';
import { FACTIONS, authoredDialogue, bossBriefing, localizeDialogue } from './lore';
import type { Contract } from './missions';
import type { Profile } from './profile';

export interface RunLauncherHooks {
  contracts: () => Contract[];
  currentContract: () => Contract | null;
  dialogue: DialogueController;
  audio: AudioEngine;
  profile: Profile;
  locale: () => Locale;
  onCommit: (
    contract: Contract,
    approach: ApproachId,
    challenge: ChallengeId,
    boons: RunBoon[],
  ) => void;
}

/** Contract selection, dialogue launch and deferred run commit. */
export class RunLauncher {
  private pending: {
    contract: Contract;
    approach: ApproachId;
    challenge: ChallengeId;
  } | null = null;

  constructor(private readonly hooks: RunLauncherHooks) {}

  start(
    contractId: string,
    approach: ApproachId = 'standard',
    challenge: ChallengeId = 'standard',
  ): void {
    const contract =
      this.hooks.contracts().find((entry) => entry.id === contractId) ??
      this.hooks.currentContract();
    if (!contract || contract.locked) return;
    this.hooks.audio.unlock();
    if (contract.objective === 'boss') {
      this.pending = { contract, approach, challenge };
      this.hooks.dialogue.start(
        localizeDialogue(bossBriefing(contract.bossId), this.hooks.locale()),
        `// BOSS BRIEFING · ${FACTIONS[contract.faction].name}`,
        contract.faction,
      );
      return;
    }
    if (contract.authored) {
      this.pending = { contract, approach, challenge };
      this.hooks.dialogue.start(
        authoredDialogue(
          contract,
          this.hooks.profile.data.story,
          this.hooks.profile.data.role,
          this.hooks.profile.data.lifepath,
          this.hooks.locale(),
        ),
        `// PRE-OP BRIEFING · ${FACTIONS[contract.faction].name}`,
        contract.faction,
      );
      return;
    }
    this.hooks.onCommit(contract, approach, challenge, []);
  }

  deploy(boons: RunBoon[]): void {
    const pending = this.pending;
    this.pending = null;
    if (pending) {
      this.hooks.onCommit(pending.contract, pending.approach, pending.challenge, boons);
    }
  }

  cancel(): void {
    this.pending = null;
  }
}
