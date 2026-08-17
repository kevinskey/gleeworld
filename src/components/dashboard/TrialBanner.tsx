// Countdown banner shown across the top of DashboardShell while a tenant is
// on the free trial. Billing UI is admin-only (2026-08-17): the banner renders
// solely for tenant admins and never while the role is still resolving, so
// non-admins get no flash. Role comes as props from DashboardShell's existing
// useUserRole call — the hook is uncached and the shell remounts per route,
// so a second call here would cost three Supabase requests per navigation.
// Three tiers: calm accent bar at 15+ days, amber warning at 2–14, red urgent
// on the last day. Hides for grandfathered / paid / no-tenant / loading.

import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { cn } from '@/lib/utils';

export function TrialBanner({ roleLoading, isAdmin }: { roleLoading: boolean; isAdmin: boolean }) {
  const state = useTrialStatus();
  if (state.kind !== 'trial') return null;
  if (roleLoading || !isAdmin) return null;
  const { daysLeft, endsAt } = state;

  const urgent = daysLeft <= 1;
  const warning = !urgent && daysLeft <= 14;
  const tone = urgent
    ? 'bg-red-600 text-white'
    : warning
      ? 'bg-amber-500 text-slate-900'
      : 'bg-primary/10 text-foreground';

  const Icon = urgent || warning ? AlertTriangle : Clock;

  // endsAt marks the paywall moment (e.g. Nov 1 midnight ET stored as UTC).
  // Pin the formatter to ET: the paywall fires on an ET wall-clock boundary,
  // and a viewer's local zone (or a UTC CI runner) would otherwise label the
  // wrong last free day.
  const endsLabel = new Date(endsAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'America/New_York',
  });

  const label = urgent
    ? `Your free trial ends today — pick a plan to keep access.`
    : warning
      ? `Only ${daysLeft} days left in your free trial. Pick a plan to avoid a lockout.`
      : `Free through ${endsLabel} — ${daysLeft} days left. Choose a plan anytime.`;

  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 sm:px-6 py-2 text-xs sm:text-sm', tone)}>
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <Link
        to="/dashboard/workspace?tab=plan"
        className={cn(
          'shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition-colors',
          urgent
            ? 'bg-white text-red-700 hover:bg-white/90'
            : warning
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-primary text-primary-foreground hover:opacity-90',
        )}
      >
        Choose Plan
      </Link>
    </div>
  );
}
