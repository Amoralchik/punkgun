/** Small bottom-of-screen status toast for offline/update state. */
export class SystemToast {
  private readonly root = document.getElementById('system-toast')!;
  private readonly message = document.getElementById('system-toast-message')!;
  private readonly action = document.getElementById('system-toast-action') as HTMLButtonElement;
  private readonly dismiss = document.getElementById('system-toast-dismiss') as HTMLButtonElement;

  constructor() {
    this.action.addEventListener('click', () => {
      const handler = this.handler;
      this.hide();
      handler?.();
    });
    this.dismiss.addEventListener('click', () => this.hide());
  }

  private handler: (() => void) | null = null;

  show(message: string, actionLabel: string | null, handler: (() => void) | null): void {
    this.message.textContent = message;
    this.handler = handler;
    this.action.textContent = actionLabel ?? 'RELOAD';
    this.action.classList.toggle('hidden', !actionLabel);
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.handler = null;
    this.root.classList.add('hidden');
  }

  get visible(): boolean {
    return !this.root.classList.contains('hidden');
  }
}
