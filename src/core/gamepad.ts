/** Pure mapping for a standard-mapping gamepad. */
export interface GamepadState {
  connected: boolean;
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  throwWeapon: boolean;
  dash: boolean;
  reload: boolean;
  interact: boolean;
  quickhack: boolean;
  supply: boolean;
  sandevistan: boolean;
  camo: boolean;
  emp: boolean;
  berserk: boolean;
  overclock: boolean;
  intrusion: boolean;
  pause: boolean;
  menuUp: boolean;
  menuDown: boolean;
  menuLeft: boolean;
  menuRight: boolean;
  menuAccept: boolean;
  menuBack: boolean;
}

const EMPTY: GamepadState = {
  connected: false,
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  fire: false,
  throwWeapon: false,
  dash: false,
  reload: false,
  interact: false,
  quickhack: false,
  supply: false,
  sandevistan: false,
  camo: false,
  emp: false,
  berserk: false,
  overclock: false,
  intrusion: false,
  pause: false,
  menuUp: false,
  menuDown: false,
  menuLeft: false,
  menuRight: false,
  menuAccept: false,
  menuBack: false,
};

function radial(x: number, y: number, deadzone: number): [number, number] {
  const length = Math.hypot(x, y);
  if (length <= deadzone) return [0, 0];
  const scale = (length - deadzone) / (1 - deadzone);
  return [(x / length) * scale, (y / length) * scale];
}

function down(pad: Gamepad, index: number): boolean {
  return pad.buttons[index]?.pressed === true || (pad.buttons[index]?.value ?? 0) > 0.5;
}

export function readGamepad(pad: Gamepad | null | undefined, deadzone = 0.22): GamepadState {
  if (!pad || !pad.connected) return EMPTY;
  const [moveX, moveY] = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0, deadzone);
  const [aimX, aimY] = radial(pad.axes[2] ?? 0, pad.axes[3] ?? 0, deadzone);
  return {
    connected: true,
    moveX,
    moveY,
    aimX,
    aimY,
    fire: (pad.buttons[7]?.value ?? 0) > 0.35 || down(pad, 7),
    throwWeapon: (pad.buttons[6]?.value ?? 0) > 0.35 || down(pad, 6),
    dash: down(pad, 0),
    reload: down(pad, 1),
    interact: down(pad, 2),
    quickhack: down(pad, 3),
    supply: down(pad, 8),
    sandevistan: down(pad, 4),
    camo: down(pad, 5),
    emp: down(pad, 14),
    berserk: down(pad, 13),
    overclock: down(pad, 12),
    intrusion: down(pad, 15),
    pause: down(pad, 9),
    menuUp: down(pad, 12),
    menuDown: down(pad, 13),
    menuLeft: down(pad, 14),
    menuRight: down(pad, 15),
    menuAccept: down(pad, 0),
    menuBack: down(pad, 1),
  };
}
