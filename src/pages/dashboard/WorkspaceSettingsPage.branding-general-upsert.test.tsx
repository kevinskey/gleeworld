// @vitest-environment jsdom
//
// Pre-existing production bug: BrandingTabPanel's and GeneralTabPanel's save()
// both did a bare `.upsert()` on gw_branding_settings. That table's PRIMARY
// KEY is a legacy singleton `id DEFAULT 1`; a bare upsert (no `id` in the
// payload) lets PostgREST arbitrate on that PK, which always resolves to
// id=1 — the `main` tenant's row. Every other tenant's row is invisible to
// them under RLS, so ~49 of 50 tenants silently failed to save Branding and
// General settings. Fixed by pinning the conflict target to the real
// per-tenant UNIQUE constraint (`tenant_id`), matching the approach already
// used in useDateCardConfig.ts's save() (see useDateCardConfig.save.test.tsx
// for the sibling test on that hook).
//
// Radix's TabsPrimitive.Content only mounts its children when its `value`
// matches the active tab, so rendering the full page with the URL's `tab`
// param pinned to 'branding' (or 'general') exercises exactly the one panel
// under test without needing to satisfy every other tab's data dependencies.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Branding's save() chains `.upsert(...).select('id')` (silent-noop guard,
// be6c86e17) while General's awaits the upsert directly — so the mock's
// return must be both awaitable and .select()-chainable, and .select must
// resolve to a non-empty row set or the guard treats the save as a noop.
const upsertMock = vi.hoisted(() =>
  vi.fn((_payload: Record<string, unknown>, _options?: { onConflict?: string }) =>
    Object.assign(Promise.resolve({ data: [{ id: 1 }], error: null }), {
      select: async () => ({ data: [{ id: 1 }], error: null }),
    }),
  ),
);
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(`tab=${(globalThis as any).__TEST_TAB__}`), vi.fn()],
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isSuperAdmin: () => true, isAdmin: () => false }),
}));

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: null, refetch: vi.fn() }),
}));

// The page was wrapped in UniversalLayout + DashboardShell (2026-07-24,
// 59126e655) after this test was written. That shell tree pulls in heavy,
// jsdom-hostile modules (pdfjs via the music library, mobileAudioUnlock,
// etc.) that are irrelevant to the upsert wiring under test — mock the
// shell down to passthroughs, same as HouseHome.test.tsx does.
vi.mock('@/components/layout/UniversalLayout', () => ({
  UniversalLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import WorkspaceSettingsPage from './WorkspaceSettingsPage';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

afterEach(() => {
  upsertMock.mockClear();
  fromMock.mockReset();
  delete (globalThis as any).__TEST_TAB__;
});

describe('WorkspaceSettingsPage branding/general saves', () => {
  it('BrandingTabPanel upserts on the tenant_id conflict target, without tenant_id or id in the payload', async () => {
    (globalThis as any).__TEST_TAB__ = 'branding';
    fromMock.mockReturnValue({ upsert: upsertMock });

    render(<WorkspaceSettingsPage />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: /save branding/i }));

    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const [payload, options] = upsertMock.mock.calls[0];
    expect(options).toEqual({ onConflict: 'tenant_id' });
    expect(payload).not.toHaveProperty('tenant_id');
    expect(payload).not.toHaveProperty('id');
    expect(payload).toMatchObject({
      org_name: expect.any(String),
      short_name: expect.any(String),
      primary_color: expect.any(String),
      logo_url: expect.any(String),
    });
  });

  it('GeneralTabPanel upserts on the tenant_id conflict target, without tenant_id or id in the payload', async () => {
    (globalThis as any).__TEST_TAB__ = 'general';
    fromMock.mockReturnValue({ upsert: upsertMock });

    render(<WorkspaceSettingsPage />, { wrapper });

    fireEvent.click(screen.getByRole('button', { name: /save general settings/i }));

    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const [payload, options] = upsertMock.mock.calls[0];
    expect(options).toEqual({ onConflict: 'tenant_id' });
    expect(payload).not.toHaveProperty('tenant_id');
    expect(payload).not.toHaveProperty('id');
    expect(payload).toMatchObject({
      timezone: expect.any(String),
      locale: expect.any(String),
      week_start: expect.any(String),
    });
  });
});
