import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
let uploadedPaths: string[] = [];

vi.mock('@/integrations/supabase/client', () => {
  const row = (payload?: unknown) => ({
    select: () => ({
      single: () => Promise.resolve({ data: payload ?? { id: 'x' }, error: null }),
    }),
  });
  return {
    supabase: {
      storage: {
        from: () => ({
          upload: (path: string) => {
            uploadedPaths.push(path);
            return Promise.resolve({ data: { path }, error: null });
          },
        }),
      },
      from: (table: string) => ({
        update: (payload: unknown) => {
          calls.push({ table, op: 'update', payload });
          return { eq: () => row(payload) };
        },
        insert: (payload: unknown) => {
          calls.push({ table, op: 'insert', payload });
          return row(payload);
        },
      }),
    },
  };
});

import { replaceSource } from '../api';

describe('replaceSource', () => {
  beforeEach(() => {
    calls.length = 0;
    uploadedPaths = [];
  });

  it('resets the pipeline and re-analyzes with the corrected file', async () => {
    const file = new File(['<score-partwise/>'], 'fixed.musicxml');
    await replaceSource('score-1', file, 'musicxml');

    expect(uploadedPaths).toHaveLength(1);
    expect(uploadedPaths[0]).toMatch(/^uploads\/score-1\/source-.+\.musicxml$/);

    const upd = calls.find((c) => c.table === 'gw_parttrack_scores' && c.op === 'update');
    expect(upd?.payload).toMatchObject({
      source_path: uploadedPaths[0],
      source_type: 'musicxml',
      normalized_mxl_path: null,
      status: 'queued',
      error_message: null,
    });

    const job = calls.find((c) => c.table === 'gw_parttrack_jobs');
    expect(job?.payload).toMatchObject({ score_id: 'score-1', kind: 'analyze' });
    // The worker reads the scores row when it claims the job — the reset must land first.
    expect(calls.indexOf(upd!)).toBeLessThan(calls.indexOf(job!));
  });
});
