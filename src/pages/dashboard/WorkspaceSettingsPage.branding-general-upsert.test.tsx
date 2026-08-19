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
    pgChain({ data: [{ id: 'branding-row' }], error: null })),
);
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
  SUPABASE_URL: 'https://supabase.test',
  // Both panels sit next to components that read the tenant off the client:
  // PlatformTenantWarning renders only on 'main', and K12ToggleField pins its
  // branding read to the current slug. 'demo' keeps this test on the ordinary
  // tenant path — the one the ~49-of-50 bug was about.
  getTenantSlug: () => 'demo',
}));

/**
 * A PostgREST query-builder stand-in: every filter returns itself, and
 * awaiting anywhere along the chain yields `result`.
 *
 * Needed because the panels are not alone on their tab. The General panel
 * mounts K12ToggleField, which reads gw_branding_settings on mount; a
 * `from()` that only answers `upsert` left that read rejecting *after* the
 * assertions had passed, which is how a green test turns into a mystery
 * failure somewhere later in the run.
 */
type PgResult = { data: unknown; error: unknown };
function pgChain(result: PgResult) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'is', 'neq', 'order', 'limit', 'contains', 'single', 'maybeSingle']) {
    q[m] = () => q;
  }
  q.then = (resolve: (v: PgResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return q;
}

function tableStub() {
  const q = pgChain({ data: null, error: null });
  q.upsert = upsertMock;
  return q;
}

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(`tab=${(globalThis as any).__TEST_TAB__}`), vi.fn()],
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isSuperAdmin: () => true, isAdmin: () => false }),
}));

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: null, refetch: vi.fn() }),
}));

// speech.ts installs a document-level click handler that primes an <audio>
// element for TTS. jsdom does not implement HTMLMediaElement.play, so every
// fireEvent.click in this file printed a jsdom "Not implemented" error —
// noise that reads like a failure in the log while the run stays green.
// Nothing on these two panels speaks.
vi.mock('@/lib/assistant/speech', () => ({ speak: vi.fn() }));

// The two chrome wrappers this page renders inside, stubbed to passthroughs.
// Not cosmetic — they are the choke point for everything that keeps this file
// from collecting at all, and they are the ONLY choke point that is one edge
// wide. Both funnel into src/config/unified-modules.ts, a config that STATICALLY
// imports every module page, so importing the page drags in the whole app:
//
//   UniversalLayout -> UniversalHeader -> QuickActionsPanel -> unified-modules
//     -> MediaLibrary          -> react-pdf   -> pdfjs-dist
//     -> MediaLibrary          -> @/lib/pdfWorker -> pdfjs-dist, plus a
//        `?url` import of pdf.worker.min.mjs — evaluating that worker bundle
//        in-process is what made an earlier attempt at this fix HANG rather
//        than fail, a module-evaluation hang no --testTimeout can interrupt
//     -> MusicLibrary          -> PDFViewerWithAnnotations -> @react-pdf-viewer/core
//   UniversalHeader -> MusicalToolkit -> @/utils/mobileAudioUnlock, whose
//        isPWA() calls window.matchMedia at MODULE SCOPE
//
// pdfjs evaluates display/canvas.js on import, which reads DOMMatrix; jsdom
// has none, so the file dies during collection. Stubbing pdfjs per component
// (the store suites' PDFThumbnail stub) does not reach it — there are four
// separate doors. Stubbing these two wrappers closes every door at once, and
// costs nothing the assertions depend on: what is under test is the two tab
// panels' upsert, and neither wrapper contributes to it.
//
// It also removes the ORIGINAL failure — `window.matchMedia is not a function`
// — without stubbing matchMedia at all. A hoisted matchMedia stub was written
// first (a beforeEach cannot work: the call is at module scope), and it did get
// the file past collection; it just landed it deeper in the same import chain,
// on pdfjs. Cutting the chain at its root makes the stub unnecessary, so there
// isn't one: the fewer browser APIs this file fakes, the fewer feature-detects
// elsewhere it can quietly flip.
vi.mock('@/components/layout/UniversalLayout', () => ({
  UniversalLayout: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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
    fromMock.mockReturnValue(tableStub());

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
    fromMock.mockReturnValue(tableStub());

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
