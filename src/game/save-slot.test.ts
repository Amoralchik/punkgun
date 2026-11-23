import { describe, expect, it } from 'vitest';
import { profileSlot } from './save-slot';

describe('profile slot selection', () => {
  it('parses, clamps and defaults the URL slot', () => {
    expect(profileSlot('')).toBe(1);
    expect(profileSlot('?slot=2')).toBe(2);
    expect(profileSlot('?slot=9')).toBe(3);
    expect(profileSlot('?slot=-4')).toBe(1);
    expect(profileSlot('?slot=nope')).toBe(1);
  });
});
