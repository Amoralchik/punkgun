import { ATTACHMENTS, ATTACHMENT_MAP, type AttachmentId } from '../game/attachments';
import { Profile, stockKey } from '../game/profile';
import { NAMED_MAP, WEAPONS, isGun } from '../game/weapons';

export interface WorkbenchHooks {
  onClick: () => void;
  onError: () => void;
  onClose: () => void;
}

/** Weapon attachment station, extracted from the safehouse shell. */
export class Workbench {
  private readonly root = document.getElementById('overlay-workbench')!;
  private readonly moneyEl = document.getElementById('wb-money')!;
  private readonly gunsEl = document.getElementById('wb-guns')!;
  private readonly attachmentsEl = document.getElementById('wb-attachments')!;
  private readonly msgEl = document.getElementById('wb-msg')!;
  private readonly closeEl = document.getElementById('wb-close') as HTMLButtonElement;

  private message = '';
  private error = false;
  private selectedId: string | null = null;

  constructor(
    private readonly profile: Profile,
    private readonly hooks: WorkbenchHooks,
  ) {
    this.root.addEventListener('click', (event) => this.handleClick(event));
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(): void {
    const guns = this.profile.data.stash.filter((item) => isGun(item.weapon));
    if (!guns.some((gun) => gun.id === this.selectedId)) {
      this.selectedId = guns[0]?.id ?? null;
    }
    this.message = '';
    this.error = false;
    this.root.classList.remove('hidden');
    this.render();
    this.closeEl.focus();
  }

  close(): void {
    this.root.classList.add('hidden');
    this.hooks.onClose();
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  private render(): void {
    const guns = this.profile.data.stash.filter((item) => isGun(item.weapon));
    if (!guns.some((gun) => gun.id === this.selectedId)) {
      this.selectedId = guns[0]?.id ?? null;
    }
    const selected = guns.find((gun) => gun.id === this.selectedId) ?? null;
    const marketDiscount = Math.round(this.profile.discountFor('market') * 100);
    this.moneyEl.textContent = `$${this.profile.data.money.toLocaleString('en-US')}${
      marketDiscount > 0 ? ` · MARKET -${marketDiscount}%` : ''
    }`;

    this.gunsEl.innerHTML =
      guns.length === 0
        ? `<div class="sh-note">NO FIREARMS IN STORAGE. BUY A PISTOL OR SHOTGUN FIRST.</div>`
        : guns
            .map((gun) => {
              const name = gun.variant
                ? NAMED_MAP[gun.variant].name
                : WEAPONS[gun.weapon].name;
              const mod = gun.attachment
                ? ATTACHMENT_MAP[gun.attachment].name
                : 'NO ATTACHMENT';
              return `<button class="wb-gun${gun.id === this.selectedId ? ' selected' : ''}"
                data-act="select-gun" data-id="${gun.id}">
                <span class="wname">${name}</span>
                <span class="wmeta">${gun.ammo} RDS · ${mod}</span>
              </button>`;
            })
            .join('');

    this.attachmentsEl.innerHTML =
      ATTACHMENTS.map((def) => {
        const installed = selected?.attachment === def.id;
        const stock = this.profile.stockFor(stockKey('attachment', def.id));
        const disabled = !selected || installed || stock <= 0;
        return `<div class="aug-item">
          <div class="aug-info">
            <span class="aug-name">${def.name}</span>
            <span class="aug-desc">${def.desc}</span>
            <span class="aug-rank">STOCK ${stock}</span>
          </div>
          <div class="sh-actions aug-action">
            <span class="aug-cost">$${this.profile.attachmentPrice(def.id)}</span>
            <button data-act="install" data-id="${def.id}" ${disabled ? 'disabled' : ''}>${
              installed ? 'INSTALLED' : stock <= 0 ? 'OUT OF STOCK' : 'INSTALL'
            }</button>
          </div>
        </div>`;
      }).join('') +
      (selected?.attachment
        ? `<div class="wb-strip"><button class="sh-reset" data-act="strip">STRIP ${ATTACHMENT_MAP[selected.attachment].name}</button></div>`
        : '');

    this.msgEl.textContent = this.message;
    this.msgEl.classList.toggle('err', this.error);
  }

  private handleClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    if (act === 'close-workbench') {
      this.hooks.onClick();
      this.close();
      return;
    }
    if (act === 'select-gun') {
      const id = target.dataset.id;
      if (!id) return;
      this.selectedId = id;
      this.hooks.onClick();
      this.render();
      return;
    }
    if (!this.selectedId) return;
    let error: string | null = null;
    let success = '';
    if (act === 'install') {
      const id = target.dataset.id as AttachmentId | undefined;
      if (!id) return;
      error = this.profile.installAttachment(this.selectedId, id);
      success = `${ATTACHMENT_MAP[id].name} INSTALLED`;
    } else if (act === 'strip') {
      error = this.profile.stripAttachment(this.selectedId);
      success = 'ATTACHMENT STRIPPED';
    } else {
      return;
    }
    if (error) {
      this.message = error;
      this.error = true;
      this.hooks.onError();
    } else {
      this.message = success;
      this.error = false;
      this.hooks.onClick();
    }
    this.render();
  }
}
