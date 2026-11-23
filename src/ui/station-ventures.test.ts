import { describe, expect, it } from 'vitest';
import { setLocale } from '../core/i18n';
import type { Profile } from '../game/profile';
import { EMPTY_VENTURES } from '../game/ventures';
import { VENTURE_EVENT_MAP } from '../game/venture-events';
import { renderVentures } from './station-ventures';

const profile = {
  data: { ventures: { ...EMPTY_VENTURES } },
  pendingVentureEvent: () => VENTURE_EVENT_MAP['noodle-inspection'],
} as unknown as Profile;

describe('venture station locale', () => {
  it('renders Spanish venture copy when selected', () => {
    setLocale('es');
    try {
      const html = renderVentures(profile);
      expect(html).toContain('Comida callejera, libros limpios.');
      expect(html).toContain('Sin preguntas, sin recibos.');
      expect(html).toContain('precios de armas');
      expect(html).toContain('INSPECTOR SANITARIO');
      expect(html).toContain('PAGA LA MULTA');
      expect(VENTURE_EVENT_MAP['noodle-inspection'].choices[0].replyEs).toContain('papeleo');
    } finally {
      setLocale('en');
    }
  });
});
