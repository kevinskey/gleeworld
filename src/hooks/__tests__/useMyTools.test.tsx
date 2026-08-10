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
import { DEFAULT_TOOLS_STUDENT, DEFAULT_TOOLS_FACULTY, type ToolGroup } from '@/lib/navigation/myTools';

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
      p_nav_item_order: { v: 5, tools: ['studio', 'academy'], groups: [], widgets: [], setupComplete: true },
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  // The 8-tool cap was removed on 2026-08-09 (product owner). A save must
  // persist the member's whole set — truncating at 8 is exactly the silent
  // drop the removal ends. Only MY_TOOLS_SANITY_MAX (64, corruption
  // protection) still bounds anything.
  it('saves all 20 tools — 8 is a starting size, not a cap', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const many = Array.from({ length: 20 }, (_, i) => `k${i}`);
    await act(async () => { await result.current.saveTools(many); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[] };
    expect(sent.tools).toEqual(many);
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

describe('pinTool', () => {
  // The fifth instance of one class on this project: an append computed from
  // a render-time snapshot of a record that had not loaded yet. `myTools` is
  // null for the whole life of the query, and BOTH doors into the All Tools
  // sheet (the shelf row and ⌘K) are live from first paint — so a pin during
  // that window used to persist {tools:['academy']} and take the member's
  // eight tools AND their widgets with it. pinTool reads the freshest record
  // from the query cache at CALL time, and refuses outright unless the row
  // was genuinely fetched.
  it('persists nothing when the record has not loaded yet', async () => {
    let release!: (v: unknown) => void;
    maybeSingle.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const { result } = renderHook(() => useMyTools('faculty'), { wrapper });

    expect(result.current.myTools).toBeNull();
    let ok = true;
    await act(async () => { ok = await result.current.pinTool('academy'); });

    expect(ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();

    // Let the in-flight query settle so it can't resolve into a torn-down
    // test and trip an act() warning in the next one.
    await act(async () => { release({ data: null, error: null }); });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('persists nothing after a failed load — and the render fallback still stands', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useMyTools('faculty'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Phase 2 deliberately renders the role defaults after a failed load so
    // the shelf is never blank. That must NOT regress...
    expect(result.current.myTools?.tools).toEqual(DEFAULT_TOOLS_FACULTY);

    // ...but those fabricated defaults must never become a WRITE: pinning
    // here would overwrite the member's real curated record with
    // role-defaults-plus-one and flip setupComplete to true.
    let ok = true;
    await act(async () => { ok = await result.current.pinTool('academy'); });
    expect(ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('appends to the STORED record, preserving widgets and a stored-but-unrendered key', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        // 'tenants' is platform-admin-gated: a real member can hold it in
        // the record while it never renders on the shelf. It must survive.
        nav_item_order: { v: 4, tools: ['tenants', 'calendar'], widgets: ['today'], setupComplete: true },
        home_tile_layout: null,
      },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => { ok = await result.current.pinTool('academy'); });

    expect(ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith('save_nav_item_order', {
      p_nav_item_order: {
        v: 5,
        tools: ['tenants', 'calendar', 'academy'],
        groups: [],
        widgets: ['today'],
        setupComplete: true,
      },
    });
  });

  it('keeps BOTH pins when two land in the same tick', async () => {
    // The render-time-snapshot variant of the same bug: the optimistic
    // setQueryData doesn't reach a closure captured last render, so the
    // second pin used to be computed from the pre-first-pin list and the
    // first key was lost. Reading the cache at call time fixes it.
    maybeSingle.mockResolvedValue({
      data: { nav_item_order: { v: 4, tools: ['calendar'], widgets: [], setupComplete: true }, home_tile_layout: null },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await Promise.all([result.current.pinTool('academy'), result.current.pinTool('finance')]);
    });

    expect(rpc).toHaveBeenCalledTimes(2);
    const first = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[] };
    const second = rpc.mock.calls[1][1].p_nav_item_order as { tools: string[] };
    expect(first.tools).toEqual(['calendar', 'academy']);
    expect(second.tools).toEqual(['calendar', 'academy', 'finance']);
  });

  // pinTool used to resolve false once the record held 8 keys. It no longer
  // does: the cap is gone (2026-08-09), and refusing a pin because the shelf
  // is "long enough" is the app overruling the member about their own nav.
  it('pins a 9th tool rather than refusing at the old cap', async () => {
    const eight = Array.from({ length: 8 }, (_, i) => `k${i}`);
    maybeSingle.mockResolvedValue({
      data: { nav_item_order: { v: 4, tools: eight, widgets: [], setupComplete: true }, home_tile_layout: null },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => { ok = await result.current.pinTool('academy'); });

    expect(ok).toBe(true);
    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[] };
    expect(sent.tools).toEqual([...eight, 'academy']);
  });

  // Round 2 review: `record.tools.includes(resolved)` compared the RESOLVED
  // incoming key against the RAW stored array. A record still holding a
  // retired key ('merch', merged into 'shop' — see MERGED_KEYS in
  // myTools.ts) never contains the literal string 'shop', so
  // pinTool('shop') missed the "already there" check and appended a
  // redundant second entry — ['merch', 'shop'], two keys resolving to the
  // same destination, burning one of the member's eight slots. Unreachable
  // through the shipped UI (useAllToolsCatalog's `pinned` list already runs
  // through resolvedTools, so Store Admin isn't offered as pinnable once
  // 'merch' is stored) but a real latent duplicate reachable the moment
  // MERGED_KEYS gains a second entry or another caller appears.
  it('reports already-pinned (and writes nothing) when the record holds a merged key and the resolved successor is pinned', async () => {
    maybeSingle.mockResolvedValue({
      data: { nav_item_order: { v: 4, tools: ['merch', 'calendar'], widgets: [], setupComplete: true }, home_tile_layout: null },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => { ok = await result.current.pinTool('shop'); });

    expect(ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses to store home — sanitizeTools would strip it and the write would be a no-op', async () => {
    maybeSingle.mockResolvedValue({
      data: { nav_item_order: { v: 4, tools: ['calendar'], widgets: [], setupComplete: true }, home_tile_layout: null },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = true;
    await act(async () => { ok = await result.current.pinTool('home'); });

    expect(ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('loaded', () => {
  it('is false while loading and after a failed load, true once the row is fetched', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result: failed } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(failed.current.loading).toBe(false));
    expect(failed.current.loaded).toBe(false);

    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { result: ok } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(ok.current.loading).toBe(false));
    expect(ok.current.loaded).toBe(true);
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

describe('groups', () => {
  it('a groups-only patch preserves the stored tools', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        nav_item_order: { v: 5, tools: ['calendar'], groups: [], widgets: [], setupComplete: true },
        home_tile_layout: null,
      },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveMyTools({
        groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
      });
    });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { v: number; tools: string[]; groups: ToolGroup[] };
    expect(sent.tools).toEqual(['calendar']);
    expect(sent.groups[0].name).toBe('Sunday');
    expect(sent.v).toBe(5);
  });

  it('a tools-only patch preserves the stored groups', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        nav_item_order: {
          v: 5, tools: ['calendar'], widgets: [], setupComplete: true,
          groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
        },
        home_tile_layout: null,
      },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.saveTools(['calendar', 'messages']); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { groups: ToolGroup[] };
    expect(sent.groups).toHaveLength(1);
  });

  it('deduplicates a key that a patch puts in both loose and a group', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        nav_item_order: { v: 5, tools: [], groups: [], widgets: [], setupComplete: true },
        home_tile_layout: null,
      },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveShelf({
        tools: ['liturgy'],
        groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
      });
    });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[]; groups: ToolGroup[] };
    expect(sent.tools).toEqual(['liturgy']);
    expect(sent.groups[0].tools).toEqual([]);
  });

  it('pinTool lands the new tool loose, above every group', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        nav_item_order: {
          v: 5, tools: ['calendar'], widgets: [], setupComplete: true,
          groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
        },
        home_tile_layout: null,
      },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.pinTool('studio'); });

    const sent = rpc.mock.calls[0][1].p_nav_item_order as { tools: string[]; groups: ToolGroup[] };
    expect(sent.tools).toEqual(['calendar', 'studio']);
    expect(sent.groups[0].tools).toEqual(['liturgy']);
  });

  it('refuses to pin a key that already lives inside a group', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        nav_item_order: {
          v: 5, tools: [], widgets: [], setupComplete: true,
          groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
        },
        home_tile_layout: null,
      },
      error: null,
    });
    const { result } = renderHook(() => useMyTools('student'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok = false;
    await act(async () => { ok = await result.current.pinTool('liturgy'); });

    expect(ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });
});
