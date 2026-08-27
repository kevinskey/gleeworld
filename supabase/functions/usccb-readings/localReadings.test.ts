import { describe, it, expect, vi } from 'vitest';
import { buildLocalReadings, type SupabaseClientLike } from './localReadings';

/**
 * Pins the usccb-readings response shape while the source moved from
 * scraping universalis.com to GleeWorld's own Prayer data (Phase 0/1).
 * Deployed iOS clients call this function and expect this exact contract:
 * { date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary, html }] }.
 * See docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4.
 */

const SUNDAY_DAY = {
  events: [
    {
      event_key: 'Advent1',
      name: 'First Sunday of Advent',
      rank_grade: 6,
      readings: [
        { slot: 'first_reading', citation: 'Isaiah 2:1-5', schema_label: '' },
        { slot: 'responsorial_psalm', citation: 'Psalm 23:1-3', schema_label: '' },
        { slot: 'gospel', citation: 'Matthew 24:37-44', schema_label: '' },
      ],
    },
  ],
};

const READING_TEXT = {
  attribution: 'World English Bible (Catholic Edition). Public domain. Source: eBible.org.',
  verses: [
    { chapter: 23, verse: 1, text: 'The LORD is my shepherd; I shall lack nothing.' },
    { chapter: 23, verse: 2, text: 'He makes me lie down in green pastures.' },
  ],
};

function mockClient(overrides?: Partial<Record<string, unknown>>): SupabaseClientLike {
  return {
    rpc: vi.fn(async (fn: string, _args: Record<string, unknown>) => {
      if (fn in (overrides ?? {})) return overrides![fn] as { data: unknown; error: null };
      if (fn === 'prayer_day') return { data: SUNDAY_DAY, error: null };
      if (fn === 'prayer_reading_text') return { data: READING_TEXT, error: null };
      throw new Error(`unexpected rpc: ${fn}`);
    }),
  };
}

describe('buildLocalReadings', () => {
  it('returns the full contract shape for a day with readings', async () => {
    const result = await buildLocalReadings(mockClient(), '2025-11-30');

    expect(result.liturgicalTitle).toBe('First Sunday of Advent');
    expect(result.readings).toHaveLength(3);
    for (const r of result.readings) {
      expect(r).toHaveProperty('heading');
      expect(r).toHaveProperty('citation');
      expect(r).toHaveProperty('summary');
      expect(r).toHaveProperty('html');
    }
  });

  it('humanizes slot names into readable headings', async () => {
    const result = await buildLocalReadings(mockClient(), '2025-11-30');
    expect(result.readings.map((r) => r.heading)).toEqual([
      'First Reading',
      'Responsorial Psalm',
      'Gospel',
    ]);
  });

  it('renders verse text into escaped HTML with attribution', async () => {
    const result = await buildLocalReadings(mockClient(), '2025-11-30');
    const psalm = result.readings.find((r) => r.heading === 'Responsorial Psalm')!;
    expect(psalm.html).toContain('<sup>1</sup> The LORD is my shepherd');
    expect(psalm.html).toContain('Public domain');
  });

  it('escapes HTML-significant characters in verse text', async () => {
    const client = mockClient({
      prayer_reading_text: {
        data: { attribution: null, verses: [{ chapter: 1, verse: 1, text: 'A & B <tag> "quote"' }] },
        error: null,
      },
    });
    const result = await buildLocalReadings(client, '2025-11-30');
    const html = result.readings[0].html;
    expect(html).toContain('&amp;');
    expect(html).toContain('&lt;tag&gt;');
    expect(html).not.toContain('<tag>');
  });

  // "From the Common of the Blessed Virgin Mary" and similar carry a note,
  // never a resolvable book/verse — the old scraper surfaced these as
  // citation-only entries with no body; this preserves that behaviour.
  it('leaves a "note" citation with an empty body instead of resolving it', async () => {
    const client = mockClient({
      prayer_day: {
        data: {
          events: [
            {
              event_key: 'SatMemBVM1',
              name: 'Saturday Memorial of the BVM',
              rank_grade: 1,
              readings: [
                { slot: 'note', citation: 'From the Common of the Blessed Virgin Mary', schema_label: '' },
              ],
            },
          ],
        },
        error: null,
      },
    });
    const result = await buildLocalReadings(client, '2025-12-06');
    expect(result.readings).toEqual([
      {
        heading: 'Reading',
        citation: 'From the Common of the Blessed Virgin Mary',
        summary: null,
        html: '',
      },
    ]);
  });

  it('returns no events and no title for a date with nothing imported', async () => {
    const client = mockClient({ prayer_day: { data: { events: [] }, error: null } });
    const result = await buildLocalReadings(client, '1900-01-01');
    expect(result).toEqual({ liturgicalTitle: null, readings: [] });
  });

  it('leaves html empty when a citation cannot be parsed to a book', async () => {
    const client = mockClient({
      prayer_day: {
        data: {
          events: [
            {
              event_key: 'X',
              name: 'Test Day',
              rank_grade: 1,
              readings: [{ slot: 'first_reading', citation: 'Not A Real Citation', schema_label: '' }],
            },
          ],
        },
        error: null,
      },
    });
    const result = await buildLocalReadings(client, '2026-01-01');
    expect(result.readings[0].html).toBe('');
    expect(result.readings[0].citation).toBe('Not A Real Citation');
  });

  it('throws when the prayer_day RPC errors', async () => {
    const client = mockClient({ prayer_day: { data: null, error: { message: 'boom' } } });
    await expect(buildLocalReadings(client, '2025-11-30')).rejects.toThrow('prayer_day: boom');
  });

  it('throws when the prayer_reading_text RPC errors', async () => {
    const client = mockClient({ prayer_reading_text: { data: null, error: { message: 'boom' } } });
    await expect(buildLocalReadings(client, '2025-11-30')).rejects.toThrow('prayer_reading_text: boom');
  });
});
