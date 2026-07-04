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
});
