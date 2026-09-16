import { describe, it, expect, vi } from 'vitest';
import {
  buildReadingsResponse,
  APP_SOURCE_URL,
  NO_READINGS_MESSAGE,
  type SupabaseRpcClient,
} from '../buildReadingsResponse';

// The response contract deployed iOS clients rely on. Pinned here first so a
// rewrite of the data source (scrape -> local RPCs) cannot silently change
// what callers receive. See docs/superpowers/plans/2026-08-04-prayer-phase1.md
// Task 4.
function assertContractShape(resp: unknown) {
  const r = resp as Record<string, unknown>;
  expect(typeof r.date).toBe('string');
  expect(typeof r.sourceUrl).toBe('string');
  expect(r.liturgicalTitle === null || typeof r.liturgicalTitle === 'string').toBe(true);
  expect(Array.isArray(r.readings)).toBe(true);
  for (const block of r.readings as Array<Record<string, unknown>>) {
    expect(typeof block.heading).toBe('string');
    expect(block.citation === null || typeof block.citation === 'string').toBe(true);
    expect(block.summary === null || typeof block.summary === 'string').toBe(true);
    expect(typeof block.html).toBe('string');
  }
}

function stubSupabase(opts: {
  dayEvents?: Array<{ name: string; readings: Array<{ slot: string; citation: string; schema_label: string }> }>;
  readingText?: Record<string, { attribution: string | null; verses: Array<{ chapter: number; verse: number; text: string }> }>;
}): { supabase: SupabaseRpcClient; rpc: ReturnType<typeof vi.fn> } {
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (fn === 'prayer_day') {
      return { data: { date: args.p_date, rite: args.p_rite, events: opts.dayEvents ?? [] }, error: null };
    }
    if (fn === 'prayer_reading_text') {
      const key = `${args.p_usfm}`;
      const found = opts.readingText?.[key];
      return { data: found ?? { attribution: null, verses: [] }, error: null };
    }
    throw new Error(`unexpected rpc: ${fn}`);
  });
  return { supabase: { rpc } as unknown as SupabaseRpcClient, rpc };
}

