import { describe, expect, it } from 'vitest';
import { MANUAL_SECTIONS, renderManualSections, renderTourItems } from './manual';

describe('manual localization', () => {
  it('renders every section in English and Spanish', () => {
    const en = renderManualSections('en');
    const es = renderManualSections('es');
    expect(en.split('<section>')).toHaveLength(MANUAL_SECTIONS.length + 1);
    expect(es.split('<section>')).toHaveLength(MANUAL_SECTIONS.length + 1);
    expect(en).toContain('MOVEMENT & COMBAT');
    expect(es).toContain('MOVIMIENTO Y COMBATE');
    expect(es).not.toContain('MOVEMENT & COMBAT');
    expect(es).toContain('PARTIDA FANTASMA');
  });

  it('renders the Spanish tour without English labels', () => {
    const es = renderTourItems('es');
    expect(es).toContain('DESPLIEGUE');
    expect(es).toContain('SANTUARIO');
    expect(es).not.toContain('CONTRACTS');
  });
});
