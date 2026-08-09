// @vitest-environment jsdom
//
// ProductManagement composes Orders/Customers/Payments/Discounts/Tax/
// Inventory/Subscriptions managers reading gw_orders, gw_payments,
// gw_refunds, gw_disputes. Before this fix, the only gate on reaching it
// was the 'shop' nav catalog entry's module check — no role check anywhere,
// nav or page — so any authenticated member of a merch/store-enabled
// tenant who typed /dashboard/shop (or the old /store/products,
// /product-management) got the full store admin surface. This test proves
// the page's own self-gate, independent of the nav catalog's adminOnly
// flag (src/lib/navigation/__tests__/navCatalog.test.ts covers that half).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react';

const h = vi.hoisted(() => ({
  isAdmin: vi.fn(() => false),
  roleLoading: false,
  hasStore: true,
  moduleLoading: false,
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isAdmin: h.isAdmin, loading: h.roleLoading }),
}));
vi.mock('@/hooks/useModuleAccess', () => ({
  useModuleAccess: () => ({ hasAccess: h.hasStore, isLoading: h.moduleLoading }),
}));
// Same rationale as MySpacePage.test.tsx: DashboardShell is a named export
// everywhere in the repo, so only the named export needs stubbing.
vi.mock('@/components/dashboard/DashboardShell', () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/layout/UniversalLayout', () => ({
  UniversalLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ProductManagement } from './ProductManagement';

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><ProductManagement /></MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ProductManagement self-gate', () => {
  // Round 1 review, minor: `h.roleLoading = false` used to be reset in the
  // BODY of the "does not flash" test, below its assertions — a failing
  // assertion there would throw before the reset ran and leak `true` into
  // whichever test happened to run next. Reset every mutable field for
  // every test instead, win or lose.
  beforeEach(() => {
    h.isAdmin.mockReset().mockReturnValue(false);
    h.roleLoading = false;
    h.hasStore = true;
    h.moduleLoading = false;
  });
  afterEach(() => {
    h.roleLoading = false;
  });

  it('a non-admin (module enabled, not loading) sees the no-access state, not the store managers', () => {
    renderPage();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.queryByText('Merch Store Management')).not.toBeInTheDocument();
    // Tab labels from the real managers must not be reachable either.
    expect(screen.queryByText('Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('Customers')).not.toBeInTheDocument();
    expect(screen.queryByText('Payments')).not.toBeInTheDocument();
  });

  it('an admin (module enabled) reaches the real store managers', () => {
    h.isAdmin.mockReturnValue(true);
    renderPage();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
    expect(screen.getByText('Merch Store Management')).toBeInTheDocument();
  });

  it('does not flash the managers before the role check resolves', () => {
    h.roleLoading = true;
    renderPage();
    expect(screen.queryByText('Merch Store Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
  });
});
