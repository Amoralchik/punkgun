import { describe, expect, it } from 'vitest';
import { rollContracts } from './missions';
import { BOSS_DIALOGUE, authoredDialogue, contractTagline, handlerLine, localizeDialogue } from './lore';

describe('dialogue localization', () => {
  it('localizes authored lines, labels and replies', () => {
    const contract = rollContracts(1, 123)[0];
    const en = authoredDialogue(contract, {}, 'solo', 'street', 'en');
    const es = authoredDialogue(contract, {}, 'solo', 'street', 'es');
    expect(es[0].text).not.toBe(en[0].text);
    expect(es[1].text).toContain('El pago es real');
    expect(es[2].text).toContain('Elige el ángulo');
    const labels = es[2].choices?.map((choice) => choice.label) ?? [];
    expect(labels.some((label) => label.startsWith('Usa la ruta de'))).toBe(true);
    expect(labels).toContain('Trae las placas pesadas');
    expect(labels.some((label) => label.startsWith('ÁNGULO:'))).toBe(true);
    expect(es[2].choices?.[0].reply).toContain('Acceso limpio');
  });

  it('localizes contract taglines and handler lines', () => {
    const contract = rollContracts(1, 456)[0];
    expect(contractTagline(contract, 'es')).toBe(contract.taglineEs);
    expect(contractTagline(contract, 'en')).toBe(contract.tagline);
    expect(handlerLine('market', 0, 'es')).toContain('mercado');
    expect(handlerLine('market', 0, 'en')).toContain('market');
  });

  it('localizes the boss briefing and its choices', () => {
    const es = localizeDialogue(BOSS_DIALOGUE, 'es');
    expect(es[0].text).toContain('Subnivel');
    expect(es.at(-1)?.choices?.[0].label).toBe('RECORDAR AL SUJETO 06');
    expect(es.at(-1)?.choices?.[0].reply).toContain('Regístralo como persona');
    expect(localizeDialogue(BOSS_DIALOGUE, 'en')[0].text).toContain('Sublevel');
  });
});
