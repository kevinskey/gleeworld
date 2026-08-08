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

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    profile: { full_name: 'Kevin', user_id: 'u1', is_admin: false, is_super_admin: false },
    loading: false,
    canEditMusicLibrary: () => false,
  }),
}));
vi.mock('@/hooks/useModuleAccess', () => ({
  useTenantModules: () => ({ data: [], isLoading: false }),
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
vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => ({ myTools: null, loading: false, saveTools: vi.fn() }),
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
vi.mock('@/components/dashboard/HomeTileGrid', () => ({
  HomeTileGrid: () => null,
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
