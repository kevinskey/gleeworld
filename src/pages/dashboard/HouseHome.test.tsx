// @vitest-environment jsdom
// Focused regression coverage for the date-card's ensemble_name wiring.
// HouseHome pulls in a lot of dashboard machinery (feed queries, tile
// layout, nav prefs, module flags); everything unrelated to that wiring is
// stubbed so this test isolates the one thing under test: does
// DateCardSlot receive a real ensembleName, sourced from branding settings,
// instead of the hardcoded ''.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { DateCardContext } from '@/components/home/date-card/types';

const brandingOrgName = vi.hoisted(() => ({ current: null as string | null }));
const myFeesResult = vi.hoisted(() => ({
  current: { totalOwed: 0, unpaid: [], paid: [], plans: [], loading: false, refetch: vi.fn() },
}));
// Hoisted so the resolveKeys/getAppTiles wiring tests below can render an
// admin, module-enabled context — every other describe block in this file
// wants the default (non-admin, no modules) and never touches these.
const profileResult = vi.hoisted(() => ({
  current: { full_name: 'Kevin', user_id: 'u1', is_admin: false, is_super_admin: false },
}));
const tenantModulesResult = vi.hoisted(() => ({ current: [] as Array<{ module_id: string }> }));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    profile: profileResult.current,
    loading: false,
    canEditMusicLibrary: () => false,
    isAdmin: () => false,
  }),
}));
vi.mock('@/hooks/useModuleAccess', () => ({
  useTenantModules: () => ({ data: tenantModulesResult.current, isLoading: false }),
}));
// PR #189 gave HouseHome a preview-role hook that reaches useAuth(). This test
// renders the component bare (no AuthProvider), so stub the hook rather than
// wrapping — the preview role is irrelevant to the ensembleName wiring here.
vi.mock('@/hooks/useEffectivePreviewRole', () => ({
  useEffectivePreviewRole: () => null,
  useMyTenantRole: () => ({ data: null, isLoading: false }),
}));
vi.mock('@/hooks/useTenantNavPrefs', () => ({
  useTenantNavPrefs: () => new Set<string>(),
}));
const myToolsResult = vi.hoisted(() => ({
  current: {
    myTools: null as {
      tools: string[]; widgets: string[]; setupComplete?: boolean;
      groups?: Array<{ id: string; name: string; tools: string[]; collapsed: boolean }>;
    } | null,
    loading: false,
    saveTools: vi.fn(),
    saveMyTools: vi.fn(),
    saveShelf: vi.fn(),
  },
}));
vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => myToolsResult.current,
}));
// Spied, not just stubbed: the first-run sheet is the ONLY caller of this
// hook on this page, so "was it called" is exactly "was the sheet mounted".
// See the seam tests at the bottom of this file.
const tenantDefaults = vi.hoisted(() => ({ spy: vi.fn() }));
vi.mock('@/hooks/useTenantDefaultTools', () => ({
  useTenantDefaultTools: () => {
    tenantDefaults.spy();
    return { defaultsByRole: { admin: [], student: [], member: [] }, loading: false, saveDefaults: vi.fn() };
  },
}));
vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({
    settings: { org_name: brandingOrgName.current },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/components/dashboard/HomeNewsRail', () => ({
  HomeNewsRail: () => null,
}));
vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
// Captures the exact props HouseHome hands the grid — bands/overflow
// (getAppTiles' output, partitioned by bandDestinations) and onSave — so the
// resolveKeys/resolvedTools wiring fix (review round 1, Important 1) and the
// grouped-band wiring can be asserted on without rendering dnd-kit's real
// drag machinery. `onSave` is the seam the grid's Done button calls with the
// order the member sees; HomeTileGrid.bands.test.tsx covers the other half
// (real edit mode → that flat order), so calling it here is exercising the
// same contract from the page side.
interface CapturedGridProps {
  bands: Array<{ groupId: string | null; name: string | null; tiles: Array<{ key: string }> }>;
  overflow: Array<{ key: string }>;
  onSave: (order: string[]) => Promise<boolean>;
}
const capturedGridProps = vi.hoisted(() => ({ current: null as CapturedGridProps | null }));
vi.mock('@/components/dashboard/HomeTileGrid', () => ({
  HomeTileGrid: (props: CapturedGridProps) => {
    capturedGridProps.current = props;
    return null;
  },
}));

