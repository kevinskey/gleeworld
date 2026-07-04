import { describe, it, expect } from 'vitest';
import { ledgerGlyphs } from '../ledger';

describe('ledgerGlyphs', () => {
  // 2026-07-09 is a Thursday (local); week = Mon 07-06 … Sun 07-12.
  // Constructed via local component parts so the test's calendar day is
  // fixed regardless of the machine's timezone.
  const today = new Date(2026, 6, 9, 12);
  it('marks practiced days as notes, past gaps as rests, future as future', () => {
    const g = ledgerGlyphs(['2026-07-06', '2026-07-07', '2026-07-09'], today);
    expect(g).toEqual(['note', 'note', 'rest', 'note', 'future', 'future', 'future']);
  });
  it('is all rests+future with no practice', () => {
    expect(ledgerGlyphs([], today))
      .toEqual(['rest', 'rest', 'rest', 'rest', 'future', 'future', 'future']);
  });

  it('normalizes a timestamped entry to its local day', () => {
    // Local July 7, 9am (Tuesday) — a plain local Date constructor round-trips
    // through toISOString/new Date() to the same local calendar day on any
    // machine timezone, so this fixture is TZ-independent.
    const g = ledgerGlyphs([new Date(2026, 6, 7, 9).toISOString()], today);
    expect(g).toEqual(['rest', 'note', 'rest', 'rest', 'future', 'future', 'future']);
  });

  it('handles Sunday as today (all rest, no future)', () => {
    const sunday = new Date(2026, 6, 12, 12);
    expect(ledgerGlyphs([], sunday))
      .toEqual(['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']);
  });

  it('handles Monday as today (only day 0 is rest, rest are future)', () => {
    const monday = new Date(2026, 6, 6, 12);
    expect(ledgerGlyphs([], monday))
      .toEqual(['rest', 'future', 'future', 'future', 'future', 'future', 'future']);
  });
});
