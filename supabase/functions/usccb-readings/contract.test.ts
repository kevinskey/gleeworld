// Pins the usccb-readings response contract: field names, types, and that
// `readings` carries all four keys. Deployed iOS clients call this function
// by name and depend on this exact shape — see
// docs/superpowers/plans/2026-08-04-prayer-phase1.md Task 4. The function's
// data source (previously a live scrape of universalis.com, now the local
// prayer_day_full RPC) must never change what callers receive.
import { describe, it, expect, vi } from 'vitest';
import { buildReadingsResponse, type RpcClient } from './buildReadingsResponse';

function stubRpc(data: unknown): RpcClient {
  return { rpc: vi.fn().mockResolvedValue({ data, error: null }) };
}

describe('buildReadingsResponse — response contract', () => {
  it('returns the exact shape: date, sourceUrl, liturgicalTitle, readings[]', async () => {
    const supabase = stubRpc({
      date: '2026-03-01',
      events: [
        {
          name: 'A Test Celebration',
          rank_grade: 3,
          readings: [
            {
              slot: 'first_reading',
              citation: 'Isaiah 2:1-5',
              schema_label: '',
              verses: [{ chapter: 2, verse: 1, text: 'In the last days…' }],
              attribution: 'Test Version. Public domain.',
            },
          ],
        },
      ],
    });

    const resp = await buildReadingsResponse(supabase, '2026-03-01', 'https://gleeworld.org/prayer');

    expect(resp).toEqual({
      date: '2026-03-01',
      sourceUrl: 'https://gleeworld.org/prayer',
      liturgicalTitle: 'A Test Celebration',
      readings: [
        {
          heading: 'First Reading',
          citation: 'Isaiah 2:1-5',
          summary: null,
          html: '<p><sup>1</sup> In the last days…</p><p><em>Test Version. Public domain.</em></p>',
        },
      ],
    });
    for (const block of resp.readings) {
      expect(block).toHaveProperty('heading');
      expect(block).toHaveProperty('citation');
      expect(block).toHaveProperty('summary');
      expect(block).toHaveProperty('html');
    }
  });

  it('humanizes every canonical slot', async () => {
    const slots = ['first_reading', 'responsorial_psalm', 'second_reading', 'gospel_acclamation', 'gospel'];
    const supabase = stubRpc({
      date: '2026-12-25',
      events: [
        {
          name: 'Christmas',
          rank_grade: 7,
          readings: slots.map((slot) => ({
            slot,
            citation: 'Some Citation',
            schema_label: '',
            verses: [],
            attribution: null,
          })),
        },
      ],
    });

    const resp = await buildReadingsResponse(supabase, '2026-12-25', 'https://gleeworld.org/prayer');

    expect(resp.readings.map((r) => r.heading)).toEqual([
      'First Reading',
      'Responsorial Psalm',
      'Second Reading',
      'Gospel Acclamation',
      'Gospel',
    ]);
  });

  it('renders the Responsorial Psalm with real verse text — the user-visible win over the old scrape', async () => {
    const supabase = stubRpc({
      date: '2026-03-01',
      events: [
        {
          name: 'Feria',
          rank_grade: 1,
          readings: [
            {
              slot: 'responsorial_psalm',
              citation: 'Psalm 23:1-2',
              schema_label: '',
              verses: [
                { chapter: 23, verse: 1, text: 'The LORD is my shepherd; I shall lack nothing.' },
                { chapter: 23, verse: 2, text: 'He makes me lie down in green pastures.' },
              ],
              attribution: 'World English Bible (Catholic Edition). Public domain.',
            },
          ],
        },
      ],
    });

    const resp = await buildReadingsResponse(supabase, '2026-03-01', 'https://gleeworld.org/prayer');
    const psalm = resp.readings[0];

    expect(psalm.html).toContain('The LORD is my shepherd');
    expect(psalm.html).toContain('He makes me lie down in green pastures.');
    expect(psalm.html).toContain('World English Bible (Catholic Edition)');
  });

  it('HTML-escapes verse text and attribution', async () => {
    const supabase = stubRpc({
      date: '2026-03-01',
      events: [
        {
          name: 'Feria',
          rank_grade: 1,
          readings: [
            {
              slot: 'gospel',
              citation: 'John 1:1',
              schema_label: '',
              verses: [{ chapter: 1, verse: 1, text: 'A & B <tag> "quote"' }],
              attribution: 'A & B',
            },
          ],
        },
      ],
    });

    const resp = await buildReadingsResponse(supabase, '2026-03-01', 'https://gleeworld.org/prayer');

    expect(resp.readings[0].html).not.toContain('<tag>');
    expect(resp.readings[0].html).toContain('&amp;');
    expect(resp.readings[0].html).toContain('&lt;tag&gt;');
    expect(resp.readings[0].html).toContain('&quot;quote&quot;');
  });

  it('degrades an unresolved reading (no usfm_code/ranges) to citation-only, never an error', async () => {
    const supabase = stubRpc({
      date: '2026-03-01',
      events: [
        {
          name: 'Feria',
          rank_grade: 1,
          readings: [
            {
              slot: 'note',
              citation: 'From the Common of the Blessed Virgin Mary',
              schema_label: '',
              verses: [],
              attribution: null,
            },
          ],
        },
      ],
    });

    const resp = await buildReadingsResponse(supabase, '2026-03-01', 'https://gleeworld.org/prayer');

    expect(resp.readings).toEqual([
      { heading: 'Note', citation: 'From the Common of the Blessed Virgin Mary', summary: null, html: '' },
    ]);
  });

  it('returns an empty readings array (never null/undefined) when the date has no calendar event', async () => {
    const supabase = stubRpc({ date: '1900-01-01', events: [] });

    const resp = await buildReadingsResponse(supabase, '1900-01-01', 'https://gleeworld.org/prayer');

    expect(resp).toEqual({
      date: '1900-01-01',
      sourceUrl: 'https://gleeworld.org/prayer',
      liturgicalTitle: null,
      readings: [],
    });
  });

  it('throws when the RPC reports an error, so the caller returns a 502 rather than a fake empty day', async () => {
    const supabase: RpcClient = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }) };

    await expect(
      buildReadingsResponse(supabase, '2026-03-01', 'https://gleeworld.org/prayer'),
    ).rejects.toThrow('boom');
  });
});
