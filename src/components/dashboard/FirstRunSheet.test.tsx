// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

// Both state objects are mutable so individual tests can override the
// fixture (loading/null myTools, a slow-to-resolve tenant default) without a
// second vi.mock factory per test — vi.mock factories hoist above `const`,
// so anything they read must come through vi.hoisted().
const h = vi.hoisted(() => ({
  saveMyTools: vi.fn(),
  myToolsState: {
    myTools: { v: 4 as const, tools: [] as string[], widgets: [] as string[], setupComplete: false },
    loading: false,
  },
  defaultsState: {
    defaultsByRole: { admin: [] as string[], student: ['calendar', 'academy'], member: [] as string[] },
    loading: false,
  },
}));
vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => ({
    myTools: h.myToolsState.myTools,
    loading: h.myToolsState.loading,
    saveTools: vi.fn(),
    saveMyTools: h.saveMyTools,
  }),
  WIDGETS_CAP: 2,
}));
vi.mock('@/hooks/useTenantDefaultTools', () => ({
  useTenantDefaultTools: () => ({
    defaultsByRole: h.defaultsState.defaultsByRole,
    loading: h.defaultsState.loading,
    saveDefaults: vi.fn(),
  }),
}));

import { FirstRunSheet } from './FirstRunSheet';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

const available = ['calendar', 'academy', 'finance'].map((k) => NAV_CATALOG.find((e) => e.key === k)!);

const sheetEl = (role: 'student' | 'faculty' = 'student') => (
  <MemoryRouter>
    <FirstRunSheet open onOpenChange={vi.fn()} available={available} role={role} />
  </MemoryRouter>
);

const renderSheet = (role: 'student' | 'faculty' = 'student') =>
  render(
    <MemoryRouter>
      <FirstRunSheet open onOpenChange={vi.fn()} available={available} role={role} />
    </MemoryRouter>,
  );

