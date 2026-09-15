import { describe, it, expect } from 'vitest';
import { buildReadingsResponse, NO_CALENDAR_DATA, type SupabaseRpcClient } from './runReadings';

/**
 * Pins the usccb-readings response contract that deployed clients (iOS
 * builds included — see supabase/functions/usccb-readings/index.ts's header
 * comment) depend on:
 *
 *   { date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary, html }] }
 *
 * Phase 1 (docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4)
 * replaced a runtime scrape of universalis.com with local RPC calls. This
 * test proves the swap didn't change what callers see.
 */

const DAY_WITH_READINGS = {
  date: '2026-08-04',
  rite: 'roman_catholic',
  events: [
    {
      event_key: 'MemStJohnMaryVianney',
      name: 'Saint John Mary Vianney, Priest',
      rank_grade: 3,
      rank_label: 'Memorial',
      color: ['white'],
      liturgical_season: 'ORDINARY_TIME',
      sunday_cycle: null,
      psalter_week: 2,
      is_holy_day_of_obligation: false,
      readings: [
        { slot: 'first_reading', citation: 'Jeremiah 30:1-2, 12-15, 18-22', schema_label: '' },
        { slot: 'responsorial_psalm', citation: 'Psalm 102:16-18, 19-21, 29, 22-23', schema_label: '' },
        { slot: 'gospel', citation: 'Matthew 14:22-36', schema_label: '' },
      ],
    },
  ],
};

