import { describe, expect, it } from 'vitest';
import { toE164 } from '../phone';

// Mirrors supabase/functions/_shared/whatsapp.ts. The two cannot import each
// other across the src/functions boundary, so both are tested separately and
// these cases are kept identical on purpose — if one changes, change both.
describe('toE164 (client)', () => {
  it('accepts E.164 unchanged', () => {
    expect(toE164('+14045551234')).toBe('+14045551234');
  });

  it('normalises how a US number is actually typed', () => {
    expect(toE164('(404) 555-1234')).toBe('+14045551234');
    expect(toE164('404-555-1234')).toBe('+14045551234');
    expect(toE164('4045551234')).toBe('+14045551234');
    expect(toE164('14045551234')).toBe('+14045551234');
  });

  it('keeps an international number that arrives with a plus', () => {
    expect(toE164('+442071838750')).toBe('+442071838750');
  });

  it('refuses to guess a country for an ambiguous number', () => {
    // Prefixing +1 onto a 9-digit string invents a real phone belonging to
    // someone who never asked to hear from us.
    expect(toE164('404555123')).toBeNull();
  });

  it('rejects empty and nonsense input', () => {
    expect(toE164('')).toBeNull();
    expect(toE164(null)).toBeNull();
    expect(toE164('not a phone')).toBeNull();
    expect(toE164('+0123456789')).toBeNull();
  });
});
