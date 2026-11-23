import { describe, expect, it } from 'vitest';
import { APPROACHES, ATTRIBUTE_DEFS } from './attributes';
import { LIFEPATHS } from './lifepath';
import { ROLES } from './roles';

describe('operator identity localization', () => {
  it('has Spanish copy for attributes, approaches, paths and roles', () => {
    for (const def of ATTRIBUTE_DEFS) {
      expect(def.shortEs.length).toBeGreaterThan(0);
      expect(def.descEs.length).toBeGreaterThan(0);
    }
    for (const def of APPROACHES) expect(def.descEs.length).toBeGreaterThan(0);
    for (const def of LIFEPATHS) expect(def.descEs.length).toBeGreaterThan(0);
    for (const def of ROLES) expect(def.blurbEs.length).toBeGreaterThan(0);
  });
});
