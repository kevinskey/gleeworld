// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const h = vi.hoisted(() => ({ saveMyTools: vi.fn(), myTools: { v: 4, tools: ['calendar', 'academy'], widgets: [], setupComplete: true } }));

vi.mock('@/hooks/useMyTools', () => ({
  useMyTools: () => ({ myTools: h.myTools, loading: false, saveTools: vi.fn(), saveMyTools: h.saveMyTools }),
  WIDGETS_CAP: 2,
}));
vi.mock('@/hooks/useUserRole', () => ({ useUserRole: () => ({ profile: { is_admin: false, role: 'student' }, loading: false, canEditMusicLibrary: () => false }) }));
vi.mock('@/hooks/useModuleAccess', () => ({ useModuleAccess: () => ({ hasAccess: true }) }));
vi.mock('@/hooks/useTenantNavPrefs', () => ({ useTenantNavPrefs: () => new Set<string>() }));
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

beforeEach(() => { h.saveMyTools.mockReset().mockResolvedValue(true); });

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
});
