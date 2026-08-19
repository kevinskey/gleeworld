import { describe, it, expect } from 'vitest';
import { executeStudentPictureTool } from '../studentPicture.ts';

const depsWith = (data: unknown) => ({
  supabase: {
    from: () => { throw new Error('tools must call rpc, not from()'); },
    rpc: async () => ({ data, error: null }),
  },
} as never);

describe('executeStudentPictureTool', () => {
  it('passes the RPC envelope through unchanged', async () => {
    const out = await executeStudentPictureTool('get_assignments', {},
      depsWith({ has_data: true, scope: 'self', rows: [{ title: 'Piece' }] }));
    expect(JSON.parse(out)).toEqual({
      has_data: true, scope: 'self', rows: [{ title: 'Piece' }],
    });
  });

  it('reports an RPC error instead of pretending there is no data', async () => {
    const deps = { supabase: { from: () => {},
      rpc: async () => ({ data: null, error: { message: 'permission denied' } }) } } as never;
    const out = await executeStudentPictureTool('get_balance', {}, deps);
    expect(JSON.parse(out)).toEqual({ error: 'permission denied' });
  });

  it('rejects an unknown tool name', async () => {
    const out = await executeStudentPictureTool('get_nothing', {}, depsWith({}));
    expect(JSON.parse(out).error).toContain('get_nothing');
  });
});
