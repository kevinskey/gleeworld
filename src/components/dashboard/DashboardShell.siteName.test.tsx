// @vitest-environment jsdom
//
// The public Header block has a "Show site name" toggle. When a tenant turns
// it OFF there, the workspace chrome mirrors it: the Command Center sidebar,
// collapsed-topbar brand, and mobile drawer drop the name and let the logo
// (or monogram) carry the brand. When the toggle is on — or the tenant has no
// public site at all — nothing changes.
//
// Sidebar/MobileNav are rendered for real (same harness as
// DashboardShell.shelf.test.tsx); useHideSiteName is the mocked seam, and its
// own showSiteName extraction is covered here via publicSiteHidesSiteName.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

const { useHideSiteNameMock } = vi.hoisted(() => ({
  useHideSiteNameMock: vi.fn(() => false),
}));

// A real tenant slug (not 'main'): on 'main', platformLogoFor substitutes the
// GleeWorld platform logo when branding has none, and the open sidebar then
// shows no name at all regardless of the toggle under test.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
  getTenantSlug: () => 'lyke-house',
}));
vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({
    settings: { org_name: 'The Lyke House', short_name: 'The Lyke House', logo_url: null },
  }),
}));
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    profile: { is_admin: true, is_super_admin: false, role: 'admin' },
    loading: false,
    canEditMusicLibrary: () => true,
  }),
}));
vi.mock('@/hooks/useModuleAccess', () => ({
  useModuleAccess: () => ({ hasAccess: true }),
}));
vi.mock('@/hooks/useTenantNavPrefs', () => ({
  // Same module as useTenantNavPrefs — a preview reads the tenant's
  // configured role defaults from the row that query already fetched.
  useTenantRoleDefaults: () => null,
  useTenantNavPrefs: () => new Set<string>(),
}));
vi.mock('@/hooks/useEffectivePreviewRole', () => ({
  useEffectivePreviewRole: () => null,
  useMyTenantRole: () => null,
}));
vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => ({
    myTools: { v: 4, tools: ['calendar'], groups: [], widgets: [], setupComplete: true },
    loading: false,
    loaded: true,
    saveTools: vi.fn(),
    saveMyTools: vi.fn(),
  }),
}));
// Keep the real publicSiteHidesSiteName — it is under test below; only the
// query-wrapping hook is stubbed.
vi.mock('@/hooks/useHideSiteName', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useHideSiteName')>()),
  useHideSiteName: useHideSiteNameMock,
}));

import { Sidebar, MobileNav } from './DashboardShell';
import { publicSiteHidesSiteName } from '@/hooks/useHideSiteName';

afterEach(() => {
  cleanup();
  useHideSiteNameMock.mockReturnValue(false);
});

describe('Sidebar — public "Show site name" toggle mirrors into the chrome', () => {
  it('shows the tenant name when the public page keeps it', () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar onOpenAllTools={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('The Lyke House')).toBeInTheDocument();
  });

  it('drops the tenant name when the public page removed it', () => {
    useHideSiteNameMock.mockReturnValue(true);
    render(<MemoryRouter initialEntries={['/dashboard']}><Sidebar onOpenAllTools={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText('The Lyke House')).not.toBeInTheDocument();
    // The nav itself must survive — only the name goes.
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});

describe('MobileNav — same mirror in the drawer header', () => {
  it('shows the tenant name when the public page keeps it', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileNav onNavigate={() => {}} onOpenAllTools={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText('The Lyke House')).toBeInTheDocument();
  });

  it('drops the tenant name when the public page removed it', () => {
    useHideSiteNameMock.mockReturnValue(true);
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileNav onNavigate={() => {}} onOpenAllTools={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('The Lyke House')).not.toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});

describe('publicSiteHidesSiteName — only an explicit OFF hides the name', () => {
  const header = (config?: { showSiteName?: boolean }) => ({
    blocks: [{ block_type: 'header', config }],
  });

  it('hides only when the Header block says showSiteName: false', () => {
    expect(publicSiteHidesSiteName(header({ showSiteName: false }))).toBe(true);
  });

  it('keeps the name for every other shape', () => {
    expect(publicSiteHidesSiteName(header({ showSiteName: true }))).toBe(false);
    expect(publicSiteHidesSiteName(header({}))).toBe(false); // toggle never touched
    expect(publicSiteHidesSiteName(header(undefined))).toBe(false);
    expect(publicSiteHidesSiteName({ blocks: [] })).toBe(false); // no header block
    expect(publicSiteHidesSiteName(null)).toBe(false); // no public site / RPC error
    expect(publicSiteHidesSiteName(undefined)).toBe(false); // query not resolved yet
  });
});
