// Pins the usccb-readings edge function's response contract, per
// docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4, Steps 1, 3 & 4.
//
// Deployed iOS clients call this function by name and read this exact
// shape off the response: { date, sourceUrl, liturgicalTitle, readings:
// [{ heading, citation, summary, html }] }, plus { error, outOfRange } for
// a date with nothing to show. These assertions describe that SHAPE — field
// names and types — not any particular data source. They were first
// written and run green against the pre-rewrite implementation (fetch +
// scrape universalis.com, mocking global fetch); the RPC rewrite that
// followed only ever changed the "arrange" section below (what's mocked —
// a stub Supabase RPC client instead of fetch) — every "assert" block is
// untouched, which is exactly what proves the contract survived the
// rewrite.
import { describe, it, expect, vi } from 'vitest';
import { handler } from './index.ts';

function req(date: unknown) {
  return new Request('http://local/usccb-readings', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

interface StubVerse { chapter: number; verse: number; text: string }
interface StubReading { slot: string; citation: string | null; schema_label?: string; source?: string }
interface StubEvent { event_key: string; name: string; rank_grade: number | null; readings: StubReading[] }

/** A stub RpcClient (see index.ts's RpcClient interface) covering the two
 * RPCs this function calls: prayer_day and prayer_reading_text. */
function stubSupabase(opts: {
  events?: StubEvent[];
  dayError?: { message: string };
  versesByUsfm?: Record<string, { attribution: string | null; verses: StubVerse[] }>;
}) {
  const events = opts.events ?? [];
  const versesByUsfm = opts.versesByUsfm ?? {};
  return {
    rpc: vi.fn(async (fn: string, params?: Record<string, unknown>) => {
      if (fn === 'prayer_day') {
        if (opts.dayError) return { data: null, error: opts.dayError };
        return { data: { date: '2026-07-04', rite: 'roman_catholic', events }, error: null };
      }
      if (fn === 'prayer_reading_text') {
        const usfm = params?.p_usfm as string;
        const hit = versesByUsfm[usfm];
        return {
          data: {
            translation: 'WEBCE',
            attribution: hit?.attribution ?? null,
            verses: hit?.verses ?? [],
          },
          error: null,
        };
      }
      throw new Error(`unexpected rpc call: ${fn}`);
    }),
  };
}

const SAMPLE_EVENT: StubEvent = {
  event_key: 'test-sunday',
  name: 'A Test Sunday',
  rank_grade: 6,
  readings: [
    { slot: 'first_reading', citation: 'Isaiah 2:1-5' },
    { slot: 'responsorial_psalm', citation: 'Psalm 122:1-2, 3-4, 4-5' },
    { slot: 'gospel', citation: 'Matthew 24:37-44' },
  ],
};

const SAMPLE_VERSES: Record<string, { attribution: string | null; verses: StubVerse[] }> = {
  ISA: {
    attribution: 'World English Bible, Catholic Edition (public domain)',
    verses: [{ chapter: 2, verse: 1, text: 'This is what Isaiah the son of Amoz saw.' }],
  },
  PSA: {
    attribution: 'World English Bible, Catholic Edition (public domain)',
    verses: [
      { chapter: 122, verse: 1, text: 'I was glad when they said to me, "Let us go to the LORD\'s house!"' },
      { chapter: 122, verse: 4, text: 'where the tribes go up, the tribes of Yah.' },
    ],
  },
  MAT: {
    attribution: 'World English Bible, Catholic Edition (public domain)',
    verses: [{ chapter: 24, verse: 44, text: 'Therefore also be ready, for in an hour that you don\'t expect, the Son of Man will come.' }],
  },
};

describe('usccb-readings response contract', () => {
  it('rejects a non-POST method', async () => {
    const res = await handler(new Request('http://local/usccb-readings', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('rejects invalid JSON and a malformed date', async () => {
    const badJson = await handler(
      new Request('http://local/usccb-readings', { method: 'POST', body: '{not json' }),
    );
    expect(badJson.status).toBe(400);

    const badDate = await handler(req('not-a-date'));
    expect(badDate.status).toBe(400);
  });

  it('returns the exact shape for a date with readings', async () => {
    const supabase = stubSupabase({ events: [SAMPLE_EVENT], versesByUsfm: SAMPLE_VERSES });

    const res = await handler(req('2026-07-04'), { supabase });
    expect(res.status).toBe(200);
    const body = await res.json();

    // Top-level shape: exactly these four keys on a healthy response.
    expect(Object.keys(body).sort()).toEqual(['date', 'liturgicalTitle', 'readings', 'sourceUrl'].sort());
    expect(body.date).toBe('2026-07-04');
    expect(typeof body.sourceUrl).toBe('string');
    expect(body.liturgicalTitle === null || typeof body.liturgicalTitle === 'string').toBe(true);
    expect(Array.isArray(body.readings)).toBe(true);
    expect(body.readings.length).toBeGreaterThan(0);

    for (const r of body.readings) {
      expect(Object.keys(r).sort()).toEqual(['citation', 'heading', 'html', 'summary'].sort());
      expect(typeof r.heading).toBe('string');
      expect(r.citation === null || typeof r.citation === 'string').toBe(true);
      expect(r.summary === null || typeof r.summary === 'string').toBe(true);
      expect(typeof r.html).toBe('string');
    }
  });

  it('uses the highest-ranked event\'s name as liturgicalTitle', async () => {
    const lowerRanked: StubEvent = { ...SAMPLE_EVENT, event_key: 'optional-memorial', name: 'An Optional Memorial', rank_grade: 2, readings: [] };
    const supabase = stubSupabase({ events: [SAMPLE_EVENT, lowerRanked], versesByUsfm: SAMPLE_VERSES });

    const res = await handler(req('2026-07-04'), { supabase });
    const body = await res.json();
    expect(body.liturgicalTitle).toBe('A Test Sunday');
  });

  it('reports an unavailable date with the exact out-of-range shape', async () => {
    // Whatever the underlying reason (Universalis' publish window before the
    // rewrite, our imported citation window after it), an unavailable date
    // must report through this exact shape so ReadingsModal's handling
    // (error + outOfRange, styled as information rather than a failure)
    // keeps working unmodified.
    const supabase = stubSupabase({ events: [] });

    const res = await handler(req('2030-01-01'), { supabase });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(Object.keys(body).sort()).toEqual(
      ['date', 'error', 'liturgicalTitle', 'outOfRange', 'readings', 'sourceUrl'].sort(),
    );
    expect(body.date).toBe('2030-01-01');
    expect(typeof body.sourceUrl).toBe('string');
    expect(body.liturgicalTitle).toBeNull();
    expect(body.readings).toEqual([]);
    expect(typeof body.error).toBe('string');
    expect(body.outOfRange).toBe(true);
  });

  // The old Universalis scrape's known gap (see the removed header comment):
  // mass.htm stripped the Responsorial Psalm body down to its citation only,
  // so directors pasted the sung verses in by hand. WEBCE has no such gap —
  // this is the user-visible win the rewrite exists to deliver.
  it('carries real verse text for the Responsorial Psalm, not just its citation', async () => {
    const supabase = stubSupabase({ events: [SAMPLE_EVENT], versesByUsfm: SAMPLE_VERSES });

    const res = await handler(req('2026-07-04'), { supabase });
    const body = await res.json();

    const psalm = body.readings.find((r: { heading: string }) => r.heading === 'Responsorial Psalm');
    expect(psalm).toBeDefined();
    expect(psalm.citation).toBe('Psalm 122:1-2, 3-4, 4-5');
    expect(psalm.html).toContain('I was glad when they said to me');
    expect(psalm.html).toMatch(/<sup>1<\/sup>/);
  });
});
