// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_TOOLS_FACULTY, DEFAULT_TOOLS_STUDENT, type MyTools } from '@/lib/navigation/myTools';

// v5, the only shape parseMyTools/migrateToMyTools emit since Task 1 — and
// TYPED, so a future field change fails here instead of being cast away.
const DEFAULT_MY_TOOLS: MyTools = {
  v: 4, tools: ['calendar', 'academy'], groups: [], widgets: [], setupComplete: true,
};

const h = vi.hoisted(() => ({
  saveMyTools: vi.fn(),
  myTools: {
    v: 4, tools: ['calendar', 'academy'], groups: [], widgets: [], setupComplete: true,
  } as MyTools | null,
  loading: false,
  // useMyTools' "the row genuinely came back" flag — distinct from
  // `loading`/`myTools`: a failed load leaves loading false and myTools
  // holding FABRICATED role defaults (never null), so `myTools != null`
  // alone can't gate the editor. Defaults true here so the existing tests
  // above (which never set it) keep exercising the ready path.
  loaded: true,
  // Per-module override for useModuleAccess; unlisted keys default to true
  // so most tests don't have to enumerate the whole MODULE_KEYS list.
  moduleOverrides: {} as Record<string, boolean>,
  hiddenRoutes: new Set<string>(),
  saveDefaults: vi.fn(),
  defaultsByRole: { admin: [], student: [], member: [] } as { admin: string[]; student: string[]; member: string[] },
}));

vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => ({
    myTools: h.myTools, loading: h.loading, loaded: h.loaded, saveTools: vi.fn(), saveMyTools: h.saveMyTools,
  }),
  WIDGETS_CAP: 2,
}));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ profile: { is_admin: false, role: 'student' }, loading: false, canEditMusicLibrary: () => false }) }));
vi.mock('@/hooks/useModuleAccess', () => ({ useModuleAccess: (key: string) => ({ hasAccess: h.moduleOverrides[key] ?? true }) }));
vi.mock('@/hooks/useTenantNavPrefs', () => ({ useTenantNavPrefs: () => h.hiddenRoutes }));
vi.mock('@/hooks/useEffectivePreviewRole', () => ({ useEffectivePreviewRole: () => null }));
vi.mock('@/hooks/useTenantDefaultTools', () => ({
  useTenantDefaultTools: () => ({ defaultsByRole: h.defaultsByRole, loading: false, saveDefaults: h.saveDefaults }),
}));
// DashboardShell is a NAMED export everywhere else in the repo (see
// HouseHome.tsx and every other /dashboard page) — there is no default
// export on this module. Mocking only `default` would leave the named
// `DashboardShell` import undefined and crash the render.
vi.mock('@/components/dashboard/DashboardShell', () => ({ DashboardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import MyWorldPage from './MyWorldPage';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><MyWorldPage /></MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  h.saveMyTools.mockReset().mockResolvedValue(true);
  h.myTools = { ...DEFAULT_MY_TOOLS, tools: [...DEFAULT_MY_TOOLS.tools] };
  h.loading = false;
  h.loaded = true;
  h.moduleOverrides = {};
  h.hiddenRoutes = new Set<string>();
  h.saveDefaults.mockReset().mockResolvedValue(true);
  h.defaultsByRole = { admin: [], student: [], member: [] };
});

describe('MyWorldPage', () => {
  it('renders the editor seeded from the stored record', () => {
    renderPage();
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^2 tools$/);
  });

  it('saves tools when one is removed', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /remove academy/i }));
    await waitFor(() => expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar'], groups: [] }));
  });

  // MyWorldEditor hands both lists up for one edit. Writing them as two
  // patches would put two RPCs in flight against the same row, the first
  // carrying a half-applied shelf — see the pendingShelf comment on the
  // page. One edit must be one record write.
  it('writes one record patch per edit, not one per list', async () => {
    h.myTools = { v: 4, tools: ['calendar', 'academy'], groups: [], widgets: [], setupComplete: true };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New Group' }));
    await waitFor(() => expect(h.saveMyTools).toHaveBeenCalledTimes(1));
    const patch = h.saveMyTools.mock.calls[0][0];
    expect(patch.tools).toEqual(['calendar', 'academy']);
    expect(patch.groups).toHaveLength(1);
    expect(patch.groups[0]).toMatchObject({ name: 'New Group', tools: [], collapsed: false });
  });

  it('renders the member\'s stored groups and counts their tools', () => {
    h.myTools = {
      v: 4,
      tools: ['calendar'],
      groups: [{ id: 'g1', name: 'Sunday', tools: ['academy'], collapsed: false }],
      widgets: [],
      setupComplete: true,
    };
    renderPage();
    expect(screen.getByTestId('my-world-group-g1')).toBeInTheDocument();
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^2 tools$/);
    // Filing a tool into a group must not drop it from the preview strip —
    // the strip reads out the whole world, not just the loose part.
    expect(within(screen.getByTestId('my-world-preview')).getByText('Academy')).toBeInTheDocument();
  });

  it('offers a widgets group for the viewer role', () => {
    renderPage();
    expect(screen.getByTestId('my-world-widgets')).toBeInTheDocument();
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
      expect(screen.getByTestId('my-world-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('my-world-count')).toBeNull();
      expect(screen.queryByTestId('my-world-widgets')).toBeNull();
      expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /add/i })).toBeNull();
      expect(h.saveMyTools).not.toHaveBeenCalled();
    });

    it('renders no editor when loading has finished but no record exists yet', () => {
      h.loading = false;
      h.myTools = null;
      renderPage();
      expect(screen.getByTestId('my-world-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('my-world-count')).toBeNull();
      expect(h.saveMyTools).not.toHaveBeenCalled();
    });

    it('mounts the editor once loading finishes and the record has landed', () => {
      h.loading = false;
      h.myTools = { ...DEFAULT_MY_TOOLS };
      renderPage();
      expect(screen.queryByTestId('my-world-loading')).toBeNull();
      expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^2 tools$/);
    });
  });

  // Reviewer-proven data-loss bug: useMyTools deliberately falls back to
  // FABRICATED role defaults when the load fails, so the shelf never blanks
  // — but `myTools != null` reads true for that fabricated record exactly
  // like it does for a real one. Gating `ready` on `myTools != null` alone
  // let the editor mount against the fabrication; any edit then called
  // saveMyTools, which fills omitted fields from THAT record and persisted
  // DEFAULT_TOOLS_STUDENT/FACULTY straight over the member's real curated
  // set. `loaded` is the only signal that distinguishes the two cases.
  describe('failed load', () => {
    it('stays in the not-ready state and fires no save when the load failed, even though myTools holds fabricated defaults', () => {
      h.loading = false;
      h.loaded = false;
      h.myTools = { v: 4, tools: [...DEFAULT_TOOLS_STUDENT], groups: [], widgets: [], setupComplete: false };
      renderPage();
      expect(screen.getByTestId('my-world-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('my-world-count')).toBeNull();
      expect(screen.queryByTestId('my-world-widgets')).toBeNull();
      expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /add/i })).toBeNull();
      expect(h.saveMyTools).not.toHaveBeenCalled();
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

  // Bug found by running the app: 'home' carries no gate, so resolveNav
  // returns it like any other entry, and MyWorldEditor offered a ⊕
  // "Command Center" row in MORE TOOLS — but sanitizeTools deliberately
  // drops the 'home' key, so tapping it did nothing. 'home' always
  // renders on the shelf first and is never a choosable tool.
  it('never offers Command Center in MORE TOOLS', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /^add command center$/i })).toBeNull();
  });
});

