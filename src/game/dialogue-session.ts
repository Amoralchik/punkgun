import type { FactionId } from './lore';
import {
  dialogueCheckMet,
  type DialogueChoice,
  type DialogueLine,
} from './lore';
import type { RunBoon } from './boons';
import type { Profile } from './profile';

export interface DialogueResolution {
  ok: boolean;
  error?: string;
  boon?: RunBoon;
  reputation: Array<[FactionId, number]>;
  reply?: string;
}

/** Pure-ish dialogue state: lines, choices, boons and story consequences. */
export class DialogueSession {
  index = 0;
  readonly lines: DialogueLine[];
  readonly boons: RunBoon[];

  constructor(lines: DialogueLine[], initialBoons: RunBoon[] = []) {
    this.lines = [...lines];
    this.boons = [...initialBoons];
  }

  get current(): DialogueLine | null {
    return this.lines[this.index] ?? null;
  }

  get atEnd(): boolean {
    return this.index >= this.lines.length - 1;
  }

  get hasChoices(): boolean {
    return (this.current?.choices?.length ?? 0) > 0;
  }

  advance(): boolean {
    if (this.hasChoices || this.atEnd) return false;
    this.index++;
    return true;
  }

  choice(id: string): DialogueChoice | null {
    return this.current?.choices?.find((entry) => entry.id === id) ?? null;
  }

  choose(id: string, profile: Profile, faction: FactionId): DialogueResolution {
    const choice = this.choice(id);
    if (!choice) return { ok: false, error: 'UNKNOWN CHOICE', reputation: [] };
    if (
      !dialogueCheckMet(
        choice.check,
        profile.data.attributes,
        profile.data.reputation,
        profile.data.role,
        profile.data.lifepath,
      )
    ) {
      return { ok: false, error: 'REQUIREMENT NOT MET', reputation: [] };
    }

    if (choice.boon && !this.boons.includes(choice.boon)) this.boons.push(choice.boon);
    profile.data.story[`faction:${faction}`] = choice.id;
    const reputation: Array<[FactionId, number]> = [];
    if (choice.reputation) {
      for (const [key, delta] of Object.entries(choice.reputation)) {
        const id = key as FactionId;
        profile.data.reputation[id] = Math.max(0, profile.data.reputation[id] + delta);
        reputation.push([id, delta]);
      }
    }
    profile.save();
    if (choice.reply) {
      this.lines.splice(this.index + 1, 0, {
        speaker: this.current!.speaker,
        text: choice.reply,
      });
    }
    this.index++;
    return { ok: true, boon: choice.boon, reputation, reply: choice.reply };
  }
}
