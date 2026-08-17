// @vitest-environment jsdom
//
// TrialBanner is a billing element, and billing UI is admin-only (2026-08-17):
// students / parents / fans can't act on a plan decision, so the countdown
// renders ONLY for tenant admins and only after the role has resolved — never
// during the loading window, so non-admins get no flash. Role arrives as
// props from DashboardShell's existing useUserRole call (the hook is uncached
// and the shell remounts per route — a second call here would re-fetch three
// Supabase requests on every dashboard navigation). Three escalation tiers:
//   calm  (15+ days)  — soft accent bar, Clock icon, "Free through <date>"
//   amber (2–14 days) — warning
//   red   (≤1 day)    — urgent
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import type { TrialState } from '@/hooks/useTrialStatus';

const trialState = vi.hoisted(() => ({ current: { kind: 'loading' } as unknown }));
const role = { loading: false, admin: false };

vi.mock('@/hooks/useTrialStatus', () => ({
  useTrialStatus: () => trialState.current as TrialState,
}));
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>{children}</a>
  ),
}));

import { TrialBanner } from './TrialBanner';

const trial = (daysLeft: number): TrialState =>
  ({ kind: 'trial', daysLeft, endsAt: '2026-11-01T03:59:59.000Z', planId: 'director_60' });

afterEach(() => {
  role.loading = false;
  role.admin = false;
  trialState.current = { kind: 'loading' };
});

describe('TrialBanner admin gating', () => {
  it('renders nothing for a non-admin even with 3 days left', () => {
    role.admin = false;
    trialState.current = trial(3);
    const { container } = render(<TrialBanner roleLoading={role.loading} isAdmin={role.admin} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing while the role is still loading', () => {
    role.admin = true;
    role.loading = true;
    trialState.current = trial(3);
    const { container } = render(<TrialBanner roleLoading={role.loading} isAdmin={role.admin} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an admin on a grandfathered tenant', () => {
    role.admin = true;
    trialState.current = { kind: 'grandfathered' };
    const { container } = render(<TrialBanner roleLoading={role.loading} isAdmin={role.admin} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TrialBanner tiers (admin)', () => {
  it('shows the calm countdown with the trial-end date at 76 days out', () => {
    role.admin = true;
    trialState.current = trial(76);
    render(<TrialBanner roleLoading={role.loading} isAdmin={role.admin} />);
    // endsAt 2026-11-01T03:59:59Z is Oct 31 11:59pm ET — "through Oct 31",
    // paywall Nov 1. Date must come from endsAt, not be hardcoded, and the
    // formatter is pinned to America/New_York so this holds on UTC CI
    // runners and never shows "Nov 1" to a UTC-side viewer.
    expect(screen.getByText(/Free through Oct 31/)).toBeInTheDocument();
    expect(screen.getByText(/76 days left/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /choose plan/i }))
      .toHaveAttribute('href', '/dashboard/workspace?tab=plan');
  });

  it('still shows the calm tier at 15 days', () => {
    role.admin = true;
    trialState.current = trial(15);
    render(<TrialBanner roleLoading={role.loading} isAdmin={role.admin} />);
    expect(screen.getByText(/Free through Oct 31/)).toBeInTheDocument();
  });

  it('escalates to the warning copy at 14 days', () => {
    role.admin = true;
    trialState.current = trial(14);
    render(<TrialBanner roleLoading={role.loading} isAdmin={role.admin} />);
    expect(screen.getByText(/Only 14 days left in your free trial/)).toBeInTheDocument();
  });

  it('escalates to the urgent copy on the last day', () => {
    role.admin = true;
    trialState.current = trial(1);
    render(<TrialBanner roleLoading={role.loading} isAdmin={role.admin} />);
    expect(screen.getByText(/ends today/)).toBeInTheDocument();
  });
});
