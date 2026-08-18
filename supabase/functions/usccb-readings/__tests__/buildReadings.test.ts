import { describe, it, expect, vi } from 'vitest';
import { buildReadings, type RpcClient } from '../buildReadings';

/**
 * Pins the `usccb-readings` response contract that deployed iOS clients
 * depend on: `{ date, sourceUrl, liturgicalTitle, readings: [{ heading,
 * citation, summary, html }] }` (see src/components/liturgy/ReadingsModal.tsx
 * `ReadingsResp`/`ReadingBlock`). The implementation behind it changed from
 * scraping universalis.com to querying `prayer_day()` + `prayer_reading_text()`
 * (Phase 0/1 local data); this test proves the shape didn't move.
 */

function mockClient(overrides: {
  day?: unknown;
  dayError?: { message: string };
  readingText?: (usfm: string) => unknown;
}): RpcClient {
  return {
    rpc: vi.fn((fn: string, args: Record<string, unknown>) => {
      if (fn === 'prayer_day') {
        return Promise.resolve({ data: overrides.day ?? null, error: overrides.dayError ?? null });
      }
      if (fn === 'prayer_reading_text') {
        const data = overrides.readingText?.(args.p_usfm as string) ?? null;
        return Promise.resolve({ data, error: null });
      }
      throw new Error(`unexpected rpc: ${fn}`);
    }),
  } as unknown as RpcClient;
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
        { slot: 'first_reading', citation: 'Isaiah 2:1-5', schema_label: '' },
        { slot: 'responsorial_psalm', citation: 'Psalm 122:1-2, 3-4', schema_label: '' },
        { slot: 'gospel', citation: 'Matthew 24:37-44', schema_label: '' },
      ],
    },
  ],
};

function readingTextFor(usfm: string) {
  if (usfm === 'PSA') {
    return {
      translation: 'WEBCE',
      attribution: 'World English Bible (Catholic Edition). Public domain.',
      verses: [
        { chapter: 122, verse: 1, text: 'I was glad when they said to me,' },
        { chapter: 122, verse: 2, text: 'Our feet are standing within your gates.' },
        { chapter: 122, verse: 3, text: 'Jerusalem is built as a city.' },
        { chapter: 122, verse: 4, text: 'Where the tribes go up.' },
      ],
    };
  }
  return {
    translation: 'WEBCE',
    attribution: 'World English Bible (Catholic Edition). Public domain.',
    verses: [{ chapter: 1, verse: 1, text: `${usfm} verse text.` }],
  };
}

describe('buildReadings', () => {
  it('returns the pinned response shape for a normal day', async () => {
    const client = mockClient({ day: SUNDAY_DAY, readingText: readingTextFor });
    const resp = await buildReadings(client, '2025-11-30');

    expect(resp.date).toBe('2025-11-30');
    expect(typeof resp.sourceUrl).toBe('string');
    expect(resp.liturgicalTitle).toBe('First Sunday of Advent');
    expect(Array.isArray(resp.readings)).toBe(true);
    for (const r of resp.readings) {
      expect(r).toEqual(
        expect.objectContaining({
          heading: expect.any(String),
          html: expect.any(String),
        }),
      );
      expect(['string', 'object']).toContain(typeof r.citation); // string | null
      expect(['string', 'object']).toContain(typeof r.summary); // string | null
    }
  });

  it('humanises slot names into headings', async () => {
    const client = mockClient({ day: SUNDAY_DAY, readingText: readingTextFor });
    const resp = await buildReadings(client, '2025-11-30');
    expect(resp.readings.map((r) => r.heading)).toEqual([
      'First Reading',
      'Responsorial Psalm',
      'Gospel',
    ]);
  });

  // The old Universalis scrape stripped the Responsorial Psalm body down to
  // a citation-only entry; the whole point of Phase 1 is that it no longer
  // does. This is the user-visible win.
  it('populates the Responsorial Psalm body with verse text, not just a citation', async () => {
    const client = mockClient({ day: SUNDAY_DAY, readingText: readingTextFor });
    const resp = await buildReadings(client, '2025-11-30');
    const psalm = resp.readings.find((r) => r.heading === 'Responsorial Psalm');
    expect(psalm?.html).toContain('I was glad when they said to me');
    expect(psalm?.html).toContain('Our feet are standing');
  });

  it('includes a translation attribution line', async () => {
    const client = mockClient({ day: SUNDAY_DAY, readingText: readingTextFor });
    const resp = await buildReadings(client, '2025-11-30');
    expect(resp.readings[0].html).toContain('World English Bible');
  });

  it('degrades a LitCal string-valued "note" slot without erroring', async () => {
    const day = {
      date: '2025-12-06',
      rite: 'roman_catholic',
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
    };
    const client = mockClient({ day, readingText: readingTextFor });
    const resp = await buildReadings(client, '2025-12-06');
    expect(resp.readings).toEqual([
      { heading: 'Note', citation: null, summary: null, html: '<p>From the Common of the Blessed Virgin Mary</p>' },
    ]);
  });

  it('reports a date with no imported calendar data as out of range, not an error', async () => {
    const client = mockClient({ day: { date: '1900-01-01', rite: 'roman_catholic', events: [] } });
    const resp = await buildReadings(client, '1900-01-01');
    expect(resp.readings).toEqual([]);
    expect(resp.outOfRange).toBe(true);
    expect(resp.error).toBeTruthy();
    expect(resp.liturgicalTitle).toBeNull();
  });

  it('surfaces an RPC error without throwing', async () => {
    const client = mockClient({ dayError: { message: 'connection refused' } });
    const resp = await buildReadings(client, '2025-11-30');
    expect(resp.error).toBe('connection refused');
    expect(resp.readings).toEqual([]);
  });

  it('degrades an unresolvable citation to citation-only rather than dropping the reading', async () => {
    const day = {
      date: '2025-11-30',
      rite: 'roman_catholic',
      events: [
        {
          event_key: 'X',
          name: 'Test Day',
          rank_grade: 1,
          readings: [
            { slot: 'first_reading', citation: 'Not A Real Book 1:1', schema_label: '' },
          ],
        },
      ],
    };
    const client = mockClient({ day, readingText: readingTextFor });
    const resp = await buildReadings(client, '2025-11-30');
    expect(resp.readings).toEqual([
      { heading: 'First Reading', citation: 'Not A Real Book 1:1', summary: null, html: '' },
    ]);
  });

  it('HTML-escapes verse text', async () => {
    const day = {
      date: '2025-11-30',
      rite: 'roman_catholic',
      events: [
        {
          event_key: 'X',
          name: 'Test Day',
          rank_grade: 1,
          readings: [{ slot: 'gospel', citation: 'John 3:16', schema_label: '' }],
        },
      ],
    };
    const client = mockClient({
      day,
      readingText: () => ({
        translation: 'WEBCE',
        attribution: null,
        verses: [{ chapter: 3, verse: 16, text: 'God so loved <the world> & "all in it"' }],
      }),
    });
    const resp = await buildReadings(client, '2025-11-30');
    expect(resp.readings[0].html).toContain('&lt;the world&gt; &amp; &quot;all in it&quot;');
    expect(resp.readings[0].html).not.toContain('<the world>');
  });
});
