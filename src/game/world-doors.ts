import type { Door } from './world-types';

/** Advance door leaves toward their open/closed target. */
export function updateDoorAngles(doors: Door[], dt: number): void {
  for (const door of doors) {
    if (Math.abs(door.angle - door.target) < 0.01) {
      door.angle = door.target;
      continue;
    }
    const step = door.speed * dt;
    if (door.angle < door.target) door.angle = Math.min(door.target, door.angle + step);
    else door.angle = Math.max(door.target, door.angle - step);
  }
}
