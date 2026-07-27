import { describe, it, expect, vi } from 'vitest';
import { runUnshare } from '../runUnshare';

function stubSupabaseDelete(result: { data: any[] | null; error: any }) {
  const filters: any[] = [];
  const chain: any = {
    delete: () => chain,
    eq: (col: string, value: any) => { filters.push({ eq: [col, value] }); return chain; },
    in: (col: string, values: any[]) => { filters.push({ in: [col, values] }); return chain; },
    select: () => Promise.resolve(result),
  };
  chain.filters = filters;
  return { from: () => chain } as any;
}

describe('runUnshare', () => {
  it('happy path: deletes the caller\'s own shared event', async () => {
    const supabase = stubSupabaseDelete({ data: [{ id: 'ev-1' }], error: null });
    const res = await runUnshare({ user_id: 'user-1', shared_event_id: 'ev-1', supabase });
    expect(res).toEqual({ ok: true, deleted: 1 });
    const del = supabase.from();
    expect(del.filters).toEqual(expect.arrayContaining([{ in: ['external_source', ['google_calendar', 'ios_calendar']] }]));
  });

  it('reports 0 deleted when the caller is not the origin_user_id (no error, no leak)', async () => {
    const supabase = stubSupabaseDelete({ data: [], error: null });
    const res = await runUnshare({ user_id: 'other', shared_event_id: 'ev-1', supabase });
    expect(res).toEqual({ ok: true, deleted: 0 });
  });

  it('propagates DB errors as save_failed', async () => {
    const supabase = stubSupabaseDelete({ data: null, error: { message: 'perm denied' } });
    const res = await runUnshare({ user_id: 'user-1', shared_event_id: 'ev-1', supabase });
    expect(res).toMatchObject({ error: 'save_failed' });
  });
});
