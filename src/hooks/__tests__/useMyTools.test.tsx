// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { maybeSingle, rpc, upsert } = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }), upsert }),
    rpc,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

import { useMyTools } from '../useMyTools';
import { DEFAULT_TOOLS_STUDENT, DEFAULT_TOOLS_FACULTY } from '@/lib/navigation/myTools';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  maybeSingle.mockReset();
  rpc.mockReset();
  upsert.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe('useMyTools', () => {
  it('migrates a legacy tile layout on read', async () => {
    maybeSingle.mockResolvedValue({
      data: { nav_item_order: null, home_tile_layout: { v: 1, order: ['studio', 'academy'] } },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.myTools?.tools).toEqual(['studio', 'academy']);
    expect(result.current.myTools?.setupComplete).toBe(true);
  });

  it('falls back to role defaults when the row is missing', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('faculty'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.myTools?.tools[0]).toBe('calendar');
    expect(result.current.myTools?.setupComplete).toBe(false);
  });

  it('falls back to role defaults when the query returns an error', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useMyTools('faculty'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.myTools?.tools).toEqual(DEFAULT_TOOLS_FACULTY);
  });

  it('falls back to role defaults when the query throws', async () => {
    maybeSingle.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.myTools?.tools).toEqual(DEFAULT_TOOLS_STUDENT);
  });

  it('saves through the RPC and never through a direct upsert', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.saveTools(['studio', 'academy']); });

    expect(rpc).toHaveBeenCalledWith('save_nav_item_order', {
      p_nav_item_order: { v: 4, tools: ['studio', 'academy'], widgets: [], setupComplete: true },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('caps a save at 8 tools', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const many = Array.from({ length: 20 }, (_, i) => `k${i}`);
    await act(async () => { await result.current.saveTools(many); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[] };
    expect(sent.tools).toHaveLength(8);
  });

  it('serves both roles from ONE user_preferences read, with no cross-contamination', async () => {
    // Two findings meet here.
    //
    // I3 (round 1): DashboardShell computes `role` from a profile that starts
    // null (useUserRole loading), so the first render for the SAME uid can
    // ask as 'student' before the real role ('faculty') is known. The wrong
    // guess must not be what the faculty render reads back out.
    //
    // M8 (final review): making `role` part of the QUERY key fixed that by
    // fetching the same row twice — two network reads on every navigation
    // for every faculty member. The row is role-independent; only the
    // DERIVED record depends on role. So the query caches the raw row under
    // a role-less key and migrateToMyTools runs in memory per role: one
    // read, and each role still gets its own answer.
    //
    // Sharing one QueryClient across both renders reproduces the real
    // shared-cache scenario.
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const sharedWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result: studentResult } = renderHook(() => useMyTools('student'), { wrapper: sharedWrapper });
    await waitFor(() => expect(studentResult.current.loading).toBe(false));
    expect(studentResult.current.myTools?.tools).toEqual(DEFAULT_TOOLS_STUDENT);

    const { result: facultyResult } = renderHook(() => useMyTools('faculty'), { wrapper: sharedWrapper });
    await waitFor(() => expect(facultyResult.current.loading).toBe(false));
    expect(facultyResult.current.myTools?.tools).toEqual(DEFAULT_TOOLS_FACULTY);
    expect(facultyResult.current.myTools?.tools).not.toEqual(DEFAULT_TOOLS_STUDENT);
    // M8: the second role reused the cached row instead of re-reading it.
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('rolls the cache back when the save fails', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    rpc.mockResolvedValue({ error: { message: 'denied' } });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = result.current.myTools?.tools;

    let ok = true;
    await act(async () => { ok = await result.current.saveTools(['studio']); });

    expect(ok).toBe(false);
    expect(result.current.myTools?.tools).toEqual(before);
  });
});

describe('saveMyTools', () => {
  it('patches widgets without disturbing tools', async () => {
    maybeSingle.mockResolvedValue({
      data: { nav_item_order: { v: 4, tools: ['studio'], widgets: [], setupComplete: true }, home_tile_layout: null },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.saveMyTools({ widgets: ['today'] }); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[]; widgets: string[] };
    expect(sent.tools).toEqual(['studio']);
    expect(sent.widgets).toEqual(['today']);
  });

  it('caps widgets at 2', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.saveMyTools({ widgets: ['a', 'b', 'c'] }); });
    const sent = rpc.mock.calls[0][1].p_nav_item_order as { widgets: string[] };
    expect(sent.widgets).toHaveLength(2);
  });

  it('can mark setup complete without changing anything else', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('faculty'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const before = result.current.myTools!.tools;

    await act(async () => { await result.current.saveMyTools({ setupComplete: true }); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[]; setupComplete: boolean };
    expect(sent.tools).toEqual(before);
    expect(sent.setupComplete).toBe(true);
  });
});
