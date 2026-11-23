import { describe, expect, it } from 'vitest';
import { setLocale, t } from './i18n';

describe('message catalog', () => {
  it('returns the typed English copy and interpolates vars', () => {
    expect(t('event.exitOpen')).toBe('EXIT OPEN — GET OUT');
    expect(t('event.sabotage')).toContain('TAP PLANTED');
    expect(t('objective.recover', { count: 2, plural: 'S' })).toBe('RECOVER 2 CACHES');
    expect(t('station.operator')).toBe('OPERATOR');
    expect(t('boon.pay.desc')).toContain('12%');
    expect(t('station.note.ventures1')).toContain('clean extraction');
    setLocale('es');
    expect(t('station.contracts')).toBe('CONTRATOS');
    expect(t('objective.recover', { count: 1, plural: '' })).toBe('RECUPERA 1 CACHÉ');
    expect(t('station.note.ventures1')).toContain('negocios');
    expect(t('station.note.contractLocked', { clears: 1, required: 3 })).toContain('1/3');
    setLocale('en');
  });
});
