// @vitest-environment jsdom
//
// Task 3: the shelf's All Tools row opens AllToolsSheet instead of an
// in-shelf disclosure, and a single global ⌘K/Ctrl+K opens the same sheet
// — registered once in DashboardShell, not once per nav surface, so a
// phone user (Sidebar hidden, MobileNav living inside its own closed Sheet
// drawer) never ends up with two independent sheets.
//
// Mocks the shell's hooks the same way DashboardShell.shelf.test.tsx does
// (useUserRole, useModuleAccess, useTenantNavPrefs, useEffectivePreviewRole,
// useMyTools, useBrandingSettings, the supabase client) plus everything
// else the FULL shell pulls in that shelf.test.tsx never needed because it
// renders Sidebar/MobileNav standalone: auth, messenger, notifications,
// tenant switcher, and the assistant/trial/tour/bottom-nav chrome are all
// stubbed to trivial stand-ins so this file stays focused on the ⌘K/sheet
// wiring instead of re-deriving every one of those subsystems' own tests.
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import type { MyTools } from '@/lib/navigation/myTools';

const {
  useUserRoleMock, useMyToolsMock, useTenantNavPrefsMock, saveMyToolsMock, pinToolMock, useEffectivePreviewRoleMock,
} = vi.hoisted(() => ({
  useUserRoleMock: vi.fn(),
  useMyToolsMock: vi.fn(),
  useTenantNavPrefsMock: vi.fn(),
  saveMyToolsMock: vi.fn(),
  pinToolMock: vi.fn(),
  useEffectivePreviewRoleMock: vi.fn(),
}));

// ── Same mock block as DashboardShell.shelf.test.tsx ───────────────────────
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
  useEffectivePreviewRole: useEffectivePreviewRoleMock,
  useMyTenantRole: () => null,
}));
vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: useMyToolsMock,
}));

// ── Extra mocks the full DashboardShell needs beyond Sidebar/MobileNav ────
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, signOut: vi.fn() }),
}));
vi.mock('@/contexts/MessengerContext', () => ({
  useMessenger: () => ({ toggleMessenger: vi.fn() }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ userProfile: null }),
}));
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
}));
vi.mock('@/hooks/useMyTenants', () => ({
  useMyTenants: () => ({ data: [] }),
  tenantHomeUrl: (slug: string) => `https://${slug}.gleeworld.org`,
  tenantSwitchUrl: (slug: string) => `https://${slug}.gleeworld.org`,
  performTenantSwitch: vi.fn(),
}));
// Chrome not under test here — trivial stand-ins so this file stays scoped
// to the ⌘K/sheet wiring rather than re-deriving each subsystem's own tests.
vi.mock('@/components/dashboard/TrialBanner', () => ({ TrialBanner: () => null }));
vi.mock('@/components/dashboard/PermissionSlipBell', () => ({ PermissionSlipBell: () => null }));
vi.mock('@/components/navigation/MobileBottomNav', () => ({ MobileBottomNav: () => null }));
vi.mock('@/components/tour/ProductTour', () => ({ ProductTour: () => null }));
vi.mock('@/components/feedback/ReportBugDialog', () => ({ ReportBugDialog: () => null }));
vi.mock('@/lib/assistant/AssistantProvider', () => ({
  AssistantProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/assistant/AssistantFab', () => ({ AssistantFab: () => null }));
vi.mock('@/components/assistant/AssistantMiniPlayer', () => ({ AssistantMiniPlayer: () => null }));
vi.mock('@/components/assistant/AssistantSheet', () => ({ AssistantSheet: () => null }));

import { DashboardShell } from './DashboardShell';

const adminProfile = { is_admin: true, is_super_admin: false, role: 'admin' };

// jsdom implements neither ResizeObserver nor Element.scrollIntoView, and
// cmdk's CommandList/CommandItem (inside AllToolsSheet) need both at mount.
// Scoped to this file only — see AllToolsSheet.test.tsx's identical block
// for why a global stub was tried and reverted.
let restoreResizeObserver: (() => void) | undefined;
let restoreScrollIntoView: (() => void) | undefined;

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).ResizeObserver = ResizeObserverStub;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    restoreResizeObserver = () => { delete (globalThis as any).ResizeObserver; };
  }
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
    restoreScrollIntoView = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (Element.prototype as any).scrollIntoView;
    };
  }
});

