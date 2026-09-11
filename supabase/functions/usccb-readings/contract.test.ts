import { describe, it, expect, vi } from 'vitest';
import {
  getReadingsForDate,
  humanizeSlot,
  renderVersesHtml,
  usccbSourceUrl,
  type SupabaseRpcClient,
  type PrayerDayResult,
  type ReadingTextResult,
} from './readings';

// Pins the response contract deployed iOS clients depend on (see
// ReadingsModal.tsx's ReadingsResp): { date, sourceUrl, liturgicalTitle,
// readings: [{ heading, citation, summary, html }] }, plus the existing
// error/outOfRange escape hatch. Written before rewiring index.ts away from
// the universalis.com scrape, per Phase 1 Task 4 Step 1 — this environment
// has no network access to run the *old* implementation against a live page
// first, so the shape is pinned directly against these fixtures instead.

const ADVENT_DAY: PrayerDayResult = {
  date: '2025-11-30',
  rite: 'roman_catholic',
  events: [
    {
      event_key: 'Advent1',
      name: 'First Sunday of Advent',
      rank_grade: 6,
      rank_label: 'Sunday',
      color: ['purple'],
      liturgical_season: 'ADVENT',
      sunday_cycle: 'A',
      psalter_week: 1,
      is_holy_day_of_obligation: false,
      readings: [
        { slot: 'first_reading', citation: 'Isaiah 2:1-5', schema_label: '' },
        { slot: 'responsorial_psalm', citation: 'Psalm 122:1-2, 3-4', schema_label: '' },
        { slot: 'gospel', citation: 'Matthew 24:37-44', schema_label: '' },
      ],
    },
  ],
};

const PSALM_122: ReadingTextResult = {
  translation: 'WEBCE',
  attribution: 'World English Bible (Catholic Edition). Public domain. Source: eBible.org.',
  verses: [
    { chapter: 122, verse: 1, text: "I was glad when they said to me, \"Let's go to Yahweh's house!\"" },
    { chapter: 122, verse: 2, text: 'Our feet are standing within your gates, Jerusalem.' },
    { chapter: 122, verse: 3, text: 'Jerusalem is built as a city that is compact together.' },
    { chapter: 122, verse: 4, text: 'where the tribes go up, even Yahweh\'s tribes.' },
  ],
};

function stubSupabase(overrides: {
  day?: PrayerDayResult;
  dayError?: { message: string };
  textByUsfm?: Record<string, ReadingTextResult>;
}): SupabaseRpcClient {
  return {
    rpc: vi.fn(async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'prayer_day') {
        if (overrides.dayError) return { data: null, error: overrides.dayError };
        return { data: overrides.day ?? ADVENT_DAY, error: null };
      }
      if (fn === 'prayer_reading_text') {
        const usfm = args.p_usfm as string;
        const result = overrides.textByUsfm?.[usfm];
        return {
          data: result ?? { translation: args.p_translation, attribution: null, verses: [] },
          error: null,
        };
      }
      throw new Error(`unexpected rpc: ${fn}`);
    }),
  };
}

