import { describe, expect, it } from 'vitest';
import { buildDigestHtml, isSearchDue, type DigestMatch } from '../auctionDigest.ts';

const NOW = new Date('2026-08-18T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000).toISOString();

describe('isSearchDue', () => {
  it('always sends an instant search as soon as there is something to send', () => {
    expect(isSearchDue('instant', null, NOW)).toBe(true);
    expect(isSearchDue('instant', hoursAgo(0.1), NOW)).toBe(true);
  });

  it('sends a daily search that has never been sent', () => {
    expect(isSearchDue('daily', null, NOW)).toBe(true);
  });

  it('holds a daily search that already went out this cycle', () => {
    expect(isSearchDue('daily', hoursAgo(3), NOW)).toBe(false);
  });

  it('releases a daily search a little under 24h so a fixed-time cron never skips a day', () => {
    expect(isSearchDue('daily', hoursAgo(20), NOW)).toBe(true);
  });

  it('holds a weekly search until nearly a week has passed', () => {
    expect(isSearchDue('weekly', hoursAgo(24 * 3), NOW)).toBe(false);
    expect(isSearchDue('weekly', hoursAgo(24 * 7), NOW)).toBe(true);
  });

  it('treats an unrecognised frequency as daily rather than never sending', () => {
    expect(isSearchDue('fortnightly', null, NOW)).toBe(true);
    expect(isSearchDue('fortnightly', hoursAgo(1), NOW)).toBe(false);
  });

  it('ignores an unparseable timestamp instead of blocking forever', () => {
    expect(isSearchDue('daily', 'not a date', NOW)).toBe(true);
  });
});

const match = (over: Partial<DigestMatch> = {}): DigestMatch => ({
  lot_id: 'l1',
  title: 'Siemens Magnetom Avanto 1.5T',
  auction_title: 'Imaging equipment sale',
  source_name: 'Heritage Global Partners',
  closes_at: '2026-09-14T18:00:00Z',
  current_bid_cents: 500000,
  score: 91.5,
  url: 'https://example.test/lot/1',
  ...over,
});

describe('buildDigestHtml', () => {
  it('names the saved search and lists the lots', () => {
    const html = buildDigestHtml('MRI under $80k', [match()]);
    expect(html).toContain('MRI under $80k');
    expect(html).toContain('Siemens Magnetom Avanto 1.5T');
    expect(html).toContain('Heritage Global Partners');
  });

  it('formats the current bid as money', () => {
    expect(buildDigestHtml('s', [match()])).toContain('$5,000');
  });

  it('says so plainly when there are no bids yet', () => {
    expect(buildDigestHtml('s', [match({ current_bid_cents: null })])).toContain('No bids yet');
  });

  it('escapes HTML in listing text so a catalog title cannot inject markup', () => {
    const html = buildDigestHtml('s', [match({ title: '<script>alert(1)</script>' })]);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes the search name too', () => {
    const html = buildDigestHtml('<img src=x onerror=y>', [match()]);
    expect(html).not.toContain('<img src=x');
  });

  it('carries the not-a-quote caveat the module requires', () => {
    const html = buildDigestHtml('s', [match()]).toLowerCase();
    expect(html).toContain('confirm');
    expect(html).toMatch(/estimate|not a quote|verify/);
  });

  it('links each lot to the house listing when there is one', () => {
    expect(buildDigestHtml('s', [match()])).toContain('https://example.test/lot/1');
  });

  it('omits the link markup entirely when a lot has no url', () => {
    const html = buildDigestHtml('s', [match({ url: null })]);
    expect(html).not.toContain('<a href="null"');
  });
});
