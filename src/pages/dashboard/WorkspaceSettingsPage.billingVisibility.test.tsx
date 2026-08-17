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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const role = vi.hoisted(() => ({ loading: false, admin: false }));
const fromMock = vi.hoisted(() => vi.fn());
const invokeMock = vi.hoisted(() => vi.fn(async () => ({ data: { url: null }, error: null })));
const rpcMock = vi.hoisted(() => vi.fn(async () => ({ data: null, error: null })));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock, rpc: rpcMock, functions: { invoke: invokeMock } },
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
  invokeMock.mockClear();
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

  it('renders no tabs while the role is resolving (no admin flash-to-General on ?tab=plan)', () => {
    role.loading = true;
    role.admin = true;
    (globalThis as any).__TEST_SEARCH__ = 'tab=plan';
    setup();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('a ?tab=plan deep link falls back to General for non-admins', () => {
    role.admin = false;
    (globalThis as any).__TEST_SEARCH__ = 'tab=plan';
    setup();
    expect(screen.queryByRole('tab', { name: /plan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /general/i })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('PlanTabPanel checkout actions (admin)', () => {
  // Tenant-scope non-quote tiers (director_60, director_150) buy through
  // create-plan-checkout; the user-scope Personal tier buys through
  // create-personal-checkout (payer = the caller, no tenant involved).
  // Institution is quote-priced ("From $250/mo") so it goes to email.
  // Button order follows card order: Personal, Director, Director+.
  it('offers Choose Plan on the three purchasable tiers', () => {
    role.admin = true;
    setup();
    expect(screen.getAllByRole('button', { name: /choose plan/i })).toHaveLength(3);
  });

  it('Personal buys through create-personal-checkout', async () => {
    role.admin = true;
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: /choose plan/i })[0]);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('create-personal-checkout', {
      body: { plan_id: 'personal', billing_cycle: 'monthly' },
    }));
  });

  it('starts tenant checkout with plan id, cycle, and tenant slug', async () => {
    role.admin = true;
    setup();
    fireEvent.click(screen.getAllByRole('button', { name: /choose plan/i })[1]);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('create-plan-checkout', {
      body: { plan_id: 'director_60', billing_cycle: 'monthly', tenant_slug: 'demo' },
    }));
  });

  it('sends the annual cycle after toggling to Annual', async () => {
    role.admin = true;
    setup();
    fireEvent.click(screen.getByRole('button', { name: /annual/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /choose plan/i })[1]);
    await waitFor(() => expect(invokeMock).toHaveBeenCalledWith('create-plan-checkout', {
      body: { plan_id: 'director_60', billing_cycle: 'annual', tenant_slug: 'demo' },
    }));
  });

  it('sends the Institution tier to email instead of checkout', () => {
    role.admin = true;
    setup();
    const contact = screen.getByRole('link', { name: /contact us/i });
    expect(contact.getAttribute('href')).toMatch(/^mailto:/);
  });

  // A TRIAL row is not an owned plan. Marking the trialed tier CURRENT hid
  // its Choose Plan button — on lykehouse (trial of director_60) the featured
  // tier was literally unpurchasable (found live 2026-08-17).
  it('a trial row does not mark its tier CURRENT — its Choose Plan stays', async () => {
    role.admin = true;
    fromMock.mockImplementation((table: string) => pgChain(
      table === 'gw_tenant_plans'
        ? { data: { plan_id: 'director_60', billing_cycle: 'monthly', status: 'trial' }, error: null }
        : { data: null, error: null },
    ));
    render(<WorkspaceSettingsPage />, { wrapper });
    await waitFor(() => expect(screen.getByText('trial')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /choose plan/i })).toHaveLength(3);
    expect(screen.queryByText('CURRENT')).not.toBeInTheDocument();
  });

  it('an active row still marks its tier CURRENT and hides its button', async () => {
    role.admin = true;
    fromMock.mockImplementation((table: string) => pgChain(
      table === 'gw_tenant_plans'
        ? { data: { plan_id: 'director_60', billing_cycle: 'monthly', status: 'active' }, error: null }
        : { data: null, error: null },
    ));
    render(<WorkspaceSettingsPage />, { wrapper });
    await waitFor(() => expect(screen.getByText('CURRENT')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /choose plan/i })).toHaveLength(2);
  });
});
