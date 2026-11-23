import { describe, expect, it } from 'vitest';
import { setLocale, t } from './i18n';

describe('message catalog', () => {
  it('returns the typed English copy and interpolates vars', () => {
    expect(t('event.exitOpen')).toBe('EXIT OPEN — GET OUT');
    expect(t('event.sabotage')).toContain('TAP PLANTED');
    expect(t('objective.recover', { count: 2, plural: 'S' })).toBe('RECOVER 2 CACHES');
    expect(t('station.operator')).toBe('OPERATOR');
    expect(t('boon.pay.desc')).toContain('12%');
    setLocale('es');
    expect(t('station.contracts')).toBe('CONTRATOS');
    expect(t('objective.recover', { count: 1, plural: '' })).toBe('RECUPERA 1 CACHÉ');
    setLocale('en');
  });
});
