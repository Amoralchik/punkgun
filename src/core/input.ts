import { readGamepad } from './gamepad';

/** Keyboard / gamepad / mouse state with per-frame edge detection. */
export class Input {
  readonly keys = new Set<string>();
  private pressed = new Set<string>();
  private keymap: Record<string, string> = {};
  private gamepadCodes = new Set<string>();
  private gamepadFire = false;
  private gamepadThrow = false;

  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  rightDown = false;
  mousePressed = false;
  rightPressed = false;

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)
      ) {
        e.preventDefault();
      }
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
      this.rightDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        if (!this.mouseDown) this.mousePressed = true;
        this.mouseDown = true;
      } else if (e.button === 2) {
        if (!this.rightDown) this.rightPressed = true;
        this.rightDown = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  held(code: string): boolean {
    return this.keys.has(this.keymap[code] ?? code);
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(this.keymap[code] ?? code);
  }

  setKeymap(map: Record<string, string>): void {
    this.keymap = map;
  }

  /** Poll a standard gamepad once per frame; keyboard/mouse remain authoritative. */
  pollGamepad(dt: number): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((entry) => entry?.connected) ?? null;
    const state = readGamepad(pad);
    const active = new Set<string>();
    if (state.connected) {
      const speed = 620 * Math.max(0, Math.min(0.05, dt));
      if (state.aimX !== 0 || state.aimY !== 0) {
        const maxX = Math.max(1, window.innerWidth - 1);
        const maxY = Math.max(1, window.innerHeight - 1);
        this.mouseX = Math.max(0, Math.min(maxX, this.mouseX + state.aimX * speed));
        this.mouseY = Math.max(0, Math.min(maxY, this.mouseY + state.aimY * speed));
      }
      if (state.fire) {
        if (!this.mouseDown) this.mousePressed = true;
        this.mouseDown = true;
        this.gamepadFire = true;
      } else if (this.gamepadFire) {
        this.mouseDown = false;
        this.gamepadFire = false;
      }
      if (state.throwWeapon) {
        if (!this.rightDown) this.rightPressed = true;
        this.rightDown = true;
        this.gamepadThrow = true;
      } else if (this.gamepadThrow) {
        this.rightDown = false;
        this.gamepadThrow = false;
      }
      if (state.moveY < 0) active.add('KeyW');
      if (state.moveY > 0) active.add('KeyS');
      if (state.moveX < 0) active.add('KeyA');
      if (state.moveX > 0) active.add('KeyD');
      const bindings: Array<[boolean, string]> = [
        [state.dash, 'Space'],
        [state.reload, 'KeyR'],
        [state.interact, 'KeyE'],
        [state.quickhack, 'KeyZ'],
        [state.supply, 'KeyQ'],
        [state.sandevistan, 'ShiftLeft'],
        [state.camo, 'KeyC'],
        [state.emp, 'KeyX'],
        [state.berserk, 'KeyV'],
        [state.overclock, 'KeyG'],
        [state.intrusion, 'KeyH'],
        [state.pause, 'Pause'],
        [state.menuUp, 'MenuUp'],
        [state.menuDown, 'MenuDown'],
        [state.menuLeft, 'MenuLeft'],
        [state.menuRight, 'MenuRight'],
        [state.menuAccept, 'MenuAccept'],
        [state.menuBack, 'MenuBack'],
      ];
      for (const [on, code] of bindings) if (on) active.add(code);
    }

    for (const code of this.gamepadCodes) {
      if (active.has(code)) continue;
      this.keys.delete(this.keymap[code] ?? code);
    }
    for (const code of active) {
      const physical = this.keymap[code] ?? code;
      if (!this.gamepadCodes.has(code)) this.pressed.add(physical);
      this.keys.add(physical);
    }
    this.gamepadCodes = active;
  }

  endFrame(): void {
    this.pressed.clear();
    this.mousePressed = false;
    this.rightPressed = false;
  }
}
