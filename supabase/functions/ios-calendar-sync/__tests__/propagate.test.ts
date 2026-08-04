import { describe, it, expect, vi } from 'vitest';
import { propagateIosUpdates, propagateIosDeletes } from '../propagate';

function stubAdmin() {
  const calls: Array<{ table: string; op: string; body?: any; filters: any[] }> = [];
  const mkChain = (table: string, op: string, body?: any) => {
    const filters: any[] = [];
    const chain: any = {
      eq: (col: string, val: any) => { filters.push({ eq: [col, val] }); return chain; },
      gte: (col: string, val: any) => { filters.push({ gte: [col, val] }); return chain; },
      lte: (col: string, val: any) => { filters.push({ lte: [col, val] }); return chain; },
      not: (col: string, op2: string, val: any) => { filters.push({ not: [col, op2, val] }); return chain; },
      then: (resolve: (v: any) => void) => { calls.push({ table, op, body, filters }); resolve({ data: [], error: null }); },
    };
    return chain;
  };
  const admin: any = {
    from: (table: string) => ({
      update: (body: any) => mkChain(table, 'update', body),
      delete: () => mkChain(table, 'delete'),
    }),
  };
  return { admin, calls };
}

describe('propagateIosUpdates', () => {
  it('issues one UPDATE per iOS event with mirrored fields', async () => {
    const { admin, calls } = stubAdmin();
    await propagateIosUpdates(admin, 'user-1', 'tenant-a', [
      { apple_event_id: 'i1', title: 'A', description: 'x', location: 'L', start_at: '2026-08-01T00:00:00Z', end_at: '2026-08-01T01:00:00Z', all_day: false },
      { apple_event_id: 'i2', title: 'B', description: null, location: null, start_at: '2026-08-02T00:00:00Z', end_at: '2026-08-02T01:00:00Z', all_day: true },
    ]);
    const updates = calls.filter(c => c.op === 'update');
    expect(updates.length).toBe(2);
    expect(updates[0].body).toMatchObject({ title: 'A', location: 'L', start_date: '2026-08-01T00:00:00Z' });
    expect(updates[0].filters).toEqual(expect.arrayContaining([
      { eq: ['origin_user_id', 'user-1'] },
      { eq: ['tenant_id', 'tenant-a'] },
      { eq: ['external_source', 'ios_calendar'] },
      { eq: ['external_id', 'i1'] },
    ]));
  });
});

describe('propagateIosDeletes', () => {
  it('deletes gw_events rows whose external_id is NOT in the seen list, inside window', async () => {
    const { admin, calls } = stubAdmin();
    await propagateIosDeletes(admin, 'user-1', 'tenant-a', ['i1', 'i2'], {
      start: '2026-07-01T00:00:00Z',
      end:   '2026-10-01T00:00:00Z',
    });
    const del = calls.find(c => c.op === 'delete');
    expect(del).toBeDefined();
    expect(del!.filters).toEqual(expect.arrayContaining([
      { eq: ['origin_user_id', 'user-1'] },
      { eq: ['tenant_id', 'tenant-a'] },
      { eq: ['external_source', 'ios_calendar'] },
      { gte: ['start_date', '2026-07-01T00:00:00Z'] },
      { lte: ['start_date', '2026-10-01T00:00:00Z'] },
    ]));
    // The "not in" filter should be present.
    expect(del!.filters.some((f: any) => f.not && f.not[0] === 'external_id')).toBe(true);
  });

  it('with an empty seen list, still runs the delete (removes everything in-window)', async () => {
    const { admin, calls } = stubAdmin();
    await propagateIosDeletes(admin, 'user-1', 'tenant-a', [], {
      start: '2026-07-01T00:00:00Z', end: '2026-10-01T00:00:00Z',
    });
    expect(calls.find(c => c.op === 'delete')).toBeDefined();
  });
});
