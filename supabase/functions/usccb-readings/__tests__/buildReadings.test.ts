import { describe, it, expect } from 'vitest';
import {
  buildReadingsFromDb,
  READINGS_NOT_AVAILABLE,
  SOURCE_URL,
  type SupabaseLike,
} from '../buildReadings';

/**
 * Pins the `usccb-readings` response contract — {date, sourceUrl,
 * liturgicalTitle, readings: [{heading, citation, summary, html}]} — across
 * the swap from scraping universalis.com to serving from our own `prayer_day`
 * + `prayer_reading_text` RPCs (Phase 1, Task 4). Deployed iOS clients parse
 * this shape; it must not change field names or types, even though the data
 * source underneath it did.
 */

function stubSupabase(opts: {
  day?: { events: Array<{ event_key: string; name: string; rank_grade: number | null; readings: Array<{ slot: string; citation: string; schema_label: string }> }> };
  dayError?: { message: string };
  readingText?: (usfm: string, ranges: unknown) => { translation: string; attribution: string | null; verses: Array<{ chapter: number; verse: number; text: string }> };
}): SupabaseLike {
  return {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'prayer_day') {
        if (opts.dayError) return { data: null, error: opts.dayError };
        return { data: opts.day ?? { events: [] }, error: null };
      }
      if (fn === 'prayer_reading_text') {
        const usfm = args.p_usfm as string;
        const ranges = args.p_ranges;
        const result = opts.readingText?.(usfm, ranges) ?? {
          translation: 'WEBCE',
          attribution: 'World English Bible (Catholic Edition). Public domain.',
          verses: [],
        };
        return { data: result, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  };
}

describe('buildReadingsFromDb', () => {
  it('returns the contract shape with resolved verse text', async () => {
    const supabase = stubSupabase({
      day: {
        events: [
          {
            event_key: 'Advent1',
            name: 'First Sunday of Advent',
            rank_grade: 6,
            readings: [
              { slot: 'first_reading', citation: 'Isaiah 2:1-5', schema_label: '' },
              { slot: 'gospel', citation: 'Matthew 24:37-44', schema_label: '' },
            ],
          },
        ],
      },
      readingText: (usfm) => ({
        translation: 'WEBCE',
        attribution: 'World English Bible (Catholic Edition). Public domain.',
        verses:
          usfm === 'ISA'
            ? [{ chapter: 2, verse: 1, text: 'This is the word that Isaiah saw.' }]
            : [{ chapter: 24, verse: 37, text: 'As the days of Noah were...' }],
      }),
    });

    const resp = await buildReadingsFromDb('2025-11-30', supabase);

    expect(resp).toMatchObject({
      date: '2025-11-30',
      sourceUrl: SOURCE_URL,
      liturgicalTitle: 'First Sunday of Advent',
    });
    if ('error' in resp) throw new Error('did not expect an error response');
    expect(resp.readings).toHaveLength(2);
    expect(resp.readings[0]).toMatchObject({
      heading: 'First Reading',
      citation: 'Isaiah 2:1-5',
      summary: null,
    });
    expect(resp.readings[0].html).toContain('This is the word that Isaiah saw.');
    expect(resp.readings[1].heading).toBe('Gospel');
  });

  it('populates the Responsorial Psalm block with verse text, not just a citation', async () => {
    const supabase = stubSupabase({
      day: {
        events: [
          {
            event_key: 'Advent1',
            name: 'First Sunday of Advent',
            rank_grade: 6,
            readings: [
              { slot: 'responsorial_psalm', citation: 'Psalm 122:1-2, 3-4', schema_label: '' },
            ],
          },
        ],
      },
      readingText: () => ({
        translation: 'WEBCE',
        attribution: 'World English Bible (Catholic Edition). Public domain.',
        verses: [
          { chapter: 122, verse: 1, text: 'I was glad when they said to me,' },
          { chapter: 122, verse: 2, text: 'Our feet are standing within your gates.' },
        ],
      }),
    });

    const resp = await buildReadingsFromDb('2025-11-30', supabase);
    if ('error' in resp) throw new Error('did not expect an error response');
    const psalm = resp.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm?.html).toContain('I was glad when they said to me,');
    expect(psalm?.html).not.toBe('');
  });

  it('falls back to a citation-only block when the citation does not parse', async () => {
    const supabase = stubSupabase({
      day: {
        events: [
          {
            event_key: 'SatMemBVM1',
            name: 'Saturday Memorial of the BVM',
            rank_grade: 1,
            readings: [
              {
                slot: 'note',
                citation: 'From the Common of the Blessed Virgin Mary',
                schema_label: '',
              },
            ],
          },
        ],
      },
    });

    const resp = await buildReadingsFromDb('2025-12-06', supabase);
    if ('error' in resp) throw new Error('did not expect an error response');
    expect(resp.readings[0]).toEqual({
      heading: 'Note',
      citation: 'From the Common of the Blessed Virgin Mary',
      summary: null,
      html: '',
    });
  });

  it('reports an unavailable date the same way the old out-of-range case did', async () => {
    const supabase = stubSupabase({ day: { events: [] } });
    const resp = await buildReadingsFromDb('1900-01-01', supabase);
    expect(resp).toEqual({
      date: '1900-01-01',
      sourceUrl: SOURCE_URL,
      liturgicalTitle: null,
      readings: [],
      error: READINGS_NOT_AVAILABLE,
      outOfRange: true,
    });
  });

  it('surfaces an RPC error instead of throwing', async () => {
    const supabase = stubSupabase({ dayError: { message: 'connection reset' } });
    const resp = await buildReadingsFromDb('2026-01-01', supabase);
    expect(resp).toEqual({ error: 'connection reset' });
  });

  it('performs no outbound HTTP fetch', async () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    // @ts-expect-error -- intentionally stubbing to prove no network call happens
    globalThis.fetch = (...args: unknown[]) => {
      called = true;
      return originalFetch(...(args as Parameters<typeof fetch>));
    };
    try {
      const supabase = stubSupabase({ day: { events: [] } });
      await buildReadingsFromDb('2026-01-01', supabase);
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
