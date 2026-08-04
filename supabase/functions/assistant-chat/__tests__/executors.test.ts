import { describe, it, expect } from 'vitest';
import { executeServerTool } from '../executors';

function stubSupabase(rows: unknown[], error: { message: string } | null = null) {
  // Chainable stub: every method returns the builder; awaiting it resolves {data, error}.
  const builder: any = {};
  for (const m of ['select', 'gte', 'lte', 'lt', 'eq', 'or', 'ilike', 'order', 'limit']) {
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
