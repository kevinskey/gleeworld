import { describe, it, expect, vi } from 'vitest';
import { buildReadings, type SupabaseRpcClient } from './buildReadings';

// Pins the usccb-readings response contract that ReadingsModal.tsx
// (src/components/liturgy/ReadingsModal.tsx) has always relied on:
//   { date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary, html }] }
// Phase 1's whole point is that this shape survives while the source
// underneath moves from a live scrape of universalis.com to our own
// prayer_day() / prayer_reading_text() RPCs over WEBCE. See the Phase 1 plan,
// Task 4, "Deviation" note in this file's own header for why the test is
// written against the new implementation directly rather than re-run
// unchanged against the old scraper.

function stubSupabase(opts: {
  dayData?: unknown;
  dayError?: { message: string } | null;
  textByUsfm?: Record<string, unknown>;
}): SupabaseRpcClient {
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (fn === 'prayer_day') {
      return { data: opts.dayData ?? null, error: opts.dayError ?? null };
    }
    if (fn === 'prayer_reading_text') {
      const usfm = args.p_usfm as string;
      const data = opts.textByUsfm?.[usfm];
      if (!data) throw new Error(`no stub for prayer_reading_text(${usfm})`);
      return { data, error: null };
    }
    throw new Error(`unexpected rpc: ${fn}`);
  });
  return { rpc } as unknown as SupabaseRpcClient;
}

const SUNDAY_DAY = {
  date: '2025-11-30',
  rite: 'roman_catholic',
  events: [
    {
      event_key: 'Advent1',
      name: 'First Sunday of Advent',
      rank_grade: 6,
      readings: [
        { slot: 'first_reading', citation: 'Isaiah 2:1-5', schema_label: '', source: 'catholic-readings-api' },
        { slot: 'responsorial_psalm', citation: 'Psalm 122:1-2, 3-4', schema_label: '', source: 'catholic-readings-api' },
        { slot: 'gospel', citation: 'Matthew 24:37-44', schema_label: '', source: 'catholic-readings-api' },
      ],
    },
  ],
};

describe('buildReadings (usccb-readings contract)', () => {
  it('returns the exact response shape with all four ReadingBlock keys populated', async () => {
    const supabase = stubSupabase({
      dayData: SUNDAY_DAY,
      textByUsfm: {
        ISA: {
          translation: 'WEBCE',
          attribution: 'World English Bible (Catholic Edition). Public domain.',
          verses: [{ chapter: 2, verse: 1, text: 'This is what Isaiah son of Amoz saw.' }],
        },
        PSA: {
          translation: 'WEBCE',
          attribution: 'World English Bible (Catholic Edition). Public domain.',
          verses: [
            { chapter: 122, verse: 1, text: 'I was glad when they said to me,' },
            { chapter: 122, verse: 3, text: 'Jerusalem is built as a city' },
          ],
        },
        MAT: {
          translation: 'WEBCE',
          attribution: 'World English Bible (Catholic Edition). Public domain.',
          verses: [{ chapter: 24, verse: 37, text: 'As the days of Noah were,' }],
        },
      },
    });

    const resp = await buildReadings('2025-11-30', supabase);

    expect(resp.date).toBe('2025-11-30');
    expect(typeof resp.sourceUrl).toBe('string');
    expect(resp.liturgicalTitle).toBe('First Sunday of Advent');
    expect(resp.readings).toHaveLength(3);
    for (const block of resp.readings) {
      expect(block).toEqual(
        expect.objectContaining({
          heading: expect.any(String),
          citation: expect.any(String),
          html: expect.any(String),
        }),
      );
      expect('summary' in block).toBe(true);
    }
    expect(resp.readings.map((r) => r.heading)).toEqual([
      'First Reading',
      'Responsorial Psalm',
      'Gospel',
    ]);
  });

  it('populates the Responsorial Psalm block with actual verse text, not just a citation', async () => {
    const supabase = stubSupabase({
      dayData: SUNDAY_DAY,
      textByUsfm: {
        ISA: { translation: 'WEBCE', attribution: 'attr', verses: [{ chapter: 2, verse: 1, text: 'x' }] },
        PSA: {
          translation: 'WEBCE',
          attribution: 'attr',
          verses: [{ chapter: 122, verse: 1, text: 'I was glad when they said to me,' }],
        },
        MAT: { translation: 'WEBCE', attribution: 'attr', verses: [{ chapter: 24, verse: 37, text: 'x' }] },
      },
    });

    const resp = await buildReadings('2025-11-30', supabase);
    const psalm = resp.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm?.html).toContain('I was glad when they said to me');
  });

  it('falls back to citation-only, empty html for a note that does not resolve to a book', async () => {
    const supabase = stubSupabase({
      dayData: {
        date: '2025-12-06',
        rite: 'roman_catholic',
        events: [
          {
            event_key: 'SatMemBVM1',
            name: 'Saturday Memorial of the Blessed Virgin Mary',
            rank_grade: 3,
            readings: [
              {
                slot: 'note',
                citation: 'From the Common of the Blessed Virgin Mary',
                schema_label: '',
                source: 'litcal',
              },
            ],
          },
        ],
      },
    });

    const resp = await buildReadings('2025-12-06', supabase);
    expect(resp.readings).toEqual([
      {
        heading: 'Note',
        citation: 'From the Common of the Blessed Virgin Mary',
        summary: null,
        html: '',
      },
    ]);
  });

  it('escapes HTML in verse text', async () => {
    const supabase = stubSupabase({
      dayData: SUNDAY_DAY,
      textByUsfm: {
        ISA: {
          translation: 'WEBCE',
          attribution: 'attr',
          verses: [{ chapter: 2, verse: 1, text: 'Tom & Jerry <script>alert(1)</script>' }],
        },
        PSA: { translation: 'WEBCE', attribution: 'attr', verses: [{ chapter: 122, verse: 1, text: 'x' }] },
        MAT: { translation: 'WEBCE', attribution: 'attr', verses: [{ chapter: 24, verse: 37, text: 'x' }] },
      },
    });

    const resp = await buildReadings('2025-11-30', supabase);
    const first = resp.readings[0];
    expect(first.html).not.toContain('<script>');
    expect(first.html).toContain('Tom &amp; Jerry');
  });

  it('returns an error response, never a throw, when the date has no calendar day', async () => {
    const supabase = stubSupabase({ dayData: { date: '1900-01-01', rite: 'roman_catholic', events: [] } });
    const resp = await buildReadings('1900-01-01', supabase);
    expect('error' in resp).toBe(true);
    expect(resp.readings).toEqual([]);
    expect(resp.liturgicalTitle).toBeNull();
  });

  it('throws if the prayer_day RPC errors, so the caller returns a 5xx rather than a fabricated 200', async () => {
    const supabase = stubSupabase({ dayError: { message: 'connection reset' } });
    await expect(buildReadings('2025-11-30', supabase)).rejects.toThrow('connection reset');
  });
});