// Capture exactly the ctx the page hands to the date-card slot — this is
// the contract under test, so render the real registry-resolved card
// straight through a passthrough that just records its props.
const capturedCtx = vi.hoisted(() => ({ current: null as DateCardContext | null }));
vi.mock('@/hooks/useMyFees', () => ({
  useMyFees: () => myFeesResult.current,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
  // The grid asks whether the phone tab bar is on screen before deciding
  // which stored tools it can represent as keycaps.
  useIsCompactNav: () => false,
}));

vi.mock('@/components/home/date-card/DateCardSlot', () => ({
  DateCardSlot: ({ ctx }: { ctx: DateCardContext }) => {
    capturedCtx.current = ctx;
    return null;
  },
}));

function makeQueryBuilder(result: { data: unknown; error: null } = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'order', 'eq', 'is', 'in', 'gte', 'limit', 'maybeSingle', 'single'];
  methods.forEach((m) => {
    builder[m] = vi.fn(() => builder);
  });
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(() => makeQueryBuilder()) },
}));

import HouseHome from './HouseHome';

afterEach(() => {
  cleanup();
  brandingOrgName.current = null;
  capturedCtx.current = null;
  myFeesResult.current = { totalOwed: 0, unpaid: [], paid: [], plans: [], loading: false, refetch: vi.fn() };
  myToolsResult.current = {
    myTools: null, loading: false, saveTools: vi.fn(), saveMyTools: vi.fn(), saveShelf: vi.fn(),
  };
  tenantDefaults.spy.mockClear();
  profileResult.current = { full_name: 'Kevin', user_id: 'u1', is_admin: false, is_super_admin: false };
  tenantModulesResult.current = [];
  capturedGridProps.current = null;
});

function renderHouseHome() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <HouseHome />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HouseHome date-card ensembleName wiring', () => {
  it('passes the branding org_name through as ensembleName when set', () => {
    brandingOrgName.current = 'Concert Choir';
    renderHouseHome();
    expect(capturedCtx.current?.ensembleName).toBe('Concert Choir');
  });

  it('passes an empty string (never a literal placeholder) when org_name is unset', () => {
    brandingOrgName.current = null;
    renderHouseHome();
    expect(capturedCtx.current?.ensembleName).toBe('');
  });

  it('resolves {{ensemble_name}} through dateCardTokenContext once wired, and leaves it literal when absent', async () => {
    const { dateCardTokenContext } = await import('@/components/home/date-card/tokens');
    const { substituteText } = await import('@/lib/planner/templates');

    brandingOrgName.current = 'Concert Choir';
    renderHouseHome();
    const withName = dateCardTokenContext(capturedCtx.current!);
    expect(substituteText('{{ensemble_name}}', withName)).toBe('Concert Choir');

    cleanup();
    brandingOrgName.current = null;
    renderHouseHome();
    const withoutName = dateCardTokenContext(capturedCtx.current!);
    expect(substituteText('{{ensemble_name}}', withoutName)).toBe('{{ensemble_name}}');
  });
});

describe('HouseHome YouOweCard integration', () => {
  it('renders the "You owe" card with formatted amount when totalOwed > 0', () => {
    myFeesResult.current = {
      totalOwed: 25,
      unpaid: [
        { id: 'f1', category: 'tuition', name: 'Tuition', amount: 25, paid_amount: 0,
          due_date: '2026-08-01', status: 'pending', payment_method: null, paid_at: null },
      ],
      paid: [],
      plans: [],
      loading: false,
      refetch: vi.fn(),
    };
    renderHouseHome();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('You owe')).toBeInTheDocument();
    expect(screen.getByText('Pay now →')).toBeInTheDocument();
  });

  it('does not render the "You owe" card when totalOwed is 0', () => {
    myFeesResult.current = { totalOwed: 0, unpaid: [], paid: [], plans: [], loading: false, refetch: vi.fn() };
    renderHouseHome();
    expect(screen.queryByText('You owe')).not.toBeInTheDocument();
  });

  it('does not render while loading', () => {
    myFeesResult.current = { totalOwed: 50, unpaid: [], paid: [], plans: [], loading: true, refetch: vi.fn() };
    renderHouseHome();
    expect(screen.queryByText('You owe')).not.toBeInTheDocument();
  });
});

