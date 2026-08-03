// @vitest-environment jsdom
// Smoke test: MyFeesPage renders with empty state without crashing.
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Stub hooks consumed by MyFeesPage
vi.mock('@/hooks/useMyFees', () => ({
  useMyFees: () => ({
    unpaid: [],
    paid: [],
    plans: [],
    totalOwed: 0,
    loading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTenantStripeConnect', () => ({
  useTenantStripeConnect: () => ({
    enabled: false,
    accountId: null,
    chargesEnabled: false,
    payoutsEnabled: false,
    loading: false,
  }),
}));

// Stub supabase so the treasurer useEffect doesn't throw
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

import MyFeesPage from './MyFeesPage';

describe('MyFeesPage smoke test', () => {
  it('renders without crashing with empty state', () => {
    render(
      <MemoryRouter>
        <MyFeesPage />
      </MemoryRouter>,
    );
    // Page title should appear
    expect(screen.getByText('My Fees')).toBeInTheDocument();
    // Empty state message
    expect(screen.getByText('No fees on your account.')).toBeInTheDocument();
  });

  it('shows the balance section with $0.00 when totalOwed is 0', () => {
    render(
      <MemoryRouter>
        <MyFeesPage />
      </MemoryRouter>,
    );
    // getAllByText because two renders share the same jsdom body in this suite
    const balances = screen.getAllByText('$0.00');
    expect(balances.length).toBeGreaterThan(0);
    expect(balances[0]).toBeInTheDocument();
  });
});
