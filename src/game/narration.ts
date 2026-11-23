import { mulberry32 } from '../core/math';
import type { Locale } from '../core/i18n';

/**
 * The operative's inner voice. Terse, tired, noir. Fires on a handful of
 * run beats, never twice in a run with the same line, and never more often
 * than the cooldown — it should feel like a thought, not a ticker.
 */
export type NarrationBeat =
  | 'insertion'
  | 'firstKill'
  | 'plateLost'
  | 'stealthKill'
  | 'bodyFound'
  | 'caseSecured'
  | 'exitOpen'
  | 'overtime'
  | 'civilianDown'
  | 'lastStand';

type Lines = Record<NarrationBeat, { en: string; es: string }[]>;

export const NARRATION: Lines = {
  insertion: [
    { en: 'Rain on the glass, static in my teeth. Same city, different floor.', es: 'Lluvia en el cristal, estática en los dientes. Misma ciudad, otro piso.' },
    { en: 'Somebody upstairs signed off on this. Somebody always does.', es: 'Alguien arriba firmó esto. Siempre hay alguien.' },
    { en: 'The building hums like it knows my name.', es: 'El edificio zumba como si supiera mi nombre.' },
    { en: 'Five minutes. In, through, out. The city keeps the change.', es: 'Cinco minutos. Entrar, cruzar, salir. La ciudad se queda el cambio.' },
  ],
  firstKill: [
    { en: 'First one is paperwork. The rest is arithmetic.', es: 'El primero es papeleo. El resto es aritmética.' },
    { en: 'He had a pension plan. Had.', es: 'Tenía un plan de pensiones. Tenía.' },
  ],
  plateLost: [
    { en: 'Plate cracked. That was the warning they don\'t send twice.', es: 'Placa rota. Esa era la advertencia que no envían dos veces.' },
    { en: 'Chrome holds. Meat is the part that worries me.', es: 'El cromo aguanta. La carne es lo que me preocupa.' },
  ],
  stealthKill: [
    { en: 'Quiet work. The kind nobody files a report on.', es: 'Trabajo silencioso. Del que nadie hace informe.' },
    { en: 'He never heard the rain change.', es: 'Nunca oyó cambiar la lluvia.' },
  ],
  bodyFound: [
    { en: 'They found him. Now the floor is listening.', es: 'Lo encontraron. Ahora el piso escucha.' },
  ],
  caseSecured: [
    { en: 'Heavy. Whatever\'s inside, somebody wants it more than I want to live.', es: 'Pesa. Lo que haya dentro, alguien lo quiere más que yo vivir.' },
  ],
  exitOpen: [
    { en: 'Door\'s open. Greed is a slower way to die.', es: 'La puerta está abierta. La codicia es una forma más lenta de morir.' },
    { en: 'Job\'s done. The clock isn\'t.', es: 'El trabajo está hecho. El reloj no.' },
  ],
  overtime: [
    { en: 'Hunters. The company sends its regards.', es: 'Cazadores. La empresa manda saludos.' },
    { en: 'Stayed too long. I always stay too long.', es: 'Me quedé demasiado. Siempre me quedo demasiado.' },
  ],
  civilianDown: [
    { en: 'Wrong place, wrong rain. That one stays with me.', es: 'Lugar equivocado, lluvia equivocada. Ese se queda conmigo.' },
    { en: 'They\'ll put that one on the news. Not my name. Not yet.', es: 'Ese saldrá en las noticias. No mi nombre. Todavía no.' },
  ],
  lastStand: [
    { en: 'No plates left. Just me and the arithmetic.', es: 'Sin placas. Solo yo y la aritmética.' },
  ],
};

/** Map a world event to the beat it narrates (if any). */
export function beatForEvent(type: string, state: { kills: number; armor: number }): NarrationBeat | null {
  switch (type) {
    case 'kill':
      return state.kills === 1 ? 'firstKill' : null;
    case 'armorHit':
      return state.armor <= 0 ? 'lastStand' : 'plateLost';
    case 'stealthKill':
      return 'stealthKill';
    case 'bodyFound':
      return 'bodyFound';
    case 'caseSecured':
      return 'caseSecured';
    case 'exitOpen':
      return 'exitOpen';
    case 'overtime':
      return 'overtime';
    case 'civilianDown':
      return 'civilianDown';
    default:
      return null;
  }
}

export class Narrator {
  private readonly used = new Set<string>();
  private cooldown = 0;
  private readonly rand: () => number;

  constructor(
    seed: number,
    private readonly cooldownS = 12,
  ) {
    this.rand = mulberry32(seed >>> 0);
  }

  tick(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  /**
   * A line for this beat, or null when on cooldown / exhausted. Urgent beats
   * (overtime, civilian, last stand) cut through the cooldown.
   */
  line(beat: NarrationBeat, locale: Locale): string | null {
    const urgent = beat === 'overtime' || beat === 'civilianDown' || beat === 'lastStand';
    if (this.cooldown > 0 && !urgent) return null;
    const pool = NARRATION[beat]
      .map((entry, i) => ({ entry, key: `${beat}:${i}` }))
      .filter((c) => !this.used.has(c.key));
    if (pool.length === 0) return null;
    const pick = pool[Math.floor(this.rand() * pool.length)];
    this.used.add(pick.key);
    this.cooldown = this.cooldownS;
    return locale === 'es' ? pick.entry.es : pick.entry.en;
  }
}
