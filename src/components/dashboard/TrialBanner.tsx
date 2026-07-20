// Countdown banner shown across the top of DashboardShell while a tenant is
// on the 30-day free trial. Two escalation thresholds per Kevin: soft banner
// through day 22, warning at 7 days left, urgent at 1 day left. The banner
// hides entirely for grandfathered / paid / no-tenant / loading states.

import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { cn } from '@/lib/utils';

export function TrialBanner() {
  const state = useTrialStatus();
  if (state.kind !== 'trial') return null;
  const { daysLeft } = state;

  const urgent = daysLeft <= 1;
  const warning = !urgent && daysLeft <= 7;
  const tone = urgent
    ? 'bg-red-600 text-white'
    : warning
      ? 'bg-amber-500 text-slate-900'
      : 'bg-primary/10 text-foreground';

  const Icon = urgent || warning ? AlertTriangle : Clock;

  const label = urgent
    ? `Your free trial ends today — pick a plan to keep access.`
    : warning
      ? `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial. Pick a plan to avoid a lockout.`
      : `Free trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

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
          urgent ? 'bg-white text-red-700 hover:bg-white/90'
            : warning ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
      >
        Choose Plan
      </Link>
    </div>
  );
}