describe('HouseHome member-chosen widgets (My World, Phase 2)', () => {
  // Profile mocked above is a non-admin, non-faculty role ('student'
  // widgets: 'today' and 'practice-ledger').
  it('renders only the widget the member chose', () => {
    myToolsResult.current = {
      myTools: { tools: [], widgets: ['practice-ledger'] },
      loading: false,
      saveTools: vi.fn(),
      saveMyTools: vi.fn(),
      saveShelf: vi.fn(),
    };
    renderHouseHome();
    expect(screen.getByText('Practice this week')).toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('falls back to both role-default widgets when nothing is stored', () => {
    myToolsResult.current = {
      myTools: null, loading: false, saveTools: vi.fn(), saveMyTools: vi.fn(), saveShelf: vi.fn(),
    };
    renderHouseHome();
    expect(screen.getByText('Practice this week')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders neither widget while the record is still loading (Minor 4: same gate as the keycap grid)', () => {
    myToolsResult.current = {
      myTools: { tools: [], widgets: ['practice-ledger'] },
      loading: true,
      saveTools: vi.fn(),
      saveMyTools: vi.fn(),
      saveShelf: vi.fn(),
    };
    renderHouseHome();
    expect(screen.queryByText('Practice this week')).not.toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });
});

// Final review, Minor 7 + Important 2: nothing covered the seam between
// this page and the first-run sheet. The sheet must open exactly once — for
// a member whose record says setupComplete === false — and must not be
// MOUNTED at all otherwise. Mounting it closed is not free: it seeds its
// draft from the tenant default the moment that query resolves, and
// useUserRole caches nothing while useTenantDefaultTools has a 60s
// staleTime, so a remount inside that window seeds a faculty member with
// the student shelf that every exit path then persists. It also fires a
// gw_tenant_nav_prefs read on every member's home load.
describe('HouseHome ↔ FirstRunSheet seam', () => {
  const setRecord = (setupComplete: boolean, loading = false) => {
    myToolsResult.current = {
      myTools: { tools: ['calendar'], widgets: [], setupComplete },
      loading,
      saveTools: vi.fn(),
      saveMyTools: vi.fn(),
      saveShelf: vi.fn(),
    };
  };

  it('opens the sheet for a brand-new member (setupComplete === false)', () => {
    setRecord(false);
    renderHouseHome();
    expect(screen.getByText('Set up your space')).toBeInTheDocument();
  });

  it('does not open — or even mount — the sheet once setup is complete', () => {
    setRecord(true);
    renderHouseHome();
    expect(screen.queryByText('Set up your space')).not.toBeInTheDocument();
    // Mounted-but-closed would still run the sheet's hooks. It must not.
    expect(tenantDefaults.spy).not.toHaveBeenCalled();
  });

  it('does not mount the sheet while the record is still loading', () => {
    setRecord(false, true);
    renderHouseHome();
    expect(screen.queryByText('Set up your space')).not.toBeInTheDocument();
    expect(tenantDefaults.spy).not.toHaveBeenCalled();
  });
});

// Review round 1, Important 1: HouseHome computed `storedTools` from the
// raw `myTools?.tools` — NOT resolvedTools — so it disagreed with
// `representable` (built from getAppTiles' output, which DOES resolve).
// That mismatch undercounted gridCap by 1 for every merged key still in a
// member's stored record, and made mergeGridOrder treat a merged key as
// "the grid can't show this" even though it demonstrably could, under its
// new name. This exercises the real HouseHome page end to end (not just
// the underlying resolvedTools/getAppTiles functions, which have their own
// direct unit tests) — HomeTileGrid is mocked only enough to capture the
// props HouseHome computes for it, not to fake the resolution itself.
describe('HouseHome keycap grid — resolveKeys/resolvedTools wiring for a merged key', () => {
  it('a stored merged key ("merch") renders as its successor, and no cap is passed to the grid', () => {
    profileResult.current = { full_name: 'Admin', user_id: 'u1', is_admin: true, is_super_admin: false };
    tenantModulesResult.current = [{ module_id: 'store' }];
    myToolsResult.current = {
      myTools: { tools: ['merch'], widgets: [], setupComplete: true },
      loading: false,
      saveTools: vi.fn(),
      saveMyTools: vi.fn(),
      saveShelf: vi.fn(),
    };
    renderHouseHome();
    const grid = capturedGridProps.current;
    expect(grid).not.toBeNull();
    expect([...grid!.bands.flatMap((b) => b.tiles), ...grid!.overflow].map((t) => t.key)).toContain('shop');
    // HouseHome used to compute a `cap` here (8 minus the stored keys with
    // no keycap) and this asserted it came out as 8 rather than the buggy 7.
    // The 8-tool ceiling is gone (product owner, 2026-08-09), so HomeTileGrid
    // takes no `cap` prop at all — assert its ABSENCE, so reintroducing a
    // grid budget has to come back through this test.
    expect(grid).not.toHaveProperty('cap');
  });
});

// The grid is a LOSSY view of the member's record, and it has already
// destroyed data once: it seeded from a filtered `primary` and saved that
// whole, permanently deleting every stored key the grid could not
// represent. mergeGridOrder guards that half. Groups add a second thing the
// grid can destroy — the member's FILING — because the grid speaks a flat
// order. So a grid edit must merge AND re-split, and saving the flat draft
// is exactly the lossy write that cost this feature a review round.
describe('HouseHome keycap grid — a grid edit never flattens the member groups', () => {
  const setShelf = () => {
    const saveShelf = vi.fn().mockResolvedValue(true);
    myToolsResult.current = {
      myTools: {
        tools: ['calendar', 'messages'],
        groups: [{ id: 'a', name: 'Sunday', tools: ['academy'], collapsed: false }],
        widgets: [],
        setupComplete: true,
      },
      loading: false,
      saveTools: vi.fn(),
      saveMyTools: vi.fn(),
      saveShelf,
    };
    return saveShelf;
  };

  it('hands the grid loose tiles first, then a band per group', () => {
    setShelf();
    renderHouseHome();
    const bands = capturedGridProps.current!.bands;
    expect(bands.map((b) => b.name)).toEqual([null, 'Sunday']);
    expect(bands[0].tiles.map((t) => t.key)).toEqual(['calendar', 'messages']);
    expect(bands[1].tiles.map((t) => t.key)).toEqual(['academy']);
  });

  it('re-splits a grid save back into loose + groups instead of saving the flat order', async () => {
    const saveShelf = setShelf();
    renderHouseHome();
    // What the grid hands back after the member removes the Calendar keycap.
    await capturedGridProps.current!.onSave(['messages', 'academy']);
    const saved = saveShelf.mock.calls.at(-1)![0];
    expect(saved.groups).toHaveLength(1);
    expect(saved.groups[0].tools).toEqual(['academy']);
    expect(saved.tools).toEqual(['messages']);
  });

  it('saves through saveShelf, never through the flat saveTools', async () => {
    const saveShelf = setShelf();
    renderHouseHome();
    await capturedGridProps.current!.onSave(['calendar', 'messages', 'academy']);
    expect(saveShelf).toHaveBeenCalledTimes(1);
    expect(myToolsResult.current.saveTools).not.toHaveBeenCalled();
  });

  it('drops the band, but never the filing, when every tool in it is gated off', async () => {
    // Finance's module is off for this viewer, so it has no keycap and the
    // band is dropped — no heading over nothing. The grid cannot speak for
    // that key either: mergeGridOrder carries it through, and the re-split
    // must put it back in its group rather than stranding it in loose.
    const saveShelf = vi.fn().mockResolvedValue(true);
    tenantModulesResult.current = [];
    myToolsResult.current = {
      myTools: {
        tools: ['calendar'],
        groups: [{ id: 'a', name: 'Sunday', tools: ['finance'], collapsed: false }],
        widgets: [],
        setupComplete: true,
      },
      loading: false,
      saveTools: vi.fn(),
      saveMyTools: vi.fn(),
      saveShelf,
    };
    renderHouseHome();
    expect(capturedGridProps.current!.bands.map((b) => b.name)).toEqual([null]);
    await capturedGridProps.current!.onSave(['calendar']);
    const saved = saveShelf.mock.calls.at(-1)![0];
    expect(saved.tools).toEqual(['calendar']);
    expect(saved.groups[0].tools).toEqual(['finance']);
  });

  it('persists a reorder made inside a band', async () => {
    const saveShelf = vi.fn().mockResolvedValue(true);
    myToolsResult.current = {
      myTools: {
        tools: ['calendar'],
        groups: [{ id: 'a', name: 'Sunday', tools: ['academy', 'part-tracks'], collapsed: false }],
        widgets: [],
        setupComplete: true,
      },
      loading: false,
      saveTools: vi.fn(),
      saveMyTools: vi.fn(),
      saveShelf,
    };
    renderHouseHome();
    // The two Sunday keycaps swapped; a filter-in-place save would drop this
    // back to the stored order on the next render.
    await capturedGridProps.current!.onSave(['calendar', 'part-tracks', 'academy']);
    const saved = saveShelf.mock.calls.at(-1)![0];
    expect(saved.groups[0].tools).toEqual(['part-tracks', 'academy']);
  });
});
