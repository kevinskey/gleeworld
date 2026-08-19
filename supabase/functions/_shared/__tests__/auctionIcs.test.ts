import { describe, expect, it } from 'vitest';
import { buildAuctionCalendar, escapeIcsText, foldIcsLine, toIcsUtc } from '../auctionIcs.ts';

describe('foldIcsLine', () => {
  it('leaves a short line alone', () => {
    expect(foldIcsLine('SUMMARY:Short')).toBe('SUMMARY:Short');
  });

  it('folds past 75 octets with a leading space on continuation lines', () => {
    const line = 'SUMMARY:' + 'x'.repeat(120);
    const folded = foldIcsLine(line).split('\r\n');
    expect(folded[0]).toHaveLength(75);
    expect(folded.length).toBeGreaterThan(1);
    expect(folded[1].startsWith(' ')).toBe(true);
    // Unfolding per RFC 5545: drop each CRLF and the single space after it.
    expect(folded.join('\r\n').replace(/\r\n /g, '')).toBe(line);
  });
});

describe('escapeIcsText', () => {
  it('escapes backslash, semicolon, comma, and newline', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });

  it('renders null and undefined as empty', () => {
    expect(escapeIcsText(null)).toBe('');
    expect(escapeIcsText(undefined)).toBe('');
  });
});

describe('toIcsUtc', () => {
  it('formats an ISO timestamp as a UTC iCal datetime', () => {
    expect(toIcsUtc('2026-09-14T18:30:00Z')).toBe('20260914T183000Z');
  });

  it('returns empty for missing or unparseable input', () => {
    expect(toIcsUtc(null)).toBe('');
    expect(toIcsUtc('not a date')).toBe('');
  });
});

const auction = {
  id: 'aa11',
  title: 'Imaging & lab equipment',
  location_city: 'Atlanta',
  location_state: 'GA',
  opens_at: '2026-09-14T14:00:00Z',
  closes_at: '2026-09-16T20:00:00Z',
  catalog_url: 'https://example.test/catalog/1',
  catalog_released_at: '2026-09-11T14:00:00Z',
  status: 'announced',
  updated_at: '2026-08-01T00:00:00Z',
  source_name: 'Heritage Global Partners',
};

const NOW = '2026-08-18T12:00:00Z';

describe('buildAuctionCalendar', () => {
  it('wraps events in a VCALENDAR with the required headers', () => {
    const ics = buildAuctionCalendar([auction], { name: 'All auction houses', now: NOW });
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//GleeWorld//Auctions//EN');
    expect(ics).toContain('X-WR-CALNAME:All auction houses');
  });

  it('emits one event for the sale itself, with location and source', () => {
    const ics = buildAuctionCalendar([auction], { name: 'Feed', now: NOW });
    expect(ics).toContain('UID:auction-aa11@gleeworld.org');
    expect(ics).toContain('DTSTART:20260914T140000Z');
    expect(ics).toContain('DTEND:20260916T200000Z');
    expect(ics).toContain('SUMMARY:Imaging & lab equipment (Heritage Global Partners)');
    expect(ics).toContain('LOCATION:Atlanta\\, GA');
    expect(ics).toContain('URL:https://example.test/catalog/1');
  });

  it('emits a separate all-day event for the catalog release', () => {
    const ics = buildAuctionCalendar([auction], { name: 'Feed', now: NOW });
    expect(ics).toContain('UID:auction-catalog-aa11@gleeworld.org');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260911');
    expect(ics).toContain('SUMMARY:Catalog expected: Imaging & lab equipment');
  });

  it('says posted, not expected, once the catalog release date has passed', () => {
    const ics = buildAuctionCalendar(
      [{ ...auction, catalog_released_at: '2026-08-05T14:00:00Z' }],
      { name: 'Feed', now: NOW },
    );
    expect(ics).toContain('SUMMARY:Catalog posted: Imaging & lab equipment');
    expect(ics).not.toContain('Catalog expected');
  });

  it('omits the catalog event when no release date is known', () => {
    const ics = buildAuctionCalendar(
      [{ ...auction, catalog_released_at: null }],
      { name: 'Feed', now: NOW },
    );
    expect(ics).not.toContain('auction-catalog-aa11');
  });

  it('skips auctions with no dates at all — nothing to put on a calendar', () => {
    const ics = buildAuctionCalendar(
      [{ ...auction, opens_at: null, closes_at: null, catalog_released_at: null }],
      { name: 'Feed', now: NOW },
    );
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('falls back to a one-hour block when only a close date exists', () => {
    const ics = buildAuctionCalendar(
      [{ ...auction, opens_at: null, catalog_released_at: null }],
      { name: 'Feed', now: NOW },
    );
    expect(ics).toContain('DTSTART:20260916T200000Z');
    expect(ics).toContain('DTEND:20260916T210000Z');
  });

  it('marks a cancelled auction CANCELLED rather than dropping it', () => {
    const ics = buildAuctionCalendar([{ ...auction, status: 'cancelled' }], { name: 'Feed', now: NOW });
    expect(ics).toContain('STATUS:CANCELLED');
  });

  it('separates every line with CRLF as RFC 5545 requires', () => {
    const ics = buildAuctionCalendar([auction], { name: 'Feed', now: NOW });
    expect(ics.split('\n').every((l) => l === '' || l.endsWith('\r'))).toBe(true);
  });
});
