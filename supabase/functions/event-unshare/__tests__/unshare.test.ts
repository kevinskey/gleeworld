import { describe, it, expect, vi } from 'vitest';
import { runUnshare } from '../runUnshare';

function stubSupabaseDelete(result: { data: any[] | null; error: any }) {
  const calls: Array<{ table: string; op: string; filters: any[] }> = [];
  const mkDeleteChain = (table: string) => {
    const filters: any[] = [];
    const chain: any = {
      eq:  (col: string, value: any)        => { filters.push({ eq: [col, value] });       return chain; },
      in:  (col: string, values: any[])     => { filters.push({ in: [col, values] });      return chain; },
      not: (col: string, op: string, v: any) => { filters.push({ not: [col, op, v] });    return chain; },
      select: () => { calls.push({ table, op: 'delete', filters }); return Promise.resolve(result); },
    };
    return chain;
  };
  const supabase: any = {
    from: (table: string) => ({
      delete: () => mkDeleteChain(table),
    }),
    _calls: calls,
  };
  return { supabase, calls };
}

describe('runUnshare', () => {
  it('happy path: deletes the caller\'s own shared event', async () => {
    const { supabase, calls } = stubSupabaseDelete({ data: [{ id: 'ev-1' }], error: null });
    const res = await runUnshare({ user_id: 'user-1', shared_event_id: 'ev-1', supabase });
    expect(res).toEqual({ ok: true, deleted: 1 });
    const del = calls.find(c => c.op === 'delete');
    expect(del!.filters).toEqual(expect.arrayContaining([
      { in: ['external_source', ['google_calendar', 'ios_calendar']] },
    ]));
  });

  it('reports 0 deleted when the caller is not the origin_user_id (no error, no leak)', async () => {
    const { supabase } = stubSupabaseDelete({ data: [], error: null });
    const res = await runUnshare({ user_id: 'other', shared_event_id: 'ev-1', supabase });
    expect(res).toEqual({ ok: true, deleted: 0 });
  });

  it('propagates DB errors as save_failed', async () => {
    const { supabase } = stubSupabaseDelete({ data: null, error: { message: 'perm denied' } });
    const res = await runUnshare({ user_id: 'user-1', shared_event_id: 'ev-1', supabase });
    expect(res).toMatchObject({ error: 'save_failed' });
  });
});
