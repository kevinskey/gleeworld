// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({ select: vi.fn(), upsert: vi.fn(), getSession: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: h.select, upsert: h.upsert }),
    auth: { getSession: h.getSession },
  },
}));
// The brief's sketch mocks '@/lib/jwt', but that module does not exist in
// this repo — decodeJwtClaims lives in '@/lib/demoSession' (the same import
// WorkspaceSettingsPage's NavigationTabPanel uses). Mock that real path
// rather than adding a second decoder module just to match a stale mock
// target.
vi.mock('@/lib/demoSession', () => ({ decodeJwtClaims: () => ({ tenant_id: 't1' }) }));

import { useTenantDefaultTools } from '../useTenantDefaultTools';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  h.select.mockReset(); h.upsert.mockReset(); h.getSession.mockReset();
  h.getSession.mockResolvedValue({ data: { session: { access_token: 'x', user: { id: 'u1' } } } });
  h.upsert.mockResolvedValue({ error: null });
});

describe('useTenantDefaultTools', () => {
  it('maps rows to a role-keyed record', async () => {
    h.select.mockResolvedValue({
      data: [{ role: 'student', default_tools: ['calendar', 'academy'] }],
      error: null,
    });
    const { result } = renderHook(() => useTenantDefaultTools(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.defaultsByRole.student).toEqual(['calendar', 'academy']);
    expect(result.current.defaultsByRole.admin).toEqual([]);
  });

  it('returns empty arrays for every role when the query fails', async () => {
    h.select.mockResolvedValue({ data: null, error: { message: 'nope' } });
    const { result } = renderHook(() => useTenantDefaultTools(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.defaultsByRole).toEqual({ admin: [], student: [], member: [] });
  });

  it('upserts on (tenant_id,role) and caps at 8', async () => {
    h.select.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useTenantDefaultTools(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const many = Array.from({ length: 20 }, (_, i) => `k${i}`);
    await act(async () => { await result.current.saveDefaults('student', many); });

    const [row, opts] = h.upsert.mock.calls[0];
    expect(row.role).toBe('student');
    expect(row.tenant_id).toBe('t1');
    expect(row.default_tools).toHaveLength(8);
    expect(opts).toEqual({ onConflict: 'tenant_id,role' });
  });

  it('returns false and does not throw when the upsert fails', async () => {
    h.select.mockResolvedValue({ data: [], error: null });
    h.upsert.mockResolvedValue({ error: { message: 'denied' } });
    const { result } = renderHook(() => useTenantDefaultTools(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok = true;
    await act(async () => { ok = await result.current.saveDefaults('student', ['calendar']); });
    expect(ok).toBe(false);
  });
});
