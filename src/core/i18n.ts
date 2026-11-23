/**
 * Typed message seam. Copy is intentionally still inline in most of the UI;
 * new player-visible event copy should land here first so a second locale can
 * be added without rewriting the HUD/game modules.
 */
export type MessageKey =
  | 'event.bossPhase'
  | 'event.caseSecured'
  | 'event.exitOpen'
  | 'event.kerenzikov'
  | 'event.netrunnerHack'
  | 'event.objectiveComplete'
  | 'event.sabotage'
  | 'event.secondHeart';

const EN: Record<MessageKey, string> = {
  'event.bossPhase': 'ARMOR PLATE SHATTERED — BOSS PHASE SHIFT',
  'event.caseSecured': 'CASE SECURED — EXTRACT UNDER FIRE',
  'event.exitOpen': 'EXIT OPEN — GET OUT',
  'event.kerenzikov': 'KERENZIKOV — TIME DILATION',
  'event.netrunnerHack': 'SIGNAL SCRAMBLED — CYBERWARE LOCKED',
  'event.objectiveComplete': 'OBJECTIVE COMPLETE — EXIT OPEN',
  'event.sabotage': 'TAP PLANTED — GRID COMPROMISED',
  'event.secondHeart': 'SECOND HEART — FLATLINE AVERTED',
};

const CATALOGS: Record<string, Record<MessageKey, string>> = { en: EN };

export type Locale = keyof typeof CATALOGS;

export function t(
  key: MessageKey,
  vars?: Record<string, string | number>,
  locale: Locale = 'en',
): string {
  let text = CATALOGS[locale]?.[key] ?? EN[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
