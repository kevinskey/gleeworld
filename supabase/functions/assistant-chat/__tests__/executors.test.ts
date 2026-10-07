import { describe, it, expect } from 'vitest';
import { executeServerTool } from '../executors';

function stubSupabase(rows: unknown[], error: { message: string } | null = null) {
  // Chainable stub: every method returns the builder; awaiting it resolves {data, error}.
  const builder: any = {};
  for (const m of ['select', 'gte', 'lte', 'lt', 'eq', 'is', 'or', 'ilike', 'order', 'limit']) {
    builder[m] = () => builder;
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error });
  return { from: () => builder } as any;
}

describe('executeServerTool', () => {
  it('returns { replyJson } shape for existing tools', async () => {
    const out = await executeServerTool('search_music', { query: 'lift' },
      { supabase: stubSupabase([{ id: 's1', title: 'Lift Every Voice' }]) });
    expect(typeof out.replyJson).toBe('string');
    expect(out.resultsPanel).toBeUndefined();
  });

  it('query_calendar returns events as JSON', async () => {
    const out = await executeServerTool('query_calendar',
      { from: '2026-07-13', to: '2026-07-13' },
      { supabase: stubSupabase([{ id: '1', title: 'Rehearsal', start_date: '2026-07-13T21:00:00Z' }]) });
    expect(JSON.parse(out.replyJson).events[0].title).toBe('Rehearsal');
  });

  it('query_calendar never sends Google Calendar data to the model (Limited Use)', async () => {
    const tables: string[] = [];
    const filters: string[] = [];
    const builder: any = {};
    for (const m of ['select', 'gte', 'lte', 'eq', 'order', 'limit']) builder[m] = () => builder;
    builder.or = (f: string) => { filters.push(f); return builder; };
    builder.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
    const supabase = { from: (t: string) => { tables.push(t); return builder; } } as any;

    const out = await executeServerTool('query_calendar', { from: '2026-07-13', to: '2026-07-14' }, { supabase });

    expect(tables).not.toContain('gw_google_events');
    expect(filters).toContain('external_source.is.null,external_source.neq.google_calendar');
    expect(JSON.parse(out.replyJson)).not.toHaveProperty('google_calendar_events');
  });

  it('search_music returns scores as JSON', async () => {
    const out = await executeServerTool('search_music', { query: 'lift' },
      { supabase: stubSupabase([{ id: 's1', title: 'Lift Every Voice', composer: 'J. R. Johnson' }]) });
    expect(JSON.parse(out.replyJson).scores[0].id).toBe('s1');
  });


  it('surfaces db errors as an error field, not a throw', async () => {
    const out = await executeServerTool('search_music', { query: 'x' },
      { supabase: stubSupabase([], { message: 'permission denied' }) });
    expect(JSON.parse(out.replyJson).error).toContain('permission denied');
  });

  it('rejects unknown tools', async () => {
    const out = await executeServerTool('drop_tables', {}, { supabase: stubSupabase([]) });
    expect(JSON.parse(out.replyJson).error).toContain('Unknown tool');
  });
});

describe('search_academy executor', () => {
  const deps = { supabase: { from: () => ({}) } } as any;

  it('returns passages for a matching query', async () => {
    const { replyJson } = await executeServerTool('search_academy', { query: 'ictus' }, deps);
    const parsed = JSON.parse(replyJson);
    expect(Array.isArray(parsed.passages)).toBe(true);
    expect(parsed.passages.length).toBeGreaterThan(0);
    expect(parsed.passages[0]).toHaveProperty('title');
    expect(parsed.passages[0]).toHaveProperty('text');
    expect(parsed.passages[0]).toHaveProperty('url');
  });

  it('reports no match explicitly rather than returning an empty success', async () => {
    const { replyJson } = await executeServerTool(
      'search_academy', { query: 'zzzz nonexistent trombone embouchure' }, deps,
    );
    const parsed = JSON.parse(replyJson);
    expect(parsed.passages).toEqual([]);
    expect(parsed.note).toMatch(/no matching/i);
  });

  it('handles a missing query argument without throwing', async () => {
    const { replyJson } = await executeServerTool('search_academy', {}, deps);
    expect(JSON.parse(replyJson).passages).toEqual([]);
  });
});

describe('set_preferred_name executor', () => {
  function updateStub(returned: unknown[]) {
    const builder: any = {};
    for (const m of ['update', 'eq', 'select']) builder[m] = () => builder;
    builder.then = (resolve: (v: unknown) => void) => resolve({ data: returned, error: null });
    return { from: () => builder } as any;
  }

  it('saves the preferred name for the caller', async () => {
    const { replyJson } = await executeServerTool('set_preferred_name', { name: 'Doc' },
      { supabase: updateStub([{ preferred_name: 'Doc' }]), userId: 'u1' } as any);
    const out = JSON.parse(replyJson);
    expect(out.ok).toBe(true);
    expect(out.preferred_name).toBe('Doc');
    expect(out.note).toContain('Doc');
  });

  it('clear=true resets to the first name', async () => {
    const { replyJson } = await executeServerTool('set_preferred_name', { clear: true },
      { supabase: updateStub([{ preferred_name: null }]), userId: 'u1' } as any);
    const out = JSON.parse(replyJson);
    expect(out.ok).toBe(true);
    expect(out.preferred_name).toBeNull();
  });

  it('refuses without a caller id', async () => {
    const { replyJson } = await executeServerTool('set_preferred_name', { name: 'Doc' },
      { supabase: updateStub([]) } as any);
    expect(JSON.parse(replyJson).error).toContain('caller');
  });
});

