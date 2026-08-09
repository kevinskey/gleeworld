// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';

// `myToolsState` is mutable so one test (the loading/null gate below) can
// override the fixture without a second vi.mock factory — vi.mock factories
// hoist above `const`, so anything they read must come through vi.hoisted().
const h = vi.hoisted(() => ({
  saveMyTools: vi.fn(),
  myToolsState: {
    myTools: { v: 4 as const, tools: [] as string[], widgets: [] as string[], setupComplete: false },
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
  useTenantDefaultTools: () => ({ defaultsByRole: { admin: [], student: ['calendar', 'academy'], member: [] }, loading: false, saveDefaults: vi.fn() }),
}));

import { FirstRunSheet } from './FirstRunSheet';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

const available = ['calendar', 'academy', 'finance'].map((k) => NAV_CATALOG.find((e) => e.key === k)!);

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
    expect(screen.getByTestId('my-space-count')).toHaveTextContent('2 of 8');
  });

  it('falls back to the platform default when the tenant set none', () => {
    renderSheet('faculty');
    expect(screen.getByTestId('my-space-count')).not.toHaveTextContent('0 of 8');
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
});