describe('MyWorldPage — admin defaults mode', () => {
  beforeEach(() => {
    vi.doMock('@/hooks/useUserRole', () => ({
      useUserRole: () => ({ profile: { is_admin: true, role: 'instructor' }, loading: false, canEditMusicLibrary: () => true }),
    }));
  });

  // Every admin-mode test needs a fresh module graph (vi.doMock only
  // takes effect on the next import) and the same render boilerplate.
  const renderAdminPage = async () => {
    vi.resetModules();
    const { default: AdminPage } = await import('./MyWorldPage');
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter><AdminPage /></MemoryRouter>
      </QueryClientProvider>,
    );
  };

  // Radix Tabs' TabsTrigger fires context.onValueChange from its
  // onMouseDown handler, not onClick — fireEvent.click alone dispatches
  // only the 'click' event (no preceding mousedown), so it never actually
  // switches tabs here. fireEvent.mouseDown is what makes the segmented
  // control activate under RTL without pulling in user-event (unused
  // elsewhere in this repo).
  const switchToDefaultsTab = () => {
    fireEvent.mouseDown(screen.getByRole('tab', { name: /defaults for members/i }));
  };

  it('offers a Defaults for members mode to an admin', async () => {
    await renderAdminPage();
    expect(screen.getByRole('tab', { name: /defaults for members/i })).toBeInTheDocument();
  });

  // Review round 1, Important 1: MyWorldPage read `myTools?.tools` raw, not
  // resolvedTools. MyWorldEditor renders any key absent from `available` as
  // an "Unavailable — <key>" row (deliberately, for a TRULY dead key — see
  // its own comment) — a stored 'merch' has no catalog entry anymore, so it
  // rendered that way even though it isn't dead, it merged into 'shop'.
  // Worse, `chosenKeys` (built from the same raw `tools`) never contained
  // 'shop', so "Store Admin" ALSO showed a second time in More Tools as
  // addable — the same tool offered as both unavailable-remove-only and
  // freely-addable at once.
  it('shows a stored "merch" as its live successor "Store Admin", not a dead row or a duplicate', async () => {
    h.myTools = { v: 4, tools: ['merch', 'calendar'], groups: [], widgets: [], setupComplete: true };
    await renderAdminPage();
    const chosen = screen.getByTestId('my-world-chosen');
    expect(chosen).toHaveTextContent('Store Admin');
    expect(screen.queryByTestId('my-world-unavailable')).toBeNull();
    // Not ALSO offered as addable in More Tools — that would mean the
    // resolved key never made it into chosenKeys.
    expect(within(screen.getByTestId('my-world-more')).queryByText('Store Admin')).toBeNull();
  });

  it('never offers Command Center in MORE TOOLS in defaults mode either', async () => {
    await renderAdminPage();
    switchToDefaultsTab();
    expect(screen.queryByRole('button', { name: /^add command center$/i })).toBeNull();
  });

  // Important 1 (review round 1 on Task 5): the ⊕ pool in defaults mode
  // must reflect the ROLE being configured, not the viewing admin. Reusing
  // the admin's own gated list let an admin editing Students' defaults add
  // an adminOnly entry (People, Finance, …) — which then lands in every
  // new student's stored tools, permanently occupying one of their 8
  // slots while their OWN adminOnly gate hides it from them forever:
  // invisible and unremovable on their own My World.
  it('scopes the defaults ⊕ list to the role being configured, not the viewing admin', async () => {
    await renderAdminPage();
    switchToDefaultsTab();
    // Default role picker starts on Students (Minor 4). People and Fees
    // (fees-admin) both carry gate: { adminOnly: true } in the catalog —
    // 'finance' itself is only module-gated, not admin-gated, so it isn't
    // a valid probe here.
    expect(screen.queryByRole('button', { name: /^add people$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^add fees$/i })).toBeNull();
    // Concierge carries no gate at all — it must still be offered.
    expect(screen.getByRole('button', { name: /^add concierge$/i })).toBeInTheDocument();
  });

  // Important 2 (review round 1 on Task 5): nothing previously proved the
  // defaults editor writes through saveDefaults(role, tools) rather than
  // the personal saveMyTools — a miswiring here would silently overwrite
  // the admin's own shelf with a tenant default, or vice versa, and every
  // other test would still pass.
  it('saves through saveDefaults(role, tools), never saveMyTools, when editing defaults', async () => {
    await renderAdminPage();
    switchToDefaultsTab();
    // Unseeded — starts from the platform default for Students.
    fireEvent.click(screen.getByRole('button', { name: /^remove calendar$/i }));
    await waitFor(() => expect(h.saveDefaults).toHaveBeenCalledWith(
      'student',
      DEFAULT_TOOLS_STUDENT.filter((k) => k !== 'calendar'),
    ));
    expect(h.saveMyTools).not.toHaveBeenCalled();
  });

  it('never shows a widgets group in defaults mode', async () => {
    await renderAdminPage();
    switchToDefaultsTab();
    expect(screen.queryByTestId('my-world-widgets')).toBeNull();
  });

  // Phase 1's gw_tenant_nav_prefs.default_tools is still a text[] and cannot
  // carry groups, so the defaults tab omits the group props entirely. A New
  // Group button here would be a dead control: it would arrange something
  // saveDefaults(role, string[]) silently drops.
  it('offers no group UI in defaults mode — the stored shape cannot hold groups', async () => {
    await renderAdminPage();
    switchToDefaultsTab();
    expect(screen.queryByRole('button', { name: 'New Group' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Move / })).toBeNull();
  });

  it('re-seeds the shown list when the role picker changes', async () => {
    await renderAdminPage();
    switchToDefaultsTab();
    // Starts on Students, seeded from DEFAULT_TOOLS_STUDENT.
    const chosen = () => screen.getByTestId('my-world-chosen');
    expect(within(chosen()).getByText('Studio')).toBeInTheDocument();
    expect(within(chosen()).queryByText('People')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^tenant admins$/i }));
    // Switched to admin, re-seeded from DEFAULT_TOOLS_FACULTY.
    expect(within(chosen()).getByText('People')).toBeInTheDocument();
    expect(within(chosen()).queryByText('Studio')).toBeNull();
    // Sanity: the two platform defaults actually differ, or this test
    // would pass by accident.
    expect(DEFAULT_TOOLS_FACULTY).not.toEqual(DEFAULT_TOOLS_STUDENT);
  });
});
