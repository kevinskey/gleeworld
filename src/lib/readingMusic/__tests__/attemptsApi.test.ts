import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insertMock, rpcMock } = vi.hoisted(() => ({ insertMock: vi.fn(), rpcMock: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertMock })),
    rpc: rpcMock,
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { insertAttempt, overrideAttempt } from '../attemptsApi';

const attempt = {
  domain: 'rhythm', drill: 'echo', mode: 'practice' as const, level: 2, score: 90, passed: true,
  payload: {
    bpm: 84, input: 'tap' as const, syllables: 'takadimi', tolerancePct: 0.1,
    expected: [0], actual: [0.01], verdicts: ['on_time'], meter: { beats: 4, beatType: 4 }, seed: 1,
  },
};

beforeEach(() => { insertMock.mockReset(); rpcMock.mockReset(); });

describe('attemptsApi', () => {
  it('insertAttempt returns true only when a row comes back (silent-fail gotcha)', async () => {
    insertMock.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: { id: 'x' }, error: null }) }) });
    expect(await insertAttempt(attempt)).toBe(true);
    insertMock.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) });
    expect(await insertAttempt(attempt)).toBe(false);
    insertMock.mockReturnValue({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'rls' } }) }) });
    expect(await insertAttempt(attempt)).toBe(false);
  });
  it('overrideAttempt calls the RPC with named args', async () => {
    rpcMock.mockResolvedValue({ error: null });
    expect(await overrideAttempt('abc', 95)).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('override_reading_music_attempt', { p_attempt_id: 'abc', p_new_score: 95 });
    rpcMock.mockResolvedValue({ error: { message: 'not authorized' } });
    expect(await overrideAttempt('abc', 95)).toBe(false);
  });
});
