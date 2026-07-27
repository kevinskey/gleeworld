import { describe, it, expect, vi } from 'vitest';
import { runSync } from '../runSync';

function stubSupabase(opts: {
  upsertResult?: { data: any; count: number | null; error: any };
  deleteResult?: { data: any[] | null; error: any };
} = {}) {
  const upsertResult = opts.upsertResult ?? { data: [], count: 0, error: null };
  const deleteResult = opts.deleteResult ?? { data: [], error: null };
  const calls: Array<{ table: string; op: string; body?: any; filters: any[] }> = [];
  const mkDeleteChain = (table: string) => {
    const filters: any[] = [];
    const chain: any = {
      eq:  (c: string, v: any) => { filters.push({ eq: [c, v] });  return chain; },
      gte: (c: string, v: any) => { filters.push({ gte: [c, v] }); return chain; },
      lt:  (c: string, v: any) => { filters.push({ lt: [c, v] });  return chain; },
      lte: (c: string, v: any) => { filters.push({ lte: [c, v] }); return chain; },
      not: (c: string, op: string, v: any) => { filters.push({ not: [c, op, v] }); return chain; },
      select: () => { calls.push({ table, op: 'delete', filters }); return Promise.resolve(deleteResult); },
    };
    return chain;
  };
  const mkUpdateChain = (table: string, body: any) => {
    const filters: any[] = [];
    const chain: any = {
      eq:  (c: string, v: any) => { filters.push({ eq: [c, v] });  return chain; },
      gte: (c: string, v: any) => { filters.push({ gte: [c, v] }); return chain; },
      lte: (c: string, v: any) => { filters.push({ lte: [c, v] }); return chain; },
      not: (c: string, op: string, v: any) => { filters.push({ not: [c, op, v] }); return chain; },
      select: () => { calls.push({ table, op: 'update', body, filters }); return Promise.resolve({ data: [], error: null }); },
    };
    return chain;
  };
  const supabase: any = {
    from: (table: string) => ({
      upsert: (body: any, _opts: any) => {
        calls.push({ table, op: 'upsert', body, filters: [] });
        return Promise.resolve(upsertResult);
      },
      update: (body: any) => mkUpdateChain(table, body),
      delete: () => mkDeleteChain(table),
    }),
  };
  return { supabase, calls };
}

const win = { fromIso: '2026-07-13T00:00:00Z', toIso: '2026-10-25T00:00:00Z' };
const uid = 'user-1';

describe('runSync', () => {
  it('upserts every event and returns count', async () => {
    const { supabase, calls } = stubSupabase({ upsertResult: { data: [], count: 2, error: null } });
    const res = await runSync({
      supabase, user_id: uid, tenant_id: 'tenant-a',
      events: [
        { ekId: 'e1', calendarTitle: 'Personal', title: 'A', description: null, location: null, startAt: '2026-07-15T10:00:00Z', endAt: '2026-07-15T11:00:00Z', allDay: false, isPrivate: false },
        { ekId: 'e2', calendarTitle: 'Work',     title: 'B', description: null, location: null, startAt: '2026-07-16T10:00:00Z', endAt: '2026-07-16T11:00:00Z', allDay: false, isPrivate: true  },
      ],
      ...win,
    });
    expect(res).toMatchObject({ ok: true, upserted: 2 });
    const up = calls.find(c => c.op === 'upsert');
    expect(up).toBeDefined();
    expect(up!.body).toHaveLength(2);
    expect(up!.body[0]).toMatchObject({ user_id: uid, apple_event_id: 'e1', title: 'A', is_private: false });
  });

  it('sweeps rows within window not in the seen list', async () => {
    const { supabase, calls } = stubSupabase({ upsertResult: { data: [], count: 1, error: null }, deleteResult: { data: [{ id: 'd1' }], error: null } });
    const res = await runSync({
      supabase, user_id: uid, tenant_id: 'tenant-a',
      events: [{ ekId: 'e1', calendarTitle: 'p', title: 'A', description: null, location: null, startAt: '2026-07-15T10:00:00Z', endAt: '2026-07-15T11:00:00Z', allDay: false, isPrivate: false }],
      ...win,
    });
    expect(res.deleted).toBe(1);
    const del = calls.find(c => c.op === 'delete');
    expect(del).toBeDefined();
    expect(del!.filters).toEqual(expect.arrayContaining([
      { eq: ['user_id', uid] },
      { gte: ['start_at', win.fromIso] },
      { lt: ['start_at', win.toIso] },
    ]));
    expect(del!.filters.some((f: any) => f.not?.[0] === 'apple_event_id')).toBe(true);
  });

  it('with empty events, still runs the delete-in-window (sentinel)', async () => {
    const { supabase, calls } = stubSupabase();
    await runSync({ supabase, user_id: uid, tenant_id: 'tenant-a', events: [], ...win });
    expect(calls.find(c => c.op === 'delete')).toBeDefined();
  });

  it('rejects oversize event lists', async () => {
    const { supabase } = stubSupabase();
    const events = Array.from({ length: 501 }, (_, i) => ({ ekId: `e${i}`, calendarTitle: 'p', title: 'x', description: null, location: null, startAt: '2026-07-15T10:00:00Z', endAt: '2026-07-15T11:00:00Z', allDay: false, isPrivate: false }));
    const res = await runSync({ supabase, user_id: uid, tenant_id: 'tenant-a', events, ...win });
    expect((res as any).error).toBe('too_many_events');
  });

  it('rejects oversized sync windows', async () => {
    const { supabase } = stubSupabase();
    const res = await runSync({ supabase, user_id: uid, tenant_id: 'tenant-a', events: [], fromIso: '2020-01-01T00:00:00Z', toIso: '2027-01-01T00:00:00Z' });
    expect((res as any).error).toBe('window_too_large');
  });
});