// ── Scripture: lectionary citations and the day's readings ──
//
// The citations in gw_prayer_readings arrive exactly as printed in the
// lectionary — verse groups, half-verse letters, em-dash chapter breaks.
// The assistant hands them to lookup_bible verbatim after liturgical_day,
// so the parser rejecting them meant it announced the readings but could
// not read a single one (Doc, 2026-09-27).
describe('lookup_bible with lectionary citations', () => {
  function verseStub(rows: Array<{ chapter: number; verse: number; text: string }>) {
    const make = () => {
      const b: any = {};
      for (const m of ['select', 'gte', 'lte', 'eq', 'in', 'order', 'limit', 'textSearch']) b[m] = () => b;
      b.then = (resolve: (v: unknown) => void) =>
        resolve({ data: rows.map((r) => ({ ...r, book: { name: 'Psalms' } })), error: null });
      return b;
    };
    return { from: () => make() } as any;
  }

  it('reads a responsorial psalm citation with verse groups', async () => {
    const rows = [4, 5, 6, 7, 8, 9].map((v) => ({ chapter: 25, verse: v, text: `v${v}` }));
    const { replyJson } = await executeServerTool('lookup_bible',
      { reference: 'Psalm 25:4-5, 6-7, 8-9' }, { supabase: verseStub(rows) });
    const out = JSON.parse(replyJson);
    expect(out.error).toBeUndefined();
    expect(out.verses).toHaveLength(6);
    expect(out.reference).toBe('Psalms 25:4-9');
  });

  it('accepts half-verse letters and "and"', async () => {
    const rows = [1, 2, 3, 4].map((v) => ({ chapter: 144, verse: v, text: `v${v}` }));
    const { replyJson } = await executeServerTool('lookup_bible',
      { reference: 'Psalm 144:1b and 2abc, 3-4' }, { supabase: verseStub(rows) });
    expect(JSON.parse(replyJson).error).toBeUndefined();
  });

  it('accepts an em-dash cross-chapter range', async () => {
    const rows = [{ chapter: 11, verse: 9, text: 'v' }];
    const { replyJson } = await executeServerTool('lookup_bible',
      { reference: 'Ecclesiastes 11:9—12:8' }, { supabase: verseStub(rows) });
    expect(JSON.parse(replyJson).error).toBeUndefined();
  });

  it('still rejects a non-reference', async () => {
    const { replyJson } = await executeServerTool('lookup_bible',
      { reference: 'Nonsense 3' }, { supabase: verseStub([]) });
    expect(JSON.parse(replyJson).error).toContain('could not read');
  });
});

describe('liturgical_day picks the celebration that has readings', () => {
  // A Saturday carries several rows (ferial day, optional memorials, the
  // Sunday vigil) and the readings hang off only one of them. Answering
  // from the top-ranked row regardless returned an empty readings list.
  function dayStub() {
    const days = [
      { id: 'd-wenceslaus', name: 'Saint Wenceslaus, Martyr', rank_label: 'Optional Memorial',
        liturgical_season: 'ORDINARY_TIME', sunday_cycle: 'A', is_holy_day_of_obligation: false, color: ['red'] },
      { id: 'd-ferial', name: 'Monday of the 26th Week of Ordinary Time', rank_label: 'Weekday',
        liturgical_season: 'ORDINARY_TIME', sunday_cycle: 'A', is_holy_day_of_obligation: false, color: ['green'] },
    ];
    const readings = [
      { calendar_day_id: 'd-ferial', slot: 'first_reading', citation: 'Job 1:6-22', sort_order: 1 },
      { calendar_day_id: 'd-ferial', slot: 'gospel', citation: 'Luke 9:46-50', sort_order: 3 },
    ];
    const make = (rows: unknown[]) => {
      const b: any = {};
      for (const m of ['select', 'gte', 'lte', 'eq', 'in', 'order', 'limit']) b[m] = () => b;
      b.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
      return b;
    };
    return {
      from: (table: string) => make(table === 'gw_prayer_calendar_days' ? days : readings),
    } as any;
  }

  it('returns the readings even when a higher-ranked row has none', async () => {
    const { replyJson } = await executeServerTool('liturgical_day',
      { date: '2026-09-28' }, { supabase: dayStub() });
    const out = JSON.parse(replyJson);
    expect(out.celebration).toBe('Monday of the 26th Week of Ordinary Time');
    expect(out.readings).toHaveLength(2);
    expect(out.readings[0].citation).toBe('Job 1:6-22');
  });
});
