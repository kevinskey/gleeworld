// Countdown banner shown across the top of DashboardShell while a tenant is
// on the 30-day free trial. Hidden until 7 days remain, then warning at
// 2–7 days and urgent at 1 day left. Hides entirely for grandfathered /
// paid / no-tenant / loading states.

import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { cn } from '@/lib/utils';

export function TrialBanner() {
  const state = useTrialStatus();
  if (state.kind !== 'trial') return null;
  const { daysLeft } = state;
  if (daysLeft > 7) return null;

  const urgent = daysLeft <= 1;
  const warning = !urgent;
  const tone = urgent ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-900';

  const Icon = AlertTriangle;

  const label = urgent
    ? `Your free trial ends today — pick a plan to keep access.`
    : `Only ${daysLeft} days left in your free trial. Pick a plan to avoid a lockout.`;

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
            : 'bg-slate-900 text-white hover:bg-slate-800',
        )}
      >
        Choose Plan
      </Link>
    </div>
  );
}
