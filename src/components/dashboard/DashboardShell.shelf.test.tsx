// @vitest-environment jsdom
//
// Regression guards for the Task 4 code review's round 2 findings:
//
//   I2 — `if (!homeEntry) return null` in Sidebar/MobileNav blanked the
//        WHOLE nav whenever Home was hidden (Workspace Settings →
//        Navigation), not just the Home row. NavShelf.test.tsx already
//        covers NavShelf's own `home?` handling; this file covers the
//        thing that test structurally cannot: that Sidebar/MobileNav
//        themselves don't reinstate that early return.
//
//   Shelf-blanks-on-navigation — DashboardShell mounts fresh on every
//        route (111 usages in App.tsx, not a persistent layout) and
//        useUserRole caches nothing, so `roleLoading` is true on every
//        navigation, not just first load. Gating shelfTools on
//        `roleLoading ? [] : ...` therefore blanked the shelf on every
//        route change for members whose tools were already known. The fix
//        only withholds the role-specific guess while genuinely unsure
//        (no confirmed `setupComplete` record yet) and shows the
//        role-invariant core instead of nothing even then.
//
// Sidebar/MobileNav are exported from DashboardShell.tsx specifically for
// this file — see the export comments there for why (same rationale as
// BrandLogo's export for DashboardShell.brand.test.tsx).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import type { MyTools } from '@/lib/navigation/myTools';

const { useUserRoleMock, useMyToolsMock, useTenantNavPrefsMock } = vi.hoisted(() => ({
  useUserRoleMock: vi.fn(),
  useMyToolsMock: vi.fn(),
  useTenantNavPrefsMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
  getTenantSlug: () => 'main',
}));
vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: null }),
}));
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: useUserRoleMock,
}));
vi.mock('@/hooks/useModuleAccess', () => ({
  useModuleAccess: () => ({ hasAccess: true }),
}));
vi.mock('@/hooks/useTenantNavPrefs', () => ({
  useTenantNavPrefs: useTenantNavPrefsMock,
}));
vi.mock('@/hooks/useEffectivePreviewRole', () => ({
  useEffectivePreviewRole: () => null,
  useMyTenantRole: () => null,
}));
vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: useMyToolsMock,
}));

import { Sidebar, MobileNav } from './DashboardShell';

const adminProfile = { is_admin: true, is_super_admin: false, role: 'admin' };

function setup({
  hiddenRoutes = new Set<string>(),
  roleLoading = false,
  myTools = { v: 4, tools: ['calendar', 'messages', 'finance'], groups: [], widgets: [], setupComplete: true } as MyTools,
  // useMyTools' "the row genuinely came back" flag. Sidebar/MobileNav don't
  // read it at all — they render whatever `myTools` holds regardless — so
  // it defaults true here purely to match the hook's real shape; see the
  // "failed load" describe block below for the case that actually exercises
  // it being false.
  loaded = true,
}: {
  hiddenRoutes?: Set<string>;
  roleLoading?: boolean;
  myTools?: MyTools | null;
  loaded?: boolean;
} = {}) {
  useUserRoleMock.mockReturnValue({
    profile: adminProfile,
    loading: roleLoading,
    canEditMusicLibrary: () => true,
  });
  useTenantNavPrefsMock.mockReturnValue(hiddenRoutes);
  useMyToolsMock.mockReturnValue({ myTools, loading: false, loaded, saveTools: vi.fn(), saveMyTools: vi.fn() });
}

afterEach(cleanup);

describe('Sidebar — I2: a hidden Home must not blank the whole nav', () => {
  it('still renders the rest of the shelf when hiddenRoutes removes Home', () => {
    setup({ hiddenRoutes: new Set(['/dashboard']) });
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar onOpenAllTools={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText('Command Center')).not.toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('renders Home normally when it is not hidden', () => {
    setup();
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar onOpenAllTools={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('Command Center')).toBeInTheDocument();
  });
});

describe('MobileNav — I2: a hidden Home must not blank the whole drawer', () => {
  it('still renders the rest of the shelf when hiddenRoutes removes Home', () => {
    setup({ hiddenRoutes: new Set(['/dashboard']) });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileNav onNavigate={() => {}} onOpenAllTools={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Command Center')).not.toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});

describe('Sidebar — shelf must not blank on every route change', () => {
  it('renders the confirmed shelf immediately even while roleLoading is true', () => {
    // Simulates: member navigates to a new route. DashboardShell remounts,
    // useUserRole resets to loading, but useMyTools already has this
    // member's REAL, confirmed record (setupComplete: true) — cached by
    // uid, unaffected by the role guess resetting.
    setup({
      roleLoading: true,
      myTools: { v: 4, tools: ['finance', 'people'], groups: [], widgets: [], setupComplete: true },
    });
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar onOpenAllTools={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  it('renders the role-invariant core, not a blank shelf, while genuinely unresolved', () => {
    // No confirmed record yet (setupComplete: false — the role-guessed
    // DEFAULT_TOOLS_STUDENT/FACULTY fallback) AND role itself unresolved.
    // Must not show the (possibly wrong) guessed tools, but must not go
    // blank either.
    setup({
      roleLoading: true,
      myTools: { v: 4, tools: ['sight', 'studio', 'my-fees'], groups: [], widgets: [], setupComplete: false },
    });
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar onOpenAllTools={vi.fn()} /></MemoryRouter>);
    // The unresolved guess's student-only tools must not leak through...
    expect(screen.queryByText('Reading Music')).not.toBeInTheDocument();
    expect(screen.queryByText('Studio')).not.toBeInTheDocument();
    // ...but the role-invariant core (present for either role) does render.
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Music Library')).toBeInTheDocument();
    expect(screen.getByText('Academy')).toBeInTheDocument();
    expect(screen.getByText('Part Tracks')).toBeInTheDocument();
  });

  it('renders nothing role-specific when there is no data at all yet (myTools null) and role is loading', () => {
    setup({ roleLoading: true, myTools: null });
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar onOpenAllTools={vi.fn()} /></MemoryRouter>);
    // Home always renders; the core still renders even with zero data,
    // because it doesn't depend on myTools at all.
    expect(screen.getByText('Command Center')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});

describe('Sidebar — failed load must still render the shelf', () => {
  // useMyTools deliberately falls back to FABRICATED role defaults when the
  // load fails rather than throwing (loaded: false, myTools: the fallback
  // record, never null) — specifically so the shelf is never blank. The
  // MyWorldPage fix that gates its editor on `loaded` touches only that
  // page's own write path; it must not change what Sidebar renders for the
  // exact same failed-load record.
  it('still renders the shelf from the fabricated fallback record when loaded is false', () => {
    setup({
      loaded: false,
      myTools: { v: 4, tools: ['finance', 'people'], groups: [], widgets: [], setupComplete: false },
    });
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar onOpenAllTools={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
  });
});
