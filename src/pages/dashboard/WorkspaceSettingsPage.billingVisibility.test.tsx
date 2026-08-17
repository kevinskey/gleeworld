// @vitest-environment jsdom
//
// Billing UI is admin-only (2026-08-17): non-admins opening Workspace
// Settings must not see the Plan or Billing tabs at all — previously the
// Plan tab (full pricing grid) was their read-only DEFAULT tab. For them
// the default becomes General, and a ?tab=plan / ?tab=billing deep link
// falls back to General. Admins keep all tabs with Plan as default.
//
// The wrapper stubs below mirror WorkspaceSettingsPage.branding-general-
// upsert.test.tsx — see that file for why UniversalLayout/DashboardShell
// must be cut (pdfjs import chain hangs collection otherwise).
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const role = vi.hoisted(() => ({ loading: false, admin: false }));
const fromMock = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
  SUPABASE_URL: 'https://supabase.test',
  getTenantSlug: () => 'demo',
}));

type PgResult = { data: unknown; error: unknown };
function pgChain(result: PgResult) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'is', 'neq', 'order', 'limit', 'contains', 'single', 'maybeSingle', 'upsert']) {
    q[m] = () => q;
  }
  q.then = (resolve: (v: PgResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return q;
}

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams((globalThis as any).__TEST_SEARCH__ ?? ''), vi.fn()],
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({
    loading: role.loading,
    isAdmin: () => role.admin,
    isSuperAdmin: () => false,
  }),
}));

vi.mock('@/hooks/useBrandingSettings', () => ({
  useBrandingSettings: () => ({ settings: null, refetch: vi.fn() }),
}));
vi.mock('@/lib/assistant/speech', () => ({ speak: vi.fn() }));
vi.mock('@/components/layout/UniversalLayout', () => ({
  UniversalLayout: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import WorkspaceSettingsPage from './WorkspaceSettingsPage';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

afterEach(() => {
  role.loading = false;
  role.admin = false;
  fromMock.mockReset();
  delete (globalThis as any).__TEST_SEARCH__;
});

const setup = () => {
  fromMock.mockImplementation(() => pgChain({ data: null, error: null }));
  render(<WorkspaceSettingsPage />, { wrapper });
};

describe('WorkspaceSettingsPage billing visibility', () => {
  it('admins see the Plan and Billing tabs, Plan as default', () => {
    role.admin = true;
    setup();
    expect(screen.getByRole('tab', { name: /plan/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /billing/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /plan/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('non-admins see neither the Plan nor the Billing tab', () => {
    role.admin = false;
    setup();
    expect(screen.queryByRole('tab', { name: /plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /billing/i })).not.toBeInTheDocument();
  });

  it('non-admins default to the General tab', () => {
    role.admin = false;
    setup();
    expect(screen.getByRole('tab', { name: /general/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('a ?tab=plan deep link falls back to General for non-admins', () => {
    role.admin = false;
    (globalThis as any).__TEST_SEARCH__ = 'tab=plan';
    setup();
    expect(screen.queryByRole('tab', { name: /plan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /general/i })).toHaveAttribute('aria-selected', 'true');
  });
});
