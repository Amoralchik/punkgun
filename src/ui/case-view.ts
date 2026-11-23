import { ATTACHMENT_MAP } from '../game/attachments';
import { xpForNext } from '../game/progression';
import type { Profile } from '../game/profile';
import { CASE_CELL, caseSize } from '../game/inventory';
import { NAMED_MAP, WEAPONS } from '../game/weapons';

export interface CaseHooks {
  onClick: () => void;
  onClose?: () => void;
}

/** The RE4-style attaché case overlay and its drag/equip interactions. */
export class CaseView {
  private readonly root = document.getElementById('overlay-case')!;
  private readonly grid = document.getElementById('case-grid')!;
  private readonly moneyEl = document.getElementById('case-money')!;
  private readonly levelEl = document.getElementById('case-level')!;
  private readonly detailEl = document.getElementById('case-detail')!;
  private readonly msgEl = document.getElementById('case-msg')!;
  private readonly equipEl = document.getElementById('case-equip') as HTMLButtonElement;
  private readonly rotateEl = document.getElementById('case-rotate') as HTMLButtonElement;

  private selectedId: string | null = null;
  private filter: 'all' | 'guns' | 'melee' = 'all';
  private message = '';
  private error = false;
  private drag: {
    id: string;
    dx: number;
    dy: number;
    startX: number;
    startY: number;
  } | null = null;

