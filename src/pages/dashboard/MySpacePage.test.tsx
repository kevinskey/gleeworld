// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const DEFAULT_MY_TOOLS = { v: 4, tools: ['calendar', 'academy'], widgets: [], setupComplete: true };

const h = vi.hoisted(() => ({
  saveMyTools: vi.fn(),
  myTools: { v: 4, tools: ['calendar', 'academy'], widgets: [], setupComplete: true } as unknown,
  loading: false,
  // Per-module override for useModuleAccess; unlisted keys default to true
  // so most tests don't have to enumerate the whole MODULE_KEYS list.
  moduleOverrides: {} as Record<string, boolean>,
  hiddenRoutes: new Set<string>(),
}));

vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => ({ myTools: h.myTools, loading: h.loading, saveTools: vi.fn(), saveMyTools: h.saveMyTools }),
  WIDGETS_CAP: 2,
}));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ profile: { is_admin: false, role: 'student' }, loading: false, canEditMusicLibrary: () => false }) }));
vi.mock('@/hooks/useModuleAccess', () => ({ useModuleAccess: (key: string) => ({ hasAccess: h.moduleOverrides[key] ?? true }) }));
vi.mock('@/hooks/useTenantNavPrefs', () => ({ useTenantNavPrefs: () => h.hiddenRoutes }));
vi.mock('@/hooks/useEffectivePreviewRole', () => ({ useEffectivePreviewRole: () => null }));
vi.mock('@/hooks/useTenantDefaultTools', () => ({ useTenantDefaultTools: () => ({ defaultsByRole: { admin: [], student: [], member: [] }, loading: false, saveDefaults: vi.fn() }) }));
// DashboardShell is a NAMED export everywhere else in the repo (see
// HouseHome.tsx and every other /dashboard page) — there is no default
// export on this module. Mocking only `default` would leave the named
// `DashboardShell` import undefined and crash the render.
vi.mock('@/components/dashboard/DashboardShell', () => ({ DashboardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import MySpacePage from './MySpacePage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MySpacePage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  h.saveMyTools.mockReset().mockResolvedValue(true);
  h.myTools = { ...DEFAULT_MY_TOOLS, tools: [...DEFAULT_MY_TOOLS.tools] };
  h.loading = false;
  h.moduleOverrides = {};
  h.hiddenRoutes = new Set<string>();
});

describe('MySpacePage', () => {
  it('renders the editor seeded from the stored record', () => {
    renderPage();
    expect(screen.getByTestId('my-space-count')).toHaveTextContent('2 of 8');
  });

  it('saves tools when one is removed', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /remove academy/i }));
    await waitFor(() => expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar'] }));
  });

  it('offers a widgets group for the viewer role', () => {
    renderPage();
    expect(screen.getByTestId('my-space-widgets')).toBeInTheDocument();
  });

  it('does not offer a "Defaults for members" mode to a non-admin', () => {
    renderPage();
    expect(screen.queryByRole('tab', { name: /defaults for members/i })).toBeNull();
  });

  // Important 1 (review round 1): while the record is still in flight,
  // myTools is null. useMyTools.saveMyTools fills any field the caller
  // omits from the CURRENT record — so a widget toggle fired while
  // myTools is null would persist `tools: []` over whatever the member
  // actually has stored. The editor must not mount (no handler to fire)
  // until the record has landed.
  describe('loading gate', () => {
    it('renders no editor and saves nothing while the record is still loading', () => {
      h.loading = true;
      h.myTools = null;
      renderPage();
      expect(screen.getByTestId('my-space-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('my-space-count')).toBeNull();
      expect(screen.queryByTestId('my-space-widgets')).toBeNull();
      expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /add/i })).toBeNull();
      expect(h.saveMyTools).not.toHaveBeenCalled();
    });

    it('renders no editor when loading has finished but no record exists yet', () => {
      h.loading = false;
      h.myTools = null;
      renderPage();
      expect(screen.getByTestId('my-space-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('my-space-count')).toBeNull();
      expect(h.saveMyTools).not.toHaveBeenCalled();
    });

    it('mounts the editor once loading finishes and the record has landed', () => {
      h.loading = false;
      h.myTools = { ...DEFAULT_MY_TOOLS };
      renderPage();
      expect(screen.queryByTestId('my-space-loading')).toBeNull();
      expect(screen.getByTestId('my-space-count')).toHaveTextContent('2 of 8');
    });
  });

  // Important 2 (review round 1): the ⊕ list is the highest-stakes surface
  // on this page — offering a destination the member cannot open is a bug.
  // Every gate applies() must actually narrow the pool: module access,
  // tenant-hidden routes, and admin-only entries for a non-admin profile.
  it('gates the ⊕ list on modules, hidden routes, and admin-only entries — never offers what the member cannot open', () => {
    h.moduleOverrides = { finance: false }; // module switched off for this tenant
    h.hiddenRoutes = new Set(['/dashboard/messenger']); // admin hid Messages via Workspace Settings
    // profile.is_admin is false (see useUserRole mock above), so an
    // adminOnly entry (People) must also stay excluded.
    renderPage();
    expect(screen.queryByRole('button', { name: /^add finance$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^add messages$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^add people$/i })).toBeNull();
    // Concierge carries no gate at all — it must still be offered.
    expect(screen.getByRole('button', { name: /^add concierge$/i })).toBeInTheDocument();
  });
});
