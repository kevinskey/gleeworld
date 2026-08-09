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
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import type { MyTools } from '@/lib/navigation/myTools';

const { useUserRoleMock, useMyToolsMock, useTenantNavPrefsMock, saveMyToolsMock } = vi.hoisted(() => ({
  useUserRoleMock: vi.fn(),
  useMyToolsMock: vi.fn(),
  useTenantNavPrefsMock: vi.fn(),
  saveMyToolsMock: vi.fn(),
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
  useEffectivePreviewRole: () => null,
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

function setup({
  myTools = { v: 4, tools: ['calendar', 'messages', 'finance'], widgets: [], setupComplete: true } as MyTools,
}: { myTools?: MyTools | null } = {}) {
  useUserRoleMock.mockReturnValue({
    profile: adminProfile,
    loading: false,
    canEditMusicLibrary: () => true,
  });
  useTenantNavPrefsMock.mockReturnValue(new Set<string>());
  useMyToolsMock.mockReturnValue({
    myTools,
    loading: false,
    saveTools: vi.fn(),
    saveMyTools: saveMyToolsMock,
  });
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

describe('All Tools — pinning appends to the STORED list, not the rendered shelf', () => {
  // The trap: NavShelf caps its render at MY_TOOLS_CAP and DashboardShell
  // derives shelfTools through selectShelfEntries, which drops any stored
  // key whose gate has closed. 'partners' is adminOnly and NOT included in
  // the mocked profile's gate (isTenantAdmin comes from is_admin/
  // is_super_admin — adminProfile IS an admin, so to get a genuinely
  // CLOSED gate here we use a platform-admin-only key while the mocked
  // profile is only a tenant admin, not a platform admin on 'main').
  // 'tenants' requires platformAdminOnly, which adminProfile does not
  // satisfy (is_super_admin: false) — so it is stored but never resolves,
  // never renders on the shelf, and must still be there after a pin.
  it('a stored-but-gate-closed key survives a pin', async () => {
    setup({
      myTools: { v: 4, tools: ['tenants', 'calendar'], widgets: [], setupComplete: true },
    });
    saveMyToolsMock.mockResolvedValue(true);
    renderShell();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(screen.getByPlaceholderText(/search all tools/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /pin academy to your space/i }));

    await waitFor(() => expect(saveMyToolsMock).toHaveBeenCalled());
    const patch = saveMyToolsMock.mock.calls[0][0] as { tools: string[] };
    // The gate-closed 'tenants' key must still be present — appending to a
    // gate-filtered/capped rendering of the shelf would have silently
    // dropped it instead.
    expect(patch.tools).toEqual(['tenants', 'calendar', 'academy']);
  });
});