afterAll(() => {
  restoreResizeObserver?.();
  restoreScrollIntoView?.();
});

afterEach(cleanup);

// Without this, the pin tests read mock.calls[0] out of a mock that carries
// every earlier test's calls too — correct only for as long as they happen
// to run first.
beforeEach(() => {
  saveMyToolsMock.mockClear();
  pinToolMock.mockClear();
  pinToolMock.mockResolvedValue(true);
});

function setup({
  myTools = { v: 4, tools: ['calendar', 'messages', 'finance'], groups: [], widgets: [], setupComplete: true } as MyTools,
  // `loaded` is useMyTools' "the row genuinely came back" flag, distinct
  // from `loading`: it is false while loading AND after a failed load, and
  // it is what gates every ⊕ in the sheet.
  loaded = true,
  previewRole = null,
}: { myTools?: MyTools | null; loaded?: boolean; previewRole?: 'admin' | 'student' | 'member' | null } = {}) {
  useUserRoleMock.mockReturnValue({
    profile: adminProfile,
    loading: false,
    isAdmin: () => true,
    canEditMusicLibrary: () => true,
  });
  useTenantNavPrefsMock.mockReturnValue(new Set<string>());
  useMyToolsMock.mockReturnValue({
    myTools,
    loading: false,
    loaded,
    saveTools: vi.fn(),
    saveMyTools: saveMyToolsMock,
    pinTool: pinToolMock,
  });
  useEffectivePreviewRoleMock.mockReturnValue(previewRole);
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardShell>
        <div>page content</div>
      </DashboardShell>
    </MemoryRouter>,
  );
}

