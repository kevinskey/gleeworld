import { describe, it, expect, vi, beforeEach } from 'vitest';

// Plain stub rather than vi.fn(): this Vitest reports errors thrown inside a
// spy implementation even when the code under test catches them, and the
// fail-closed path is exactly what we need to exercise.
const state = vi.hoisted(() => ({
  calls: [] as unknown[][],
  impl: (() => Promise.resolve({ data: [], error: null })) as () => unknown,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: unknown[]) => {
      state.calls.push(a);
      return state.impl();
    },
  },
}));

import { isMemberOfTenant } from '../tenantRedirect';

describe('isMemberOfTenant', () => {
  beforeEach(() => {
    state.calls = [];
    state.impl = () => Promise.resolve({ data: [], error: null });
  });

  it('is true when my_tenants lists the slug', async () => {
    state.impl = () => Promise.resolve({ data: [{ slug: 'main' }, { slug: 'kevin' }], error: null });
    expect(await isMemberOfTenant('kevin')).toBe(true);
    expect(state.calls).toEqual([['my_tenants']]);
  });

  it('is false when the slug is not among the memberships', async () => {
    state.impl = () => Promise.resolve({ data: [{ slug: 'main' }], error: null });
    expect(await isMemberOfTenant('kevin')).toBe(false);
  });

  it('fails closed on an RPC error', async () => {
    state.impl = () => Promise.resolve({ data: null, error: { message: 'boom' } });
    expect(await isMemberOfTenant('kevin')).toBe(false);
  });

  it('fails closed when the call throws', async () => {
    state.impl = () => { throw new Error('network'); };
    expect(await isMemberOfTenant('kevin')).toBe(false);
  });

  it('is false for an empty slug without calling the server', async () => {
    expect(await isMemberOfTenant('')).toBe(false);
    expect(state.calls).toEqual([]);
  });
});