describe('buildReadingsResponse', () => {
  it('matches the pinned response contract on a normal day', async () => {
    const { supabase } = stubSupabase({
      dayEvents: [
        {
          name: 'First Sunday of Advent',
          readings: [
            { slot: 'first_reading', citation: 'Isaiah 2:1-5', schema_label: '' },
            { slot: 'responsorial_psalm', citation: 'Psalm 122:1-2', schema_label: '' },
            { slot: 'gospel', citation: 'Matthew 24:37-44', schema_label: '' },
          ],
        },
      ],
      readingText: {
        ISA: { attribution: 'World English Bible (Catholic Edition). Public domain.', verses: [{ chapter: 2, verse: 1, text: 'This is what Isaiah saw.' }] },
        PSA: { attribution: 'World English Bible (Catholic Edition). Public domain.', verses: [{ chapter: 122, verse: 1, text: 'I was glad.' }, { chapter: 122, verse: 2, text: 'Our feet are standing.' }] },
        MAT: { attribution: 'World English Bible (Catholic Edition). Public domain.', verses: [{ chapter: 24, verse: 37, text: 'As the days of Noah were.' }] },
      },
    });

    const resp = await buildReadingsResponse({ supabase, date: '2025-11-30' });
    assertContractShape(resp);
    expect(resp.date).toBe('2025-11-30');
    expect(resp.liturgicalTitle).toBe('First Sunday of Advent');
    expect(resp.readings).toHaveLength(3);
  });

  it('makes no outbound HTTP request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { supabase } = stubSupabase({
      dayEvents: [{ name: 'Ordinary Weekday', readings: [{ slot: 'gospel', citation: 'Matthew 5:1-12', schema_label: '' }] }],
      readingText: { MAT: { attribution: 'attr', verses: [{ chapter: 5, verse: 1, text: 'Blessed.' }] } },
    });
    await buildReadingsResponse({ supabase, date: '2026-01-05' });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('populates the Responsorial Psalm body with verse text, not just a citation', async () => {
    const { supabase } = stubSupabase({
      dayEvents: [
        {
          name: 'Some Weekday',
          readings: [{ slot: 'responsorial_psalm', citation: 'Psalm 23:1-3', schema_label: '' }],
        },
      ],
      readingText: {
        PSA: {
          attribution: 'World English Bible (Catholic Edition). Public domain.',
          verses: [
            { chapter: 23, verse: 1, text: 'The LORD is my shepherd.' },
            { chapter: 23, verse: 2, text: 'He makes me lie down.' },
          ],
        },
      },
    });
    const resp = await buildReadingsResponse({ supabase, date: '2026-03-01' });
    const psalm = resp.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm?.html).toContain('The LORD is my shepherd.');
    expect(psalm?.html).toContain('He makes me lie down.');
  });

  it('degrades a citation-only entry (unresolvable book) to citation, no crash', async () => {
    const { supabase, rpc } = stubSupabase({
      dayEvents: [
        {
          name: 'Saturday Memorial of the BVM',
          readings: [
            { slot: 'note', citation: 'From the Common of the Blessed Virgin Mary', schema_label: '' },
          ],
        },
      ],
    });
    const resp = await buildReadingsResponse({ supabase, date: '2025-12-06' });
    expect(resp.readings).toEqual([
      { heading: 'Note', citation: 'From the Common of the Blessed Virgin Mary', summary: null, html: '' },
    ]);
    expect(rpc).not.toHaveBeenCalledWith('prayer_reading_text', expect.anything());
  });

  it('returns an empty, non-throwing result with error/outOfRange for a date with no imported calendar row', async () => {
    const { supabase } = stubSupabase({ dayEvents: [] });
    const resp = await buildReadingsResponse({ supabase, date: '1900-01-01' });
    assertContractShape(resp);
    expect(resp.readings).toEqual([]);
    expect(resp.error).toBe(NO_READINGS_MESSAGE);
    expect(resp.outOfRange).toBe(true);
  });

  it('picks only the first schema (e.g. Christmas Mass) when a day nests multiple formularies', async () => {
    const { supabase } = stubSupabase({
      dayEvents: [
        {
          name: 'The Nativity of the Lord',
          readings: [
            { slot: 'first_reading', citation: 'Isaiah 9:1-6', schema_label: 'night' },
            { slot: 'gospel', citation: 'Luke 2:1-14', schema_label: 'night' },
            { slot: 'first_reading', citation: 'Isaiah 62:11-12', schema_label: 'dawn' },
            { slot: 'gospel', citation: 'Luke 2:15-20', schema_label: 'dawn' },
          ],
        },
      ],
      readingText: {
        ISA: { attribution: 'attr', verses: [{ chapter: 9, verse: 1, text: 'The people walking.' }] },
        LUK: { attribution: 'attr', verses: [{ chapter: 2, verse: 1, text: 'In those days.' }] },
      },
    });
    const resp = await buildReadingsResponse({ supabase, date: '2025-12-25' });
    expect(resp.readings).toHaveLength(2);
    expect(resp.readings.every((r) => r.citation === 'Isaiah 9:1-6' || r.citation === 'Luke 2:1-14')).toBe(true);
  });

  it('HTML-escapes verse text', async () => {
    const { supabase } = stubSupabase({
      dayEvents: [{ name: 'Weekday', readings: [{ slot: 'gospel', citation: 'Matthew 5:1', schema_label: '' }] }],
      readingText: { MAT: { attribution: null, verses: [{ chapter: 5, verse: 1, text: 'A "Blessed" <sign> & wonder.' }] } },
    });
    const resp = await buildReadingsResponse({ supabase, date: '2026-02-02' });
    expect(resp.readings[0].html).toContain('&quot;Blessed&quot; &lt;sign&gt; &amp; wonder.');
    expect(resp.readings[0].html).not.toContain('<sign>');
  });

  it('uses our own app URL, never universalis.com', async () => {
    const { supabase } = stubSupabase({ dayEvents: [{ name: 'Weekday', readings: [] }] });
    const resp = await buildReadingsResponse({ supabase, date: '2026-02-02' });
    expect(resp.sourceUrl).toBe(APP_SOURCE_URL);
    expect(resp.sourceUrl).not.toContain('universalis.com');
  });
});
