import { describe, expect, it } from 'vitest';
import { formatAuctionWindow } from '../window';

// GSA publishes dates with no clock time; the loader stores 12:00Z so the
// calendar day is right in every US timezone. Rendering that back as
// "8:00 AM" invented a time nobody published — on a product about when to
// act, that is the wrong kind of wrong.
describe('formatAuctionWindow', () => {
  const opens = '2026-08-10T12:00:00Z';
  const closes = '2026-08-25T12:00:00Z';

  it('shows dates only when the source gave no clock time', () => {
    const s = formatAuctionWindow({ opens_at: opens, closes_at: closes, times_are_estimated: true });
    expect(s).toContain('Aug 10');
    expect(s).toContain('Aug 25');
    expect(s).not.toMatch(/\d{1,2}:\d{2}/);
    expect(s).not.toMatch(/AM|PM/i);
  });

  it('shows the clock time when a house actually published one', () => {
    const s = formatAuctionWindow({
      opens_at: '2026-09-14T14:30:00Z', closes_at: null, times_are_estimated: false,
    });
    expect(s).toMatch(/\d{1,2}:\d{2}/);
  });

  it('handles an opening date with no close', () => {
    const s = formatAuctionWindow({ opens_at: opens, closes_at: null, times_are_estimated: true });
    expect(s).toContain('Aug 10');
    expect(s.toLowerCase()).not.toContain('closes');
  });

  it('handles a close with no opening date', () => {
    const s = formatAuctionWindow({ opens_at: null, closes_at: closes, times_are_estimated: true });
    expect(s.toLowerCase()).toContain('closes');
    expect(s).toContain('Aug 25');
  });

  it('says the date is unannounced rather than rendering nothing', () => {
    const s = formatAuctionWindow({ opens_at: null, closes_at: null, times_are_estimated: false });
    expect(s.toLowerCase()).toContain('announced');
  });

  it('does not slip a day for a date-only auction in a western timezone', () => {
    // The 12:00Z convention exists for exactly this: a US viewer must still
    // read Aug 10, never Aug 9.
    const s = formatAuctionWindow({ opens_at: opens, closes_at: null, times_are_estimated: true });
    expect(s).toContain('Aug 10');
  });
});