describe('All Tools ⌘K', () => {
  it('opens the sheet on Cmd+K', async () => {
    setup();
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());
  });

  it('opens on Ctrl+K too', async () => {
    setup();
    renderShell();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());
  });

  it('does NOT hijack Cmd+K while focus is in a text field', () => {
    setup();
    renderShell();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByPlaceholderText(/search all tools/i)).toBeNull();
    input.remove();
  });

  it('does NOT hijack Cmd+K while focus is in a textarea', () => {
    setup();
    renderShell();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByPlaceholderText(/search all tools/i)).toBeNull();
    textarea.remove();
  });

  it('does NOT hijack Cmd+K while focus is inside a contenteditable region', () => {
    // jsdom does not implement the `isContentEditable` IDL attribute (it
    // reads back `undefined` even on an element with the `contenteditable`
    // attribute set) — the guard reads the `contenteditable` DOM attribute
    // via `closest()` instead, specifically so this is provable here. Focus
    // lands on a DESCENDANT of the editable root (a span inside the div),
    // matching how a real rich-text editor's caret/selection anchor works,
    // to prove `closest()` — not just an exact-element check — is doing the
    // work.
    setup();
    renderShell();
    const root = document.createElement('div');
    root.setAttribute('contenteditable', 'true');
    root.tabIndex = -1;
    const inner = document.createElement('span');
    inner.tabIndex = -1;
    root.appendChild(inner);
    document.body.appendChild(root);
    inner.focus();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByPlaceholderText(/search all tools/i)).toBeNull();
    root.remove();
  });

  it('DOES fire over a contenteditable="false" region (explicitly non-editable)', async () => {
    setup();
    renderShell();
    const root = document.createElement('div');
    root.setAttribute('contenteditable', 'false');
    root.tabIndex = -1;
    document.body.appendChild(root);
    root.focus();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());
    root.remove();
  });

  it('renders exactly one sheet even though both nav surfaces exist', async () => {
    setup();
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getAllByPlaceholderText(/search all tools/i)).toHaveLength(1));
  });

  it('removes the key handler on unmount', () => {
    // A DOM-disappears-after-unmount assertion proves nothing here — the
    // sheet would be gone whether or not the listener leaked, since
    // unmounting clears the whole tree regardless. Spy on window's real
    // (un-jsdom-mocked) add/removeEventListener and assert the net
    // 'keydown' registrations are balanced after unmount: every 'keydown'
    // listener this render added (DashboardShell's own ⌘K handler, plus
    // anything else mounted alongside it) must have a matching removal.
    setup();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderShell();
    const keydownAdds = addSpy.mock.calls.filter(([type]) => type === 'keydown').length;
    expect(keydownAdds).toBeGreaterThan(0);
    unmount();
    const keydownRemoves = removeSpy.mock.calls.filter(([type]) => type === 'keydown').length;
    expect(keydownRemoves).toBe(keydownAdds);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('All Tools — the shell delegates the append, it never computes one', () => {
  // The whole append lives in useMyTools.pinTool, over the cache-fresh
  // record (see useMyTools.test.tsx for the appends themselves). What
  // belongs here is the wiring: the shell hands the sheet the bare key and
  // does NOT reconstruct a tools array from its own render-time state —
  // which is what wrote {tools:['academy']} over a member's whole record
  // whenever the sheet was opened before the query resolved.
  it('hands the raw key to pinTool and computes no list of its own', async () => {
    setup({
      // 'tenants' is platformAdminOnly and adminProfile is not a platform
      // admin, so this key is stored but never renders — an append computed
      // from the rendered shelf would silently drop it.
      myTools: { v: 4, tools: ['tenants', 'calendar'], groups: [], widgets: [], setupComplete: true },
    });
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /pin academy to your world/i }));

    await waitFor(() => expect(pinToolMock).toHaveBeenCalledWith('academy'));
    expect(pinToolMock).toHaveBeenCalledTimes(1);
    // No shell-side write path at all — saveMyTools is not the pin route.
    expect(saveMyToolsMock).not.toHaveBeenCalled();
  });

  it('offers no ⊕ at all until a record has genuinely loaded', async () => {
    // myTools null + loaded false is the real first-paint state: both doors
    // into the sheet (the shelf row and ⌘K) are live from first paint, and
    // pinTool refuses in this state. Offering a control that can only fail
    // is the "tap silently does nothing" shape the plan forbids.
    setup({ myTools: null, loaded: false });
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());

    expect(screen.queryByRole('button', { name: /pin .* to your world/i })).toBeNull();
    // The rows are still there and still navigable — this withholds the pin,
    // not the catalog.
    expect(screen.getByText('Academy')).toBeInTheDocument();
  });

  it('offers ⊕ again once the record is loaded (control for the test above)', async () => {
    setup({ loaded: true });
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /pin academy to your world/i })).toBeInTheDocument();
  });
});

describe('All Tools — Command Center is never offered as a pin target', () => {
  // `available` is resolveNav's full output, which includes the 'home'
  // entry. It used to render a working "Pin Command Center to your world"
  // button whose write sanitizeTools stripped: the RPC succeeded, onPin
  // resolved true, no toast fired, the badge stayed ⊕, and nothing changed.
  it('renders Home with the non-pinnable affordance and never calls pinTool for it', async () => {
    setup();
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());

    // Scoped to the sheet's own subtree: 'Command Center' also labels the
    // Home row on each of the two nav surfaces, so an unscoped query is
    // ambiguous and would pass for the wrong element.
    const sheet = within(document.querySelector('[data-all-tools-sheet]') as HTMLElement);
    const homeRow = sheet.getByText('Command Center').closest('[cmdk-item]') as HTMLElement;
    expect(homeRow).not.toBeNull();
    // The non-pinnable affordance, exactly as an already-placed tool reads.
    expect(within(homeRow).getByText('In your world')).toBeInTheDocument();
    expect(within(homeRow).queryByRole('button')).toBeNull();
    expect(screen.queryByRole('button', { name: /pin command center to your world/i })).toBeNull();
    expect(pinToolMock).not.toHaveBeenCalled();
  });

});

