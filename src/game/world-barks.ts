import { dist } from '../core/math';
import type { Enemy, WorldEvent } from './world-types';

/**
 * Enemy callouts. Legible intent is most of what makes AI feel smart: a
 * squad that says "FLANKING" and then flanks reads as a squad. Barks are
 * also heard through walls, so they carry information the darkness hides.
 */
export type BarkId =
  | 'contact'
  | 'heard'
  | 'manDown'
  | 'fragOut'
  | 'flanking'
  | 'lost'
  | 'clear'
  | 'giveUp'
  | 'staggered'
  | 'exitHold';

export const BARK_TEXT: Record<BarkId, { en: string[]; es: string[] }> = {
  contact: { en: ['CONTACT!', 'THERE!', 'HOSTILE!'], es: ['¡CONTACTO!', '¡AHÍ!', '¡HOSTIL!'] },
  heard: { en: ['WHAT WAS THAT?', 'YOU HEAR THAT?'], es: ['¿QUÉ FUE ESO?', '¿OÍSTE ESO?'] },
  manDown: { en: ['MAN DOWN!', 'WE LOST ONE!'], es: ['¡HOMBRE CAÍDO!', '¡PERDIMOS UNO!'] },
  fragOut: { en: ['FRAG OUT!'], es: ['¡GRANADA!'] },
  flanking: { en: ['FLANKING!', 'MOVING AROUND!'], es: ['¡FLANQUEANDO!', '¡LO RODEO!'] },
  lost: { en: ['LOST HIM. SPREAD OUT.', 'WHERE\'D HE GO?'], es: ['LO PERDÍ. ABRÍOS.', '¿DÓNDE SE METIÓ?'] },
  clear: { en: ['CLEAR.', 'NOTHING HERE.'], es: ['DESPEJADO.', 'AQUÍ NADA.'] },
  giveUp: { en: ['BACK TO POST.', 'GHOST. FORGET IT.'], es: ['DE VUELTA AL PUESTO.', 'UN FANTASMA. OLVÍDALO.'] },
  staggered: { en: ['AGH—!', 'PLATE\'S GONE!'], es: ['¡AGH—!', '¡SE ROMPIÓ LA PLACA!'] },
  exitHold: { en: ['HOLD THE EXIT!'], es: ['¡AGUANTAD LA SALIDA!'] },
};

export interface Bark {
  id: number;
  enemyId: number;
  key: BarkId;
  /** Which variant line to show (stable per bark). */
  variant: number;
  t: number;
  life: number;
}

export interface BarkState {
  barks: Bark[];
  /** Global gap so callouts don't pile on each other. */
  gapT: number;
  nextId: number;
  /** Per-enemy cooldowns. */
  cooldowns: Map<number, number>;
}

export function createBarkState(): BarkState {
  return { barks: [], gapT: 0, nextId: 1, cooldowns: new Map() };
}

const LIFE = 1.7;
const PER_ENEMY_CD = 3.5;
const GLOBAL_GAP = 0.45;
const MAX_ACTIVE = 3;

/** Try to bark. Returns true if the line was queued. */
export function bark(
  state: BarkState,
  e: Enemy,
  key: BarkId,
  rand: () => number,
  urgent = false,
): boolean {
  if (!e.alive || e.kind === 'boss' || e.kind === 'drone' || e.kind === 'hound') return false;
  if (!urgent && state.gapT > 0) return false;
  if ((state.cooldowns.get(e.id) ?? 0) > 0) return false;
  if (state.barks.length >= MAX_ACTIVE) return false;
  state.barks.push({
    id: state.nextId++,
    enemyId: e.id,
    key,
    variant: Math.floor(rand() * 8),
    t: 0,
    life: LIFE,
  });
  state.cooldowns.set(e.id, PER_ENEMY_CD);
  state.gapT = GLOBAL_GAP;
  return true;
}

export function tickBarks(state: BarkState, dt: number): void {
  state.gapT = Math.max(0, state.gapT - dt);
  for (const [id, cd] of state.cooldowns) {
    if (cd - dt <= 0) state.cooldowns.delete(id);
    else state.cooldowns.set(id, cd - dt);
  }
  for (let i = state.barks.length - 1; i >= 0; i--) {
    state.barks[i].t += dt;
    if (state.barks[i].t >= state.barks[i].life) state.barks.splice(i, 1);
  }
}

export function barkText(b: Bark, locale: 'en' | 'es'): string {
  const lines = BARK_TEXT[b.key][locale];
  return lines[b.variant % lines.length];
}

function nearestAlive(enemies: Enemy[], x: number, y: number, radius: number, exclude?: Enemy): Enemy | null {
  let best: Enemy | null = null;
  let bestD = radius;
  for (const e of enemies) {
    if (!e.alive || e === exclude) continue;
    const d = dist(e.x, e.y, x, y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

/**
 * Event-driven callouts. Called from the world's single event funnel so AI
 * modules need no extra plumbing.
 */
export function barkForEvent(
  state: BarkState,
  enemies: Enemy[],
  event: WorldEvent,
  playerPos: { x: number; y: number },
  rand: () => number,
): void {
  switch (event.type) {
    case 'alert': {
      const e = nearestAlive(enemies, event.x, event.y, 24);
      if (e) bark(state, e, 'contact', rand, true);
      return;
    }
    case 'bodyFound': {
      const e = nearestAlive(enemies, event.x, event.y, 320);
      if (e) bark(state, e, 'manDown', rand, true);
      return;
    }
    case 'kill': {
      // A squadmate who is already in the fight reacts to the loss.
      const e = nearestAlive(enemies, event.x, event.y, 300);
      if (e && (e.state === 'chase' || e.state === 'alert') && rand() < 0.55) bark(state, e, 'manDown', rand);
      return;
    }
    case 'fragThrow': {
      if (dist(event.x, event.y, playerPos.x, playerPos.y) < 4) return;
      const e = nearestAlive(enemies, event.x, event.y, 24);
      if (e) bark(state, e, 'fragOut', rand, true);
      return;
    }
    case 'armorBreakEnemy': {
      const e = nearestAlive(enemies, event.x, event.y, 24);
      if (e) bark(state, e, 'staggered', rand);
      return;
    }
    default:
      return;
  }
}