describe('getReadingsForDate — response contract', () => {
  it('returns the exact shape deployed clients expect', async () => {
    const supabase = stubSupabase({
      textByUsfm: {
        ISA: { translation: 'WEBCE', attribution: 'WEBCE', verses: [{ chapter: 2, verse: 1, text: 'x' }] },
        PSA: PSALM_122,
        MAT: { translation: 'WEBCE', attribution: 'WEBCE', verses: [{ chapter: 24, verse: 37, text: 'y' }] },
      },
    });

    const resp = await getReadingsForDate(supabase, '2025-11-30');

    expect(resp.date).toBe('2025-11-30');
    expect(typeof resp.sourceUrl).toBe('string');
    expect(resp.liturgicalTitle).toBe('First Sunday of Advent');
    expect(Array.isArray(resp.readings)).toBe(true);
    expect(resp.readings).toHaveLength(3);
    for (const block of resp.readings) {
      expect(block).toEqual(
        expect.objectContaining({
          heading: expect.any(String),
          citation: expect.any(String),
          html: expect.any(String),
        }),
      );
      expect(block.summary).toBeNull();
    }
  });

  it('resolves the Responsorial Psalm to real verse text, not just a citation', async () => {
    // The old Universalis scrape stripped the psalm body — this RPC-backed
    // path is the fix, per the "why this phase, and why first" section of
    // the Phase 1 plan.
    const supabase = stubSupabase({ textByUsfm: { PSA: PSALM_122 } });
    const resp = await getReadingsForDate(supabase, '2025-11-30');
    const psalm = resp.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm?.html).toContain('Jerusalem');
    expect(psalm?.html).toContain('<sup>1</sup>');
  });

  it('HTML-escapes verse text before injecting it', async () => {
    const supabase = stubSupabase({
      textByUsfm: {
        PSA: {
          translation: 'WEBCE',
          attribution: null,
          verses: [{ chapter: 122, verse: 1, text: 'He said <script>alert(1)</script> & "quit"' }],
        },
      },
    });
    const resp = await getReadingsForDate(supabase, '2025-11-30');
    const psalm = resp.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm?.html).not.toContain('<script>');
    expect(psalm?.html).toContain('&lt;script&gt;');
    expect(psalm?.html).toContain('&amp;');
    expect(psalm?.html).toContain('&quot;quit&quot;');
  });

  it('appends the translation attribution after the verse text', async () => {
    const html = renderVersesHtml(
      [{ chapter: 1, verse: 1, text: 'In the beginning.' }],
      'World English Bible (Catholic Edition). Public domain.',
    );
    expect(html).toBe(
      '<p><sup>1</sup> In the beginning.</p><p><em>World English Bible (Catholic Edition). Public domain.</em></p>',
    );
  });

  it('degrades an unresolvable citation to citation-only, never throws', async () => {
    const day: PrayerDayResult = {
      date: '2025-12-06',
      rite: 'roman_catholic',
      events: [
        {
          event_key: 'SatMemBVM1',
          name: 'Saturday Memorial of the BVM',
          rank_grade: 3,
          rank_label: 'Optional Memorial',
          color: ['white'],
          liturgical_season: 'ADVENT',
          sunday_cycle: null,
          psalter_week: 1,
          is_holy_day_of_obligation: false,
          readings: [
            { slot: 'note', citation: 'From the Common of the Blessed Virgin Mary', schema_label: '' },
          ],
        },
      ],
    };
    const supabase = stubSupabase({ day });
    const resp = await getReadingsForDate(supabase, '2025-12-06');
    expect(resp.readings).toEqual([
      { heading: 'Note', citation: 'From the Common of the Blessed Virgin Mary', summary: null, html: '' },
    ]);
  });

  it('reports no calendar data as error + outOfRange, the same escape hatch the scrape used for dates outside its window', async () => {
    const supabase = stubSupabase({ day: { date: '1900-01-01', rite: 'roman_catholic', events: [] } });
    const resp = await getReadingsForDate(supabase, '1900-01-01');
    expect(resp.readings).toEqual([]);
    expect(resp.outOfRange).toBe(true);
    expect(resp.error).toBeTruthy();
  });

  it('propagates an RPC error rather than returning a silently-empty response', async () => {
    const supabase = stubSupabase({ dayError: { message: 'connection refused' } });
    await expect(getReadingsForDate(supabase, '2025-11-30')).rejects.toThrow(/connection refused/);
  });
});

describe('humanizeSlot', () => {
  it('maps the five common Mass slots to headings the Liturgy Planner already parses', () => {
    // mapReadingBlocksToFields() in LiturgyPlannerPage.tsx matches these by
    // regex (case-insensitive); changing these strings would silently break
    // that field-fill without failing any test there, so they are pinned here.
    expect(humanizeSlot('first_reading')).toBe('First Reading');
    expect(humanizeSlot('responsorial_psalm')).toBe('Responsorial Psalm');
    expect(humanizeSlot('second_reading')).toBe('Second Reading');
    expect(humanizeSlot('gospel_acclamation')).toBe('Gospel Acclamation');
    expect(humanizeSlot('gospel')).toBe('Gospel');
  });

  it('title-cases an unmapped slot rather than leaving it raw', () => {
    expect(humanizeSlot('third_reading')).toBe('Third Reading');
  });
});

describe('usccbSourceUrl', () => {
  it('builds the bible.usccb.org daily-readings URL for a date', () => {
    expect(usccbSourceUrl('2026-03-01')).toBe('https://bible.usccb.org/bible/readings/030126.cfm');
  });
});