beforeEach(() => {
  h.saveMyTools.mockReset().mockResolvedValue(true);
  h.myToolsState.myTools = { v: 4, tools: [], widgets: [], setupComplete: false };
  h.myToolsState.loading = false;
  h.defaultsState.defaultsByRole = { admin: [], student: ['calendar', 'academy'], member: [] };
  h.defaultsState.loading = false;
  // useIsCompactNav (side selection) reads matchMedia; jsdom has none by default.
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

describe('FirstRunSheet', () => {
  it('prefills from the tenant default for the role', () => {
    renderSheet('student');
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^2 tools$/);
  });

  it('falls back to the platform default when the tenant set none', () => {
    renderSheet('faculty');
    expect(screen.getByTestId('my-world-count')).not.toHaveTextContent(/^0 tools$/);
  });

  it('Looks good saves and marks setup complete', async () => {
    renderSheet('student');
    fireEvent.click(screen.getByRole('button', { name: /looks good/i }));
    await waitFor(() =>
      expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar', 'academy'], setupComplete: true }));
  });

  it('Skip accepts the shown set rather than saving nothing', async () => {
    renderSheet('student');
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    await waitFor(() =>
      expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar', 'academy'], setupComplete: true }));
  });

  // The one bug this task must not repeat (Task 4 shipped it once already):
  // saveMyTools fills any omitted field from the CURRENT record, so a save
  // fired while that record is still null/loading has nothing real to
  // merge against and can stomp a real record with a guessed, smaller one.
  it('never saves while the record is loading or missing', async () => {
    h.myToolsState.loading = true;
    h.myToolsState.myTools = null as unknown as typeof h.myToolsState.myTools;
    renderSheet('student');
    fireEvent.click(screen.getByRole('button', { name: /looks good/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.saveMyTools).not.toHaveBeenCalled();
  });

  // Round 1 review, Important: every exit must save, or setupComplete stays
  // false forever and the sheet re-opens on every future mount.
  it('Escape closes and saves the shown set exactly like Skip', async () => {
    renderSheet('student');
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() =>
      expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar', 'academy'], setupComplete: true }));
  });

  it('an outside (overlay) click closes and saves the shown set exactly like Skip', async () => {
    renderSheet('student');
    // Radix's DismissableLayer registers its outside-pointerdown listener
    // via a setTimeout(0) (to avoid catching the very click that opened the
    // layer) and only treats it as "outside" when it lands on the actual
    // dimming overlay (the real click surface a user has) — a bare
    // document.body dispatch doesn't reach its handler.
    await new Promise((resolve) => setTimeout(resolve, 10));
    const overlay = Array.from(document.querySelectorAll('[data-state="open"]'))
      .find((el) => el.className.includes('bg-black')) as HTMLElement;
    expect(overlay).toBeTruthy();
    fireEvent.pointerDown(overlay);
    await waitFor(() =>
      expect(h.saveMyTools).toHaveBeenCalledWith({ tools: ['calendar', 'academy'], setupComplete: true }));
  });

  it('dismissing while the record is loading closes without saving (nothing safe to write yet)', async () => {
    h.myToolsState.loading = true;
    h.myToolsState.myTools = null as unknown as typeof h.myToolsState.myTools;
    renderSheet('student');
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(h.saveMyTools).not.toHaveBeenCalled();
  });

  // Round 1 review, Minor: the one-time re-seed effect must not clobber an
  // edit the member makes while useTenantDefaultTools is still in flight.
  it('an in-sheet edit survives a late-arriving tenant default', async () => {
    h.defaultsState.loading = true;
    h.defaultsState.defaultsByRole = { admin: [], student: [], member: [] };
    const { rerender } = render(sheetEl());

    // Seeded from the platform default (8 tools) while the tenant query is
    // still in flight.
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^8 tools$/);

    // Member removes a tool before the tenant default arrives.
    fireEvent.click(screen.getByRole('button', { name: /remove calendar/i }));
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^7 tools$/);

    // Tenant default resolves late, to a DIFFERENT (2-tool) set.
    h.defaultsState.loading = false;
    h.defaultsState.defaultsByRole = { admin: [], student: ['calendar', 'academy'], member: [] };
    rerender(sheetEl());

    // The member's edit must survive — not be replaced by the late default.
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^7 tools$/);
  });

  // Final review, Important 2: useUserRole caches nothing, so `role` is
  // computed from a profile that is null on every fresh mount, while
  // useTenantDefaultTools is react-query with a 60s staleTime. On a remount
  // inside that window the defaults resolve FIRST, the one-shot seed runs
  // against role='student', and the later flip to 'faculty' left that
  // student shelf frozen in the draft — which every exit path then
  // persists. HouseHome now gates the MOUNT on !roleLoading; this is the
  // belt-and-braces inside the component.
  it('re-seeds for the real role when the profile resolves after the defaults query', async () => {
    h.defaultsState.defaultsByRole = {
      admin: ['calendar', 'academy', 'finance'],
      student: ['calendar'],
      member: [],
    };
    h.defaultsState.loading = false; // defaults already cached — resolve first

    // Mounted before the profile lands: role falls back to 'student'.
    const { rerender } = render(sheetEl('student'));
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^1 tool$/);

    // Profile resolves: this member is actually faculty.
    rerender(sheetEl('faculty'));

    // Must now show the ADMIN default (3), not the frozen student guess (1).
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^3 tools$/);
    fireEvent.click(screen.getByRole('button', { name: /looks good/i }));
    await waitFor(() => expect(h.saveMyTools).toHaveBeenCalledWith({
      tools: ['calendar', 'academy', 'finance'], setupComplete: true,
    }));
  });

  it('still lets an edit made before the role flip win over the re-seed', () => {
    h.defaultsState.defaultsByRole = {
      admin: ['calendar', 'academy', 'finance'],
      student: ['calendar'],
      member: [],
    };
    const { rerender } = render(sheetEl('student'));
    fireEvent.click(screen.getByRole('button', { name: /^add academy$/i }));
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^2 tools$/);
    rerender(sheetEl('faculty'));
    expect(screen.getByTestId('my-world-count')).toHaveTextContent(/^2 tools$/);
  });
});
