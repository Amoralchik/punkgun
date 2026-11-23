import { describe, expect, it } from 'vitest';
import {
  MANUAL_SECTIONS,
  TOUR_STEPS,
  renderManualSections,
  renderTourStep,
} from './manual';

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

  it('covers the first-run journey in both locales', () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(6);
    for (const step of TOUR_STEPS) {
      expect(step.title.en.length).toBeGreaterThan(0);
      expect(step.title.es.length).toBeGreaterThan(0);
      expect(step.body.en.length).toBeGreaterThan(0);
      expect(step.body.es.length).toBeGreaterThan(0);
    }
    const es = TOUR_STEPS.map((step) => renderTourStep(step, 'es')).join('');
    expect(es).toContain('CONTRATOS');
    expect(es).toContain('DESPLIEGUE');
    expect(es).toContain('CLÍNICA');
    expect(es).not.toContain('CONTRACTS');
    expect(es).not.toContain('WORKBENCH');
    const en = TOUR_STEPS.map((step) => renderTourStep(step, 'en')).join('');
    expect(en).toContain('CONTRACTS');
    expect(en).toContain('THE OBJECTIVE');
  });
});
