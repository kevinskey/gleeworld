import { describe, expect, it } from 'vitest';
import { buildAuctionNudge, toE164, WHATSAPP_BODY_LIMIT } from '../whatsapp.ts';

// Twilio accepts E.164 and nothing else. People type whatever they like.
describe('toE164', () => {
  it('accepts a number already in E.164', () => {
    expect(toE164('+14045551234')).toBe('+14045551234');
  });

  it('normalises the way a US number is actually typed', () => {
    expect(toE164('(404) 555-1234')).toBe('+14045551234');
    expect(toE164('404-555-1234')).toBe('+14045551234');
    expect(toE164('404.555.1234')).toBe('+14045551234');
    expect(toE164('4045551234')).toBe('+14045551234');
  });

  it('handles a US number written with its country code but no plus', () => {
    expect(toE164('14045551234')).toBe('+14045551234');
  });

  it('keeps a non-US number that arrives with a plus', () => {
    expect(toE164('+442071838750')).toBe('+442071838750');
  });

  it('strips a whatsapp: prefix rather than doubling it later', () => {
    expect(toE164('whatsapp:+14045551234')).toBe('+14045551234');
  });

  it('refuses what it cannot resolve instead of guessing a country', () => {
    // 9 digits is not a US number and carries no country code — prefixing +1
    // would invent a real phone belonging to someone else.
    expect(toE164('404555123')).toBeNull();
    expect(toE164('')).toBeNull();
    expect(toE164(null)).toBeNull();
    expect(toE164('not a phone')).toBeNull();
    expect(toE164('+0123456789')).toBeNull();
  });

  it('rejects an absurdly long string', () => {
    expect(toE164('+' + '9'.repeat(20))).toBeNull();
  });
});

describe('buildAuctionNudge', () => {
  const base = { searchName: 'MRI under $80k', count: 3, appUrl: 'https://lykehouse.gleeworld.org' };

  it('names the search and the count', () => {
    const m = buildAuctionNudge(base);
    expect(m).toContain('MRI under $80k');
    expect(m).toContain('3');
  });

  it('uses the singular for one lot', () => {
    expect(buildAuctionNudge({ ...base, count: 1 })).toMatch(/1 new lot\b/);
  });

  it('links back to the matches page rather than restating the lots', () => {
    // WhatsApp is a nudge; the detail lives in the app and the email.
    expect(buildAuctionNudge(base)).toContain('/auctions/matches');
  });

  it('stays inside the WhatsApp body limit even with a silly search name', () => {
    const m = buildAuctionNudge({ ...base, searchName: 'x'.repeat(500) });
    expect(m.length).toBeLessThanOrEqual(WHATSAPP_BODY_LIMIT);
  });

  it('truncates a long name visibly rather than cutting mid-word silently', () => {
    const m = buildAuctionNudge({ ...base, searchName: 'y'.repeat(200) });
    expect(m).toContain('…');
  });

  it('says nothing that reads as a quote or a valuation', () => {
    const m = buildAuctionNudge(base).toLowerCase();
    for (const banned of ['worth', 'valued', 'quote', 'guaranteed', 'deal']) {
      expect(m).not.toContain(banned);
    }
  });
});
