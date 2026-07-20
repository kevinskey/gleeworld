// Full-viewport paywall shown to any tenant whose 30-day trial has ended.
// The route (/paywall) is registered publicly (no ProtectedRoute wrapper) so
// TrialGuard can redirect any protected route here without recursion. The
// page itself still uses useAuth to keep the sign-out link honest; a
// signed-out visitor sees the marketing lockout view instead of a broken
// mutation button.

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, LogOut } from 'lucide-react';
import { PLAN_TIERS, TIER_PASTELS, formatPrice, monthsFreeFor } from '@/lib/planTiers';
import { useAuth } from '@/contexts/AuthContext';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TrialExpiredPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = useTrialStatus();

  // If a user lands here but their trial isn't actually expired (e.g. clicked
  // an old link, or the guard fired stale) bounce them home so they don't get
  // wedged on a paywall they don't need.
  useEffect(() => {
    if (state.kind === 'grandfathered' || state.kind === 'paid' || state.kind === 'trial') {
      navigate('/dashboard', { replace: true });
    }
  }, [state.kind, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Trial ended</p>
          <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Pick a plan to keep going.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Your 30-day free trial has ended. Choose a plan to restore full access — everything you built stays exactly as you left it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {PLAN_TIERS.map((tier) => {
            const featured = tier.id === 'director_60';
            const priceLabel = tier.quote ? `From ${formatPrice(tier.monthlyCents)}` : formatPrice(tier.monthlyCents);
            const monthsFree = monthsFreeFor(tier);
            return (
              <div
                key={tier.id}
                className={cn(
                  'relative rounded-3xl flex flex-col p-6 sm:p-8',
                  featured ? 'shadow-2xl ring-2 ring-violet-500' : 'shadow-sm border border-slate-200',
                )}
                style={{ background: TIER_PASTELS[tier.id] }}
              >
                {featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
                  >
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900 mb-1">{tier.label}</h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-[2.5rem]" title={tier.tagline}>{tier.tagline}</p>
                <div className="mb-2">
                  <span className="text-5xl font-bold text-slate-900">{priceLabel}</span>
                  <span className="text-base text-slate-600">/mo</span>
                </div>
                {monthsFree >= 1 && (
                  <p className="text-xs text-slate-500 mb-5">
                    Annual {formatPrice(tier.annualCents)} · {monthsFree} month{monthsFree === 1 ? '' : 's'} free
                  </p>
                )}
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {/* create-plan-checkout isn't wired to the new tier ids yet.
                    Until it is, the button opens a mailto so nobody is stuck
                    without a way to reach us to reactivate. */}
                <a
                  href={`mailto:kevin@gleeworld.org?subject=Reactivate%20-%20${encodeURIComponent(tier.label)}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                  style={featured
                    ? { background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }
                    : { backgroundColor: '#0f172a' }}
                >
                  Choose Plan
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10 text-sm text-slate-500">
          Have a question? <a href="mailto:kevin@gleeworld.org" className="text-primary underline">Email us</a>.
          {user && (
            <>
              {' '}
              <span className="mx-1 text-slate-300">·</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={async () => { await supabase.auth.signOut(); navigate('/auth', { replace: true }); }}
              >
                <LogOut className="w-3 h-3 mr-1" /> Sign out
              </Button>
            </>
          )}
          {!user && (
            <>
              {' '}
              <span className="mx-1 text-slate-300">·</span>
              <Link to="/auth" className="text-primary underline">Sign in</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
