import { describe, it, expect } from 'vitest';
import { ledgerGlyphs } from '../ledger';

describe('ledgerGlyphs', () => {
  // 2026-07-09 is a Thursday; week = Mon 07-06 … Sun 07-12
  const today = new Date('2026-07-09T12:00:00Z');
  it('marks practiced days as notes, past gaps as rests, future as future', () => {
    const g = ledgerGlyphs(['2026-07-06', '2026-07-07', '2026-07-09'], today);
    expect(g).toEqual(['note', 'note', 'rest', 'note', 'future', 'future', 'future']);
  });
  it('is all rests+future with no practice', () => {
    expect(ledgerGlyphs([], today))
      .toEqual(['rest', 'rest', 'rest', 'rest', 'future', 'future', 'future']);
  });

  it('normalizes an offset timestamp to its UTC day', () => {
    // '2026-07-06T23:30:00-05:00' is UTC 2026-07-07 (Tuesday), not 07-06
    const g = ledgerGlyphs(['2026-07-06T23:30:00-05:00'], today);
    expect(g).toEqual(['rest', 'note', 'rest', 'rest', 'future', 'future', 'future']);
  });

  it('handles Sunday as today (all rest, no future)', () => {
    const sunday = new Date('2026-07-12T12:00:00Z');
    expect(ledgerGlyphs([], sunday))
      .toEqual(['rest', 'rest', 'rest', 'rest', 'rest', 'rest', 'rest']);
  });

  it('handles Monday as today (only day 0 is rest, rest are future)', () => {
    const monday = new Date('2026-07-06T12:00:00Z');
    expect(ledgerGlyphs([], monday))
      .toEqual(['rest', 'future', 'future', 'future', 'future', 'future', 'future']);
  });
});
