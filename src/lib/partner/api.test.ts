import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The underlying rpc call never settles — simulates a hung socket.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(() => new Promise(() => {})),
  },
}));

import { claimPartnerByEmailWithTimeout } from './api';

describe('claimPartnerByEmailWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves null after the timeout when the underlying rpc never settles', async () => {
    const pending = claimPartnerByEmailWithTimeout(4000);
    await vi.advanceTimersByTimeAsync(4000);
    await expect(pending).resolves.toBeNull();
  });
});
