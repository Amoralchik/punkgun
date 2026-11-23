import {
  availableEndings,
  endingUnlocked,
  epilogueConsequences,
  ENDINGS,
  type EndingId,
} from '../game/endings';
import type { Profile } from '../game/profile';

export interface EndingHooks {
  hideResults: () => void;
  onWin: () => void;
  onFinish: () => void;
}

/** Final choice and epilogue overlays. */
export class EndingController {
  private open = false;
  private epilogue = false;
  private readonly root = document.getElementById('overlay-ending')!;
  private readonly options = document.getElementById('ending-options')!;
  private readonly epilogueRoot = document.getElementById('overlay-epilogue')!;
  private readonly kicker = document.getElementById('epilogue-kicker')!;
  private readonly title = document.getElementById('epilogue-title')!;
  private readonly body = document.getElementById('epilogue-body')!;

  constructor(
    private readonly profile: Profile,
    private readonly hooks: EndingHooks,
  ) {}

  get isOpen(): boolean {
    return this.open;
  }

  get isEpilogue(): boolean {
    return this.epilogue;
  }

  showChoice(): void {
    this.open = true;
    this.epilogue = false;
    this.hooks.hideResults();
    this.options.innerHTML = availableEndings(this.profile.data)
      .map((id, index) => {
        const def = ENDINGS[id];
        return `<button class="ending-option" style="--ending:${def.color}" data-ending="${id}">
          <span class="ending-key">${String(index + 1).padStart(2, '0')} · ${def.kicker.replace('// ', '')}</span>
          <b>${def.title}</b>
          <small>${def.summary}</small>
          <small>${def.body[0]}</small>
        </button>`;
      })
      .join('');
    this.root.classList.remove('hidden');
    (this.options.querySelector('button') as HTMLButtonElement | null)?.focus();
  }

  choose(id: EndingId): void {
    if (!this.open || !ENDINGS[id] || !endingUnlocked(id, this.profile.data)) return;
    this.open = false;
    this.epilogue = true;
    this.profile.recordEnding(id);
    this.profile.data.ending = id;
    this.profile.save();
    this.root.classList.add('hidden');
    this.kicker.textContent = ENDINGS[id].kicker;
    this.title.textContent = ENDINGS[id].title;
    const consequence = epilogueConsequences({
      reputation: this.profile.data.reputation,
      role: this.profile.data.role,
      lifepath: this.profile.data.lifepath,
    });
    this.body.innerHTML = [...ENDINGS[id].body, ...consequence]
      .map((p) => `<p>${p}</p>`)
      .join('');
    this.epilogueRoot.classList.remove('hidden');
    this.hooks.onWin();
  }

  finish(): void {
    if (!this.epilogue) return;
    this.epilogue = false;
    this.epilogueRoot.classList.add('hidden');
    this.hooks.onFinish();
  }

  close(): void {
    this.open = false;
    this.epilogue = false;
    this.root.classList.add('hidden');
    this.epilogueRoot.classList.add('hidden');
  }
}
