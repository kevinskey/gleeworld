import { describe, it, expect, vi } from 'vitest';
import { buildReadingsResponse, type SupabaseLike } from './buildReadings';

// Pins the usccb-readings response contract deployed iOS clients rely on:
// { date, sourceUrl, liturgicalTitle, readings: [{ heading, citation, summary,
// html }], error?, outOfRange? } — see ReadingsResp / ReadingBlock in
// src/components/liturgy/ReadingsModal.tsx. The plan's Task 4 Step 1 asks to
// pin this "against the current implementation" with a mocked Supabase
// client, but the pre-rewrite implementation never touched Supabase — it
// only fetched Universalis HTML — so there is nothing to mock there. What
// actually needs pinning, and what this file pins, is the *shape* the field
// declarations in ReadingsModal.tsx already promise, independent of which
// backend produced it.

interface RpcResponse { data: unknown; error: { message: string } | null }

function stubSupabase(handlers: {
  prayer_day?: (args: Record<string, unknown>) => RpcResponse;
  prayer_reading_text?: (args: Record<string, unknown>) => RpcResponse;
}): SupabaseLike {
  return {
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'prayer_day') return handlers.prayer_day?.(args) ?? { data: { events: [] }, error: null };
      if (fn === 'prayer_reading_text') {
        return handlers.prayer_reading_text?.(args) ?? { data: { verses: [], attribution: null }, error: null };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    }),
  } as unknown as SupabaseLike;
}

const PSALM_23_EVENT = {
  name: 'Tuesday of week 22 in Ordinary Time',
  rank_grade: 1,
  readings: [
    { slot: 'responsorial_psalm', citation: 'Psalm 23:1-2', schema_label: '' },
    { slot: 'gospel', citation: 'Luke 4:31-37', schema_label: '' },
  ],
};

describe('buildReadingsResponse — contract shape', () => {
  it('returns exactly the top-level keys the frontend contract declares', async () => {
    const supabase = stubSupabase({
      prayer_day: () => ({ data: { date: '2026-09-22', events: [PSALM_23_EVENT] }, error: null }),
      prayer_reading_text: () => ({
        data: { translation: 'WEBCE', attribution: 'WEBCE. Public domain.', verses: [{ chapter: 23, verse: 1, text: 'The LORD is my shepherd.' }] },
        error: null,
      }),
    });

    const resp = await buildReadingsResponse('2026-09-22', supabase);

    expect(Object.keys(resp).sort()).toEqual(['date', 'liturgicalTitle', 'readings', 'sourceUrl']);
    expect(resp.date).toBe('2026-09-22');
    expect(typeof resp.sourceUrl).toBe('string');
    expect(resp.liturgicalTitle).toBe(PSALM_23_EVENT.name);
    expect(Array.isArray(resp.readings)).toBe(true);
  });

  it('every reading block carries exactly heading, citation, summary, html', async () => {
    const supabase = stubSupabase({
      prayer_day: () => ({ data: { events: [PSALM_23_EVENT] }, error: null }),
      prayer_reading_text: () => ({
        data: { attribution: 'WEBCE. Public domain.', verses: [{ chapter: 23, verse: 1, text: 'The LORD is my shepherd.' }] },
        error: null,
      }),
    });

    const resp = await buildReadingsResponse('2026-09-22', supabase);
    for (const block of resp.readings) {
      expect(Object.keys(block).sort()).toEqual(['citation', 'heading', 'html', 'summary']);
      expect(typeof block.heading).toBe('string');
      expect(typeof block.html).toBe('string');
    }
  });

  // The user-visible win this phase exists for: the old Universalis scrape
  // returned the Responsorial Psalm as citation-only. It must now carry text.
  it('populates the Responsorial Psalm body with verse text, not just a citation', async () => {
    const supabase = stubSupabase({
      prayer_day: () => ({ data: { events: [PSALM_23_EVENT] }, error: null }),
      prayer_reading_text: (args) => ({
        data: {
          attribution: 'World English Bible (Catholic Edition). Public domain.',
          verses:
            args.p_usfm === 'PSA'
              ? [
                  { chapter: 23, verse: 1, text: 'The LORD is my shepherd; I shall lack nothing.' },
                  { chapter: 23, verse: 2, text: 'He makes me lie down in green pastures.' },
                ]
              : [],
        },
        error: null,
      }),
    });

    const resp = await buildReadingsResponse('2026-09-22', supabase);
    const psalm = resp.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm?.html).toContain('The LORD is my shepherd');
    expect(psalm?.html).toContain('<sup>23:1</sup>');
    expect(psalm?.html).toContain('World English Bible (Catholic Edition)');
  });

  it('HTML-escapes verse text', async () => {
    const supabase = stubSupabase({
      prayer_day: () => ({
        data: { events: [{ name: 'Test', readings: [{ slot: 'gospel', citation: 'John 3:16' }] }] },
        error: null,
      }),
      prayer_reading_text: () => ({
        data: { attribution: null, verses: [{ chapter: 3, verse: 16, text: 'Cain said, "Am I my brother\'s <keeper>?" & more' }] },
        error: null,
      }),
    });

    const resp = await buildReadingsResponse('2026-09-22', supabase);
    const html = resp.readings[0].html;
    expect(html).not.toContain('<keeper>');
    expect(html).toContain('&lt;keeper&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  it('degrades to a citation-only block when a citation cannot be resolved to a book', async () => {
    const supabase = stubSupabase({
      prayer_day: () => ({
        data: {
          events: [{
            name: 'Saturday Memorial of the BVM',
            readings: [{ slot: 'note', citation: 'From the Common of the Blessed Virgin Mary' }],
          }],
        },
        error: null,
      }),
    });

    const resp = await buildReadingsResponse('2026-09-22', supabase);
    expect(resp.readings).toEqual([
      { heading: 'Note', citation: 'From the Common of the Blessed Virgin Mary', summary: null, html: '' },
    ]);
  });

  it('reports an out-of-range/not-imported date without throwing, in the same shape', async () => {
    const supabase = stubSupabase({
      prayer_day: () => ({ data: { events: [] }, error: null }),
    });

    const resp = await buildReadingsResponse('1900-01-01', supabase);
    expect(resp.readings).toEqual([]);
    expect(resp.outOfRange).toBe(true);
    expect(typeof resp.error).toBe('string');
    expect(resp.liturgicalTitle).toBeNull();
  });

  it('surfaces a day with a calendar entry but zero readings the same way', async () => {
    const supabase = stubSupabase({
      prayer_day: () => ({ data: { events: [{ name: 'Ash-adjacent gap day', readings: [] }] }, error: null }),
    });

    const resp = await buildReadingsResponse('2026-02-19', supabase);
    expect(resp.readings).toEqual([]);
    expect(resp.outOfRange).toBe(true);
    expect(resp.liturgicalTitle).toBe('Ash-adjacent gap day');
  });

  it('propagates a prayer_day RPC error rather than returning a silently empty day', async () => {
    const supabase = stubSupabase({
      prayer_day: () => ({ data: null, error: { message: 'connection reset' } }),
    });
    await expect(buildReadingsResponse('2026-09-22', supabase)).rejects.toThrow(/connection reset/);
  });
});