// Review round 1, Important 1: useAllToolsCatalog's `pinned` prop came from
// the raw `myTools?.tools`, not resolveKeys/resolvedTools — the same class
// of bug HouseHome's keycap grid had. A stored 'merch' (the retired key
// that merged into 'shop', 2026-08-09) never matched AllToolsSheet's
// `pinnedSet.has(entry.key)` check (the catalog only has 'shop' now), so
// the sheet offered "Store Admin" as pinnable even though the member
// already effectively had it — and, per the test above proving pinTool
// resolves what it's given, tapping ⊕ there would have appended a second,
// redundant 'shop' onto the record.
describe('All Tools — a stored merged key is recognized as already pinned under its live name', () => {
  it('shows "Store Admin" as already-in-your-space when the record still says "merch"', async () => {
    setup({ myTools: { v: 4, tools: ['calendar', 'merch'], groups: [], widgets: [], setupComplete: true } });
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());

    const sheet = within(document.querySelector('[data-all-tools-sheet]') as HTMLElement);
    const storeAdminRow = sheet.getByText('Store Admin').closest('[cmdk-item]') as HTMLElement;
    expect(storeAdminRow).not.toBeNull();
    expect(within(storeAdminRow).getByText('In your world')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pin store admin to your world/i })).toBeNull();
  });
});

describe('All Tools — Command Center is never offered as a pin target (search)', () => {
  it('still reaches Home by search, so ⌘K → "command" is not a dead end', async () => {
    setup();
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/search all tools/i), { target: { value: 'command' } });

    const sheet = within(document.querySelector('[data-all-tools-sheet]') as HTMLElement);
    await waitFor(() => expect(sheet.getByText('Command Center')).toBeInTheDocument());
  });
});

describe('All Tools — preview role narrowing is actually applied', () => {
  // applyPreviewRole itself is well covered in isolation (previewRole.
  // test.ts / navCatalog's own tests) — what's uncovered anywhere is that
  // useGatedNav (DashboardShell.tsx) actually CALLS it. Every other test in
  // this file mocks useEffectivePreviewRole to return null, and
  // applyPreviewRole(ctx, null) returns ctx UNCHANGED — so a regression
  // that deleted the applyPreviewRole call from useGatedNav entirely would
  // still pass every other assertion in this file, because nothing else
  // here can tell "narrowing applied" apart from "narrowing deleted".
  // Confirmed by mutation: removing the applyPreviewRole call left the
  // full suite green before this test existed. The consequence if this
  // regressed for real: a super-admin previewing as a student would see
  // admin-only entries (Users, Settings, Tenants) in the shelf, the
  // drawer, AND this sheet, with nothing failing anywhere.
  it('hides admin-only entries from the sheet when previewing as a lower role', async () => {
    // adminProfile IS a real tenant admin (is_admin: true) — without the
    // preview narrowing, 'Site Setup' (gate.adminOnly) would render
    // regardless of the preview. Previewing as 'student' sets
    // isTenantAdmin: false for the DURATION of the preview, independent of
    // the real profile (PREVIEW_ROLE_CAPS in navCatalog.ts) — that's the
    // capability narrowing under test here, not a different profile.
    //
    // 'Site Setup' specifically (not e.g. 'People'): 'People'-the-entry
    // shares its label with 'People'-the-SECTION-heading, and the People
    // section also holds 'Attendance' (ungated) — so with the entry gated
    // closed, the section heading text 'People' still renders from that
    // sibling, and the assertion would falsely pass either direction. 'Site
    // Setup' collides with nothing: its own label, no section is named
    // that.
    setup({ previewRole: 'student' });
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());
    expect(screen.queryByText('Site Setup')).toBeNull();
  });

  it('control: the same admin-only entry DOES show with no preview active', async () => {
    // Proves the query above is sensitive — 'Site Setup' genuinely renders
    // for this profile absent a preview, so hiding it under preview is a
    // real effect, not a query that would always come back empty
    // regardless.
    setup({ previewRole: null });
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());
    // getAllByText: 'Site Setup' legitimately renders twice for an admin —
    // the sidebar's pinned bottom band (above All Tools; Kevin 2026-08-12)
    // AND the sheet. Both are gated by the same resolveNav, so the preview
    // test above proves narrowing hides every copy.
    expect(screen.getAllByText('Site Setup').length).toBeGreaterThan(0);
  });
});
