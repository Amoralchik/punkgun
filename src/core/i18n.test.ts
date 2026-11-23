import { describe, expect, it } from 'vitest';
import { t } from './i18n';

describe('message catalog', () => {
  it('returns the typed English copy and interpolates vars', () => {
    expect(t('event.exitOpen')).toBe('EXIT OPEN — GET OUT');
    expect(t('event.sabotage')).toContain('TAP PLANTED');
  });
});