  constructor(
    private readonly profile: Profile,
    private readonly hooks: CaseHooks,
  ) {
    this.root.addEventListener('click', (ev) => this.handleClick(ev));
    this.grid.addEventListener('pointerdown', (ev) => this.onPointerDown(ev));
    this.grid.addEventListener('dblclick', (ev) => this.onDoubleClick(ev));
    window.addEventListener('pointermove', (ev) => this.onPointerMove(ev));
    window.addEventListener('pointerup', (ev) => this.onPointerUp(ev));
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(): void {
    this.message = '';
    this.error = false;
    const items = this.profile.data.stash;
    if (!this.selectedId || !items.some((item) => item.id === this.selectedId)) {
      this.selectedId = this.profile.data.equippedId ?? items[0]?.id ?? null;
    }
    this.root.classList.remove('hidden');
    this.render();
  }

  close(): void {
    this.root.classList.add('hidden');
    this.drag = null;
    this.message = '';
    this.hooks.onClose?.();
  }

  rotate(): void {
    if (!this.selectedId) return;
    const ok = this.profile.rotateItem(this.selectedId);
    this.message = ok ? 'WEAPON ROTATED' : 'NO ROOM TO ROTATE';
    this.error = !ok;
    this.render();
  }

  render(): void {
    const { money, level, xp, perkPoints, stash, equippedId } = this.profile.data;
    this.moneyEl.textContent = `$${money.toLocaleString('en-US')}`;
    this.levelEl.textContent = `LVL ${level} · ${xp}/${xpForNext(level)} XP · ${perkPoints} PP`;
    const items = stash;
    if (!this.selectedId || !items.some((item) => item.id === this.selectedId)) {
      this.selectedId = equippedId ?? items[0]?.id ?? null;
    }
    this.grid.innerHTML = items
      .map((item) => {
        if (item.cellX < 0 || item.cellY < 0) return '';
        if (this.filter === 'guns' && item.weapon === 'bat') return '';
        if (this.filter === 'melee' && item.weapon !== 'bat') return '';
        const size = caseSize(item.weapon, item.turned);
        const name = item.variant ? NAMED_MAP[item.variant].name : WEAPONS[item.weapon].name;
        const ammo = item.weapon === 'bat' ? 'MELEE' : `${item.ammo} RDS`;
        const mod = item.attachment ? ATTACHMENT_MAP[item.attachment].name : 'STOCK';
        const carry = item.id === equippedId;
        return `<div class="case-item${carry ? ' equipped' : ''}${item.id === this.selectedId ? ' selected' : ''}"
          data-id="${item.id}"
          style="left:${item.cellX * CASE_CELL}px;top:${item.cellY * CASE_CELL}px;width:${size.w * CASE_CELL}px;height:${size.h * CASE_CELL}px">
          <span class="case-name">${name}</span>
          <span class="case-meta">${ammo} · ${mod}</span>
          ${carry ? '<span class="case-carry">CARRYING</span>' : ''}
        </div>`;
      })
      .join('');

    const selected = items.find((item) => item.id === this.selectedId) ?? null;
    if (!selected) {
      this.detailEl.innerHTML = `<p class="sh-note">NO WEAPON IN THE CASE. BUY ONE AT THE MARKET.</p>`;
    } else {
      const name = selected.variant ? NAMED_MAP[selected.variant].name : WEAPONS[selected.weapon].name;
      const ammo = selected.weapon === 'bat' ? 'MELEE' : `${selected.ammo} ROUNDS`;
      const mod = selected.attachment ? ATTACHMENT_MAP[selected.attachment].name : 'NO ATTACHMENT';
      const variant = selected.variant ? 'NAMED VARIANT' : 'STANDARD FRAME';
      const carry = selected.id === equippedId;
      const overflow = items.filter((item) => item.cellX < 0 || item.cellY < 0);
      const capacity = items
        .filter((item) => item.cellX >= 0 && item.cellY >= 0)
        .reduce((sum, item) => {
          const size = caseSize(item.weapon, item.turned);
          return sum + size.w * size.h;
        }, 0);
      this.detailEl.innerHTML = `<div class="kicker">// SELECTED</div>
        <div class="case-detail-name">${name}</div>
        <div class="case-detail-meta">${ammo} · ${mod}</div>
        <div class="case-detail-meta">${variant} · SELL $${this.profile.sellValue(selected)}</div>
        <div class="case-detail-meta">CAPACITY ${capacity}/60</div>
        <div class="case-detail-note">${carry ? 'CURRENTLY CARRIED. THIS IS YOUR DEPLOYMENT LOADOUT.' : 'IN STORAGE. EQUIP TO CARRY IT INTO THE NEXT SECTOR.'}</div>
        ${
          overflow.length
            ? `<div class="case-overflow"><div class="kicker">// OVERFLOW ${overflow.length}</div>${overflow
                .map(
                  (item) =>
                    `<button data-act="case-overflow" data-id="${item.id}">${WEAPONS[item.weapon].name} · AUTO-ARRANGE</button>`,
                )
                .join('')}</div>`
            : ''
        }`;
    }
    this.root.querySelectorAll<HTMLElement>('[data-act="case-filter"]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.filter === this.filter);
    });
    this.equipEl.disabled = !selected || selected.id === equippedId;
    this.rotateEl.disabled = !selected;
    this.msgEl.textContent = this.message;
    this.msgEl.classList.toggle('err', this.error);
  }

  private equipSelected(): void {
    if (!this.selectedId) return;
    const error = this.profile.equip(this.selectedId);
    if (error) {
      this.message = error;
      this.error = true;
    } else {
      this.message = 'LOADOUT UPDATED';
      this.error = false;
    }
    this.render();
  }

  private handleClick(ev: MouseEvent): void {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) return;
    switch (target.dataset.act) {
      case 'close-case':
        this.hooks.onClick();
        this.close();
        return;
      case 'case-auto':
        this.hooks.onClick();
        this.profile.autoArrange();
        this.message = 'CASE REARRANGED';
        this.error = false;
        this.render();
        return;
      case 'case-filter': {
        this.hooks.onClick();
        const filter = target.dataset.filter;
        if (filter === 'all' || filter === 'guns' || filter === 'melee') {
          this.filter = filter;
        }
        this.render();
        return;
      }
      case 'case-overflow': {
        const id = target.dataset.id;
        if (!id) return;
        this.selectedId = id;
        this.message = 'OVERFLOW — AUTO-ARRANGE TO PLACE';
        this.error = false;
        this.render();
        return;
      }
      case 'case-rotate':
        this.hooks.onClick();
        this.rotate();
        return;
      case 'case-equip':
        this.hooks.onClick();
        this.equipSelected();
        return;
      default:
        return;
    }
  }

  private onPointerDown(ev: PointerEvent): void {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('.case-item');
    if (!el) return;
    const id = el.dataset.id;
    if (!id) return;
    const item = this.profile.data.stash.find((entry) => entry.id === id);
    if (!item) return;
    this.selectedId = id;
    this.message = '';
    this.render();
    if (item.cellX < 0 || item.cellY < 0) return;
    const rect = this.grid.getBoundingClientRect();
    this.drag = {
      id,
      dx: ev.clientX - (rect.left + item.cellX * CASE_CELL),
      dy: ev.clientY - (rect.top + item.cellY * CASE_CELL),
      startX: ev.clientX,
      startY: ev.clientY,
    };
    ev.preventDefault();
  }

  private onPointerMove(ev: PointerEvent): void {
    if (!this.drag) return;
    const el = this.grid.querySelector<HTMLElement>(`.case-item[data-id="${this.drag.id}"]`);
    if (!el) return;
    const rect = this.grid.getBoundingClientRect();
    el.style.left = `${ev.clientX - this.drag.dx - rect.left}px`;
    el.style.top = `${ev.clientY - this.drag.dy - rect.top}px`;
    el.classList.add('dragging');
  }

  private onPointerUp(ev: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    const item = this.profile.data.stash.find((entry) => entry.id === drag.id);
    if (!item) {
      this.render();
      return;
    }
    const moved = Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) > 4;
    if (!moved) {
      this.render();
      return;
    }
    const rect = this.grid.getBoundingClientRect();
    const x = Math.round((ev.clientX - drag.dx - rect.left) / CASE_CELL);
    const y = Math.round((ev.clientY - drag.dy - rect.top) / CASE_CELL);
    const ok = this.profile.placeItem(item.id, x, y, item.turned);
    this.message = ok ? `${WEAPONS[item.weapon].name} MOVED` : 'NO ROOM THERE';
    this.error = !ok;
    this.render();
  }

  private onDoubleClick(ev: MouseEvent): void {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('.case-item');
    const id = el?.dataset.id;
    if (!id) return;
    this.selectedId = id;
    this.equipSelected();
    this.hooks.onClick();
  }
}
