import type { Input } from '../core/input';
import {
  breachReward,
  generateBreach,
  selectBreachCell,
  tickBreach,
  type BreachState,
} from '../game/breach';

type Hazard = 'camera' | 'turret' | null;

export interface BreachHooks {
  onFinish: (success: boolean, nodeId: number, hazard: Hazard, reward: number) => void;
  onClick: () => void;
  onError: () => void;
}

/** Breach grid modal: state, timer, rendering and selection. */
export class BreachController {
  state: BreachState | null = null;
  private nodeId: number | null = null;
  private hazard: Hazard = null;
  private readonly root = document.getElementById('overlay-breach')!;
  private readonly grid = document.getElementById('breach-grid')!;
  private readonly target = document.getElementById('breach-target')!;
  private readonly buffer = document.getElementById('breach-buffer')!;
  private readonly timer = document.getElementById('breach-timer')!;
  private readonly message = document.getElementById('breach-msg')!;

  constructor(
    private readonly input: Input,
    private readonly hooks: BreachHooks,
  ) {}

  get active(): boolean {
    return this.state !== null;
  }

  open(nodeId: number, hazard: Hazard, seed: number): void {
    this.state = generateBreach(seed);
    this.nodeId = nodeId;
    this.hazard = hazard;
    this.root.classList.remove('hidden');
    this.render();
    this.input.endFrame();
  }

  tick(dt: number): void {
    if (!this.state) return;
    tickBreach(this.state, dt);
    this.timer.textContent = `${this.state.timeLeft.toFixed(1)}S`;
    if (this.state.status === 'lost') this.finish(false);
  }

  handleClick(event: MouseEvent): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-act], [data-breach]',
    );
    if (!target) return;
    if (target.dataset.act === 'breach-abort') {
      this.finish(false);
      return;
    }
    const cell = target.dataset.breach;
    if (!cell || !this.state) return;
    const [row, column] = cell.split(':').map(Number);
    const result = selectBreachCell(this.state, row, column);
    if (!result.ok) {
      this.message.textContent = result.reason ?? 'INVALID SELECTION';
      this.hooks.onError();
      return;
    }
    this.render();
    if (result.won) this.finish(true);
    else if (result.lost) this.finish(false);
    else this.hooks.onClick();
  }

  finish(success: boolean): void {
    const state = this.state;
    const nodeId = this.nodeId;
    if (!state || nodeId === null) return;
    const hazard = this.hazard;
    this.state = null;
    this.nodeId = null;
    this.hazard = null;
    this.root.classList.add('hidden');
    this.hooks.onFinish(success, nodeId, hazard, breachReward(state));
    this.input.endFrame();
  }

  private render(): void {
    const state = this.state;
    if (!state) return;
    this.timer.textContent = `${state.timeLeft.toFixed(1)}S`;
    this.target.innerHTML = state.target
      .map(
        (token, index) =>
          `<span class="breach-token${index < state.progress ? ' hit' : ''}">${token}</span>`,
      )
      .join('');
    this.buffer.innerHTML =
      state.buffer.map((token) => `<span class="breach-token">${token}</span>`).join('') ||
      '<span class="breach-token">EMPTY</span>';
    this.grid.innerHTML = state.grid
      .flatMap((row, rowIndex) =>
        row.map(
          (token, columnIndex) =>
            `<button class="breach-cell${state.used[rowIndex][columnIndex] ? ' used' : ''}"
              data-breach="${rowIndex}:${columnIndex}"
              ${state.used[rowIndex][columnIndex] || state.status !== 'ready' ? 'disabled' : ''}>${token}</button>`,
        ),
      )
      .join('');
    this.message.textContent = 'MATCH THE TARGET SEQUENCE. ROW → COLUMN → ROW.';
  }
}