function stubSupabase(opts: {
  day?: typeof DAY_WITH_READINGS | { date: string; rite: string; events: [] };
  versesByUsfm?: Record<string, { chapter: number; verse: number; text: string }[]>;
  attribution?: string | null;
}): SupabaseRpcClient {
  const day = opts.day ?? DAY_WITH_READINGS;
  const versesByUsfm = opts.versesByUsfm ?? {};
  const attribution = opts.attribution ?? 'World English Bible (Catholic Edition). Public domain.';
  return {
    async rpc(fn, args) {
      if (fn === 'prayer_day') {
        return { data: day, error: null };
      }
      if (fn === 'prayer_reading_text') {
        const usfm = args.p_usfm as string;
        const verses = versesByUsfm[usfm] ?? [];
        return {
          data: { translation: 'WEBCE', attribution: verses.length ? attribution : null, verses },
          error: null,
        };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    },
  };
}

function assertContractShape(body: unknown): asserts body is {
  date: string; sourceUrl: string; liturgicalTitle: string | null;
  readings: { heading: string; citation: string | null; summary: string | null; html: string }[];
} {
  expect(body).toMatchObject({
    date: expect.any(String),
    sourceUrl: expect.any(String),
    readings: expect.any(Array),
  });
  const b = body as Record<string, unknown>;
  expect(typeof b.liturgicalTitle === 'string' || b.liturgicalTitle === null).toBe(true);
  for (const r of b.readings as unknown[]) {
    expect(r).toMatchObject({
      heading: expect.any(String),
      html: expect.any(String),
    });
    const block = r as Record<string, unknown>;
    expect(typeof block.citation === 'string' || block.citation === null).toBe(true);
    expect(typeof block.summary === 'string' || block.summary === null).toBe(true);
  }
}

describe('usccb-readings response contract', () => {
  it('matches the shape deployed clients depend on', async () => {
    const supabase = stubSupabase({
      versesByUsfm: {
        JER: [{ chapter: 30, verse: 1, text: 'This is the word.' }],
        PSA: [
          { chapter: 102, verse: 16, text: 'The LORD will rebuild Zion.' },
          { chapter: 102, verse: 17, text: 'He responds to the destitute.' },
        ],
        MAT: [{ chapter: 14, verse: 22, text: 'He made the disciples get into the boat.' }],
      },
    });
    const body = await buildReadingsResponse('2026-08-04', supabase);
    assertContractShape(body);
    expect(body.date).toBe('2026-08-04');
    expect(body.liturgicalTitle).toBe('Saint John Mary Vianney, Priest');
    expect(body.readings).toHaveLength(3);
  });

  it('populates the Responsorial Psalm body with real verse text', async () => {
    // The point of Phase 1: Universalis stripped this to a citation only.
    const supabase = stubSupabase({
      versesByUsfm: {
        PSA: [
          { chapter: 102, verse: 16, text: 'The LORD will rebuild Zion.' },
          { chapter: 102, verse: 17, text: 'He will appear in his glory.' },
        ],
      },
    });
    const body = await buildReadingsResponse('2026-08-04', supabase);
    const psalm = body.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm).toBeDefined();
    expect(psalm!.html).toContain('The LORD will rebuild Zion.');
    expect(psalm!.html).toContain('<sup>16</sup>');
  });

  it('HTML-escapes verse text', async () => {
    const supabase = stubSupabase({
      versesByUsfm: { MAT: [{ chapter: 14, verse: 22, text: 'A & <B> "quote"' }] },
    });
    const body = await buildReadingsResponse('2026-08-04', supabase);
    const gospel = body.readings.find((r) => r.heading === 'Gospel')!;
    expect(gospel.html).toContain('A &amp; &lt;B&gt; &quot;quote&quot;');
    expect(gospel.html).not.toContain('<B>');
  });

  it('never fabricates a summary line', async () => {
    const supabase = stubSupabase({ versesByUsfm: { JER: [{ chapter: 30, verse: 1, text: 'x' }] } });
    const body = await buildReadingsResponse('2026-08-04', supabase);
    for (const r of body.readings) expect(r.summary).toBeNull();
  });

  it('reports no-calendar-data dates as an error with outOfRange, never throws', async () => {
    const supabase = stubSupabase({ day: { date: '1900-01-01', rite: 'roman_catholic', events: [] } });
    const body = await buildReadingsResponse('1900-01-01', supabase);
    expect(body.readings).toEqual([]);
    expect(body.error).toBe(NO_CALENDAR_DATA);
    expect(body.outOfRange).toBe(true);
  });

  it('performs no outbound HTTP fetch — only supabase.rpc calls', async () => {
    const calls: string[] = [];
    const supabase: SupabaseRpcClient = {
      async rpc(fn, args) {
        calls.push(fn);
        if (fn === 'prayer_day') return { data: DAY_WITH_READINGS, error: null };
        return { data: { translation: 'WEBCE', attribution: null, verses: [] }, error: null };
      },
    };
    await buildReadingsResponse('2026-08-04', supabase);
    expect(calls[0]).toBe('prayer_day');
    expect(calls.slice(1).every((c) => c === 'prayer_reading_text')).toBe(true);
  });

  it('resolves a cross-chapter citation (em-dash) across the boundary', async () => {
    const day = {
      date: '2026-04-11',
      rite: 'roman_catholic',
      events: [{
        event_key: 'Test',
        name: 'Test Day',
        rank_grade: 1,
        rank_label: null,
        color: [],
        liturgical_season: null,
        sunday_cycle: null,
        psalter_week: null,
        is_holy_day_of_obligation: false,
        readings: [{ slot: 'first_reading', citation: 'Acts 7:59—8:1a', schema_label: '' }],
      }],
    };
    let capturedRanges: unknown;
    const supabase: SupabaseRpcClient = {
      async rpc(fn, args) {
        if (fn === 'prayer_day') return { data: day, error: null };
        capturedRanges = args.p_ranges;
        return {
          data: {
            translation: 'WEBCE', attribution: 'attr',
            verses: [
              { chapter: 7, verse: 59, text: 'a' },
              { chapter: 7, verse: 60, text: 'b' },
              { chapter: 8, verse: 1, text: 'c' },
            ],
          },
          error: null,
        };
      },
    };
    const body = await buildReadingsResponse('2026-04-11', supabase);
    expect(capturedRanges).toEqual([
      { startChapter: 7, startVerse: 59, endChapter: 8, endVerse: 1 },
    ]);
    expect(body.readings[0].html).toContain('<sup>59</sup>');
    expect(body.readings[0].html).toContain('<sup>1</sup>');
  });

  it('surfaces a note-slot citation (e.g. "From the Common of...") without attempting text lookup', async () => {
    const day = {
      date: '2026-12-06',
      rite: 'roman_catholic',
      events: [{
        event_key: 'SatMemBVM1',
        name: 'Saturday Memorial of the BVM',
        rank_grade: 1,
        rank_label: null,
        color: [],
        liturgical_season: null,
        sunday_cycle: null,
        psalter_week: null,
        is_holy_day_of_obligation: false,
        readings: [{ slot: 'note', citation: 'From the Common of the Blessed Virgin Mary', schema_label: '' }],
      }],
    };
    let rpcCalls = 0;
    const supabase: SupabaseRpcClient = {
      async rpc(fn) {
        rpcCalls += 1;
        if (fn === 'prayer_day') return { data: day, error: null };
        throw new Error('prayer_reading_text should not be called for a note slot');
      },
    };
    const body = await buildReadingsResponse('2026-12-06', supabase);
    expect(body.readings).toEqual([{
      heading: 'Reading',
      citation: 'From the Common of the Blessed Virgin Mary',
      summary: null,
      html: '',
    }]);
    expect(rpcCalls).toBe(1);
  });

  it('propagates an RPC error rather than returning a partial/misleading response', async () => {
    const supabase: SupabaseRpcClient = {
      async rpc(fn) {
        if (fn === 'prayer_day') return { data: null, error: { message: 'db unreachable' } };
        return { data: null, error: null };
      },
    };
    await expect(buildReadingsResponse('2026-08-04', supabase)).rejects.toThrow('db unreachable');
  });
});
