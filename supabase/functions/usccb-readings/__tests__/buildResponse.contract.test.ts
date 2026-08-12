import { describe, it, expect } from 'vitest';
import { buildReadingsResponse, type SupabaseRpcClient } from '../buildResponse';

// Pins the usccb-readings response contract that deployed clients rely on:
// { date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary, html }] }
// See docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4, Step 1.
//
// The old implementation scraped universalis.com and had no Supabase seam to
// pin against directly, so this test validates the new RPC-backed
// implementation against the documented contract rather than literally
// diffing old-vs-new output.

const PSALM_23_DAY = {
  events: [
    {
      name: 'Fourth Sunday of Easter',
      readings: [
        { slot: 'first_reading', citation: 'Acts 4:8-12', schema_label: '' },
        { slot: 'responsorial_psalm', citation: 'Psalm 23:1-3a, 3b-4, 5, 6', schema_label: '' },
        { slot: 'gospel', citation: 'John 10:11-18', schema_label: '' },
      ],
    },
  ],
};

function stubSupabase(opts: {
  prayerDay?: unknown;
  prayerDayError?: { message: string };
  readingText?: (usfm: string, ranges: unknown) => unknown;
}): SupabaseRpcClient {
  return {
    rpc: async (fn, args) => {
      if (fn === 'prayer_day') {
        if (opts.prayerDayError) return { data: null, error: opts.prayerDayError };
        return { data: opts.prayerDay ?? { events: [] }, error: null };
      }
      if (fn === 'prayer_reading_text') {
        const result = opts.readingText?.(args.p_usfm as string, args.p_ranges) ?? {
          attribution: 'World English Bible (Catholic Edition). Public domain.',
          verses: [],
        };
        return { data: result, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  };
}

describe('buildReadingsResponse — contract shape', () => {
  it('returns the four top-level keys with the right types', async () => {
    const supabase = stubSupabase({ prayerDay: PSALM_23_DAY });
    const resp = await buildReadingsResponse('2026-04-26', supabase);

    expect(Object.keys(resp).sort()).toEqual(['date', 'liturgicalTitle', 'readings', 'sourceUrl'].sort());
    expect(typeof resp.date).toBe('string');
    expect(typeof resp.sourceUrl).toBe('string');
    expect(resp.liturgicalTitle === null || typeof resp.liturgicalTitle === 'string').toBe(true);
    expect(Array.isArray(resp.readings)).toBe(true);
  });

  it('every reading block carries all four ReadingBlock keys', async () => {
    const supabase = stubSupabase({ prayerDay: PSALM_23_DAY });
    const resp = await buildReadingsResponse('2026-04-26', supabase);

    expect(resp.readings).toHaveLength(3);
    for (const block of resp.readings) {
      expect(Object.keys(block).sort()).toEqual(['citation', 'heading', 'html', 'summary'].sort());
      expect(typeof block.heading).toBe('string');
      expect(typeof block.html).toBe('string');
    }
  });

  it('sources the sourceUrl from our own app, not universalis.com', async () => {
    const supabase = stubSupabase({ prayerDay: PSALM_23_DAY });
    const resp = await buildReadingsResponse('2026-04-26', supabase);
    expect(resp.sourceUrl).not.toMatch(/universalis/i);
  });

  it('never performs an outbound fetch — data comes only from supabase.rpc', async () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
      called = true;
      return originalFetch(...args);
    }) as typeof fetch;
    try {
      const supabase = stubSupabase({ prayerDay: PSALM_23_DAY });
      await buildReadingsResponse('2026-04-26', supabase);
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('buildReadingsResponse — the Responsorial Psalm carries verse text', () => {
  it('populates html with actual verses, not just the citation (the user-visible win)', async () => {
    const supabase = stubSupabase({
      prayerDay: PSALM_23_DAY,
      readingText: (usfm) => {
        if (usfm !== 'PSA') return { attribution: 'WEBCE', verses: [] };
        return {
          attribution: 'World English Bible (Catholic Edition). Public domain.',
          verses: [
            { chapter: 23, verse: 1, text: 'The LORD is my shepherd; I shall lack nothing.' },
            { chapter: 23, verse: 3, text: 'He restores my soul.' },
            { chapter: 23, verse: 4, text: 'I will dwell in the house of the LORD forever.' },
          ],
        };
      },
    });
    const resp = await buildReadingsResponse('2026-04-26', supabase);
    const psalm = resp.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm?.html).toContain('The LORD is my shepherd');
    expect(psalm?.html).toContain('<sup>1</sup>');
    expect(psalm?.html).toContain('World English Bible');
  });
});

describe('buildReadingsResponse — degradation', () => {
  it('returns an empty readings array and null title for a date with no calendar data', async () => {
    const supabase = stubSupabase({ prayerDay: { events: [] } });
    const resp = await buildReadingsResponse('1900-01-01', supabase);
    expect(resp.liturgicalTitle).toBeNull();
    expect(resp.readings).toEqual([]);
  });

  it('keeps a citation-only block (empty html) for an unresolvable citation, e.g. a Common', async () => {
    const supabase = stubSupabase({
      prayerDay: {
        events: [{
          name: 'Saturday Memorial of the BVM',
          readings: [{ slot: 'note', citation: 'From the Common of the Blessed Virgin Mary', schema_label: '' }],
        }],
      },
    });
    const resp = await buildReadingsResponse('2026-08-01', supabase);
    expect(resp.readings).toEqual([
      { heading: 'Reading', citation: 'From the Common of the Blessed Virgin Mary', summary: null, html: '' },
    ]);
  });

  it('throws when the prayer_day RPC errors, rather than returning a silently empty response', async () => {
    const supabase = stubSupabase({ prayerDayError: { message: 'connection refused' } });
    await expect(buildReadingsResponse('2026-04-26', supabase)).rejects.toThrow(/prayer_day/);
  });
});
