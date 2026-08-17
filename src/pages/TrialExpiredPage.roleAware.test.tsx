// @vitest-environment jsdom
//
// Billing UI is admin-only (2026-08-17). The /paywall page still locks out
// every user of an expired tenant, but WHAT it shows is role-scoped:
//   admins (and signed-out visitors) — the pricing grid + Choose Plan
//   signed-in non-admins             — a neutral "ask your workspace admin"
//                                      lockout with no tiers, prices, or CTA
// While a signed-in user's role is resolving, neither variant's specifics
// render — no pricing flash for students.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

const auth = vi.hoisted(() => ({ user: null as null | { id: string } }));
const role = vi.hoisted(() => ({ loading: false, admin: false }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user }),
}));
vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ loading: role.loading, isAdmin: () => role.admin }),
}));
vi.mock('@/hooks/useTrialStatus', () => ({
  useTrialStatus: () => ({ kind: 'expired', endsAt: '2026-11-01T03:59:59.000Z', planId: 'director_60' }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));
// PublicLayout drags in the marketing chrome; the paywall assertions don't
// touch it.
vi.mock('@/components/layout/PublicLayout', () => ({
  PublicLayout: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

import TrialExpiredPage from './TrialExpiredPage';

afterEach(() => {
  auth.user = null;
  role.loading = false;
  role.admin = false;
});

describe('TrialExpiredPage role-aware content', () => {
  it('shows the pricing grid to a tenant admin', () => {
    auth.user = { id: 'u1' };
    role.admin = true;
    render(<TrialExpiredPage />);
    expect(screen.getAllByText('Choose Plan').length).toBeGreaterThan(0);
    expect(screen.getByText(/pick a plan to keep going/i)).toBeInTheDocument();
  });

  it('shows the pricing grid to a signed-out visitor', () => {
    render(<TrialExpiredPage />);
    expect(screen.getAllByText('Choose Plan').length).toBeGreaterThan(0);
  });

  it('shows a neutral lockout with no pricing to a signed-in non-admin', () => {
    auth.user = { id: 'u1' };
    role.admin = false;
    render(<TrialExpiredPage />);
    expect(screen.getByText(/ask your workspace admin/i)).toBeInTheDocument();
    expect(screen.queryByText('Choose Plan')).not.toBeInTheDocument();
    expect(screen.queryByText(/\/mo/)).not.toBeInTheDocument();
  });

  it('shows neither variant while a signed-in user\'s role is resolving', () => {
    auth.user = { id: 'u1' };
    role.loading = true;
    role.admin = true;
    render(<TrialExpiredPage />);
    expect(screen.queryByText('Choose Plan')).not.toBeInTheDocument();
    expect(screen.queryByText(/ask your workspace admin/i)).not.toBeInTheDocument();
  });
});
