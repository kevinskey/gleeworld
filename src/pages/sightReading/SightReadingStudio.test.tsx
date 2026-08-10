// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SightReadingStudio from './SightReadingStudio';

// No global test setup file registers auto-cleanup, so unmount between tests
// ourselves — otherwise renders accumulate in document.body.
afterEach(cleanup);

// SingFlow (mounted only after "Start practice") pulls in useMicPitch at module
// load; stub it so importing the landing page never touches the AudioWorklet.
vi.mock('@/lib/sightReading/useMicPitch', () => ({
  useMicPitch: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    permission: 'prompt' as const,
    live: null,
    error: null,
    getCaptured: () => [],
  }),
}));

// useUserRole reaches into AuthContext, which isn't mounted in this test tree;
// stub it as a non-admin so the existing empty-state assertions still hold.
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isAdmin: () => false }),
}));

const renderPage = () => render(<MemoryRouter><SightReadingStudio /></MemoryRouter>);

describe('SightReadingStudio — the empty state IS the primary state', () => {
  it('shows Start practice above the fold', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument();
  });

  it('renders no stat cards when there are zero attempts', () => {
    renderPage();
    expect(screen.queryByText(/average score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/best score/i)).not.toBeInTheDocument();
    expect(screen.queryByText('--%')).not.toBeInTheDocument();
  });

  // Pitch Match joined the tab strip in 3dc29228c (2026-07-29) and is a real
  // surface — <TabsContent value="pitch-match"> renders PitchMatchTab, its own
  // 30KB component. This test was written 2026-07-10 and never learned about
  // it. The point of the assertion is unchanged: ONE tab strip, and its exact
  // membership pinned, so a tab cannot appear or vanish unnoticed.
  // (A fifth, 'Class', is admin-only; useUserRole is stubbed non-admin above.)
  it('has exactly one navigation control, with four options for a non-admin', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Practice', 'Pitch Match', 'Library', 'Progress']);
  });

  it('does not offer Theory review — it belongs to Glee Academy', () => {
    renderPage();
    expect(screen.queryByText(/theory/i)).not.toBeInTheDocument();
  });

  it('offers the pitch pipe as a chip, not a tab', () => {
    renderPage();
    const pipe = screen.getByRole('button', { name: /pitch pipe/i });
    expect(pipe).toBeInTheDocument();
    expect(pipe.getAttribute('role')).not.toBe('tab');
  });
});
