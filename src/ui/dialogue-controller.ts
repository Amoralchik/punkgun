import { BOONS, type RunBoon } from '../game/boons';
import { DialogueSession } from '../game/dialogue-session';
import {
  FACTIONS,
  dialogueCheckLabel,
  dialogueCheckMet,
  type DialogueLine,
  type FactionId,
} from '../game/lore';
import type { Profile } from '../game/profile';

export interface DialogueHooks {
  onDeploy: (boons: RunBoon[]) => void;
  onLog: (text: string) => void;
  onSubtitle: (text: string, duration?: number) => void;
  onClick: () => void;
  onError: () => void;
}

/** Pre-op dialogue modal and choice resolution. */
export class DialogueController {
  session: DialogueSession | null = null;
  private faction: FactionId = 'market';
  private readonly root = document.getElementById('overlay-dialogue')!;
  private readonly kicker = document.getElementById('dialogue-kicker')!;
  private readonly speaker = document.getElementById('dialogue-speaker')!;
  private readonly text = document.getElementById('dialogue-text')!;
  private readonly progress = document.getElementById('dialogue-progress')!;
  private readonly next = document.getElementById('dialogue-next') as HTMLButtonElement;
  private readonly choices = document.getElementById('dialogue-choices')!;

  constructor(
    private readonly profile: Profile,
    private readonly hooks: DialogueHooks,
  ) {}

  get isOpen(): boolean {
    return this.session !== null;
  }

  start(lines: DialogueLine[], kicker: string, faction: FactionId): void {
    this.session = new DialogueSession(lines);
    this.faction = faction;
    this.kicker.textContent = kicker;
    this.root.classList.remove('hidden');
    this.render();
  }

  handleClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-act], [data-choice]',
    );
    const action = target?.dataset.act;
    if (action === 'dialogue-next') this.advance();
    else if (action === 'dialogue-cancel') this.cancel();
    else if (target?.dataset.choice) this.choose(target.dataset.choice);
  }

  advance(): void {
    const session = this.session;
    if (!session || session.hasChoices) return;
    this.hooks.onClick();
    if (!session.atEnd) {
      session.advance();
      this.render();
      return;
    }
    const boons = [...session.boons];
    this.close();
    this.hooks.onDeploy(boons);
  }

  choose(choiceId: string): void {
    const session = this.session;
    if (!session) return;
    const result = session.choose(choiceId, this.profile, this.faction);
    if (!result.ok) {
      this.hooks.onError();
      return;
    }
    this.hooks.onClick();
    if (result.boon) {
      this.hooks.onLog(
        `BOON: ${BOONS[result.boon].label} — ${BOONS[result.boon].desc}`,
      );
    }
    if (result.reputation.length > 0) {
      this.hooks.onLog(
        `STANDING: ${result.reputation
          .map(
            ([faction, delta]) =>
              `${FACTIONS[faction].name.split(' ')[0]} ${delta > 0 ? '+' : ''}${delta}`,
          )
          .join(' · ')}`,
      );
    }
    this.render();
  }

  cancel(): void {
    if (!this.isOpen) return;
    this.hooks.onClick();
    this.close();
  }

  close(): void {
    this.session = null;
    this.root.classList.add('hidden');
  }

  private render(): void {
    const session = this.session;
    const line = session?.current;
    if (!session || !line) return;
    this.speaker.textContent = line.speaker;
    this.speaker.style.color = line.speaker === 'MOTH' ? 'var(--cyan)' : 'var(--magenta)';
    this.text.textContent = line.text;
    this.progress.textContent = `${session.index + 1} / ${session.lines.length}`;
    const hasChoices = session.hasChoices;
    this.next.style.display = hasChoices ? 'none' : '';
    this.next.textContent = session.atEnd ? 'DEPLOY' : 'CONTINUE';
    this.choices.innerHTML = hasChoices
      ? line.choices!
          .map((choice) => {
            const met = dialogueCheckMet(
              choice.check,
              this.profile.data.attributes,
              this.profile.data.reputation,
              this.profile.data.role,
              this.profile.data.lifepath,
            );
            const checkLabel = choice.check
              ? `<small>${dialogueCheckLabel(choice.check)}${met ? ' · READY' : ' · LOCKED'}</small>`
              : '';
            const repLabel = choice.reputation
              ? Object.entries(choice.reputation)
                  .map(([faction, delta]) => {
                    const name = FACTIONS[faction as keyof typeof FACTIONS].name.split(' ')[0];
                    return `${name} ${delta > 0 ? '+' : ''}${delta}`;
                  })
                  .join(' · ')
              : '';
            const consequence = repLabel ? `<small>${repLabel}</small>` : '';
            return `<button class="dialogue-choice" data-choice="${choice.id}" ${
              met ? '' : 'disabled'
            }><span>${choice.label}</span>${checkLabel}${consequence}</button>`;
          })
          .join('')
      : '';
    this.hooks.onLog(`${line.speaker}: ${line.text}`);
    this.hooks.onSubtitle(`${line.speaker}: ${line.text}`, 4200);
  }
}
