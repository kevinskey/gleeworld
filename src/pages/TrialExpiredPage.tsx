// Full-viewport paywall shown to any tenant whose 30-day trial has ended.
// The route (/paywall) is registered publicly (no ProtectedRoute wrapper) so
// TrialGuard can redirect any protected route here without recursion. The
// page itself still uses useAuth to keep the sign-out link honest; a
// signed-out visitor sees the marketing lockout view instead of a broken
// mutation button.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { PLAN_TIERS, TIER_PASTELS, formatPrice, monthsFreeFor, tierIsSelfServe } from '@/lib/planTiers';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function TrialExpiredPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading: roleLoading, isAdmin } = useUserRole();
  const state = useTrialStatus();

  // Billing UI is admin-only: signed-in non-admins get a neutral lockout with
  // no tiers or prices. Signed-out visitors keep the marketing view (pricing
  // is public on the landing page anyway). While auth is bootstrapping (user
  // is momentarily null during session restore) or a signed-in user's role is
  // resolving, neither variant renders — no pricing flash for students.
  const showPricing = (!authLoading && !user) || (!!user && !roleLoading && isAdmin());
  const showMemberLockout = !!user && !roleLoading && !isAdmin();

  // Self-serve checkout (signed-in admins only — signed-out visitors keep the
  // mailto fallback since create-plan-checkout needs their session). Cycle
  // mirrors the workspace Plan tab's Monthly/Annual toggle.
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const startCheckout = async (planId: string) => {
    setPendingTier(planId);
    setCheckoutError(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-plan-checkout', {
        body: { plan_id: planId, billing_cycle: cycle, tenant_slug: getTenantSlug() },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (url) { window.location.href = url; return; }
      throw new Error('No checkout URL returned');
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed — please try again or email us.');
    } finally {
      setPendingTier(null);
    }
  };

  // If a user lands here but their trial isn't actually expired (e.g. clicked
  // an old link, or the guard fired stale) bounce them home so they don't get
  // wedged on a paywall they don't need.
  useEffect(() => {
    if (state.kind === 'grandfathered' || state.kind === 'paid' || state.kind === 'trial') {
      navigate('/dashboard', { replace: true });
    }
  }, [state.kind, navigate]);

  return (
    <PublicLayout>
    <div className="py-10 sm:py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Trial ended</p>
          {showMemberLockout ? (
            <>
              <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
                This workspace is paused.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
                This workspace&apos;s free period has ended. Please ask your workspace admin to
                choose a plan to restore access — everything is saved and waiting.
              </p>
            </>
          ) : showPricing ? (
            <>
              <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
                Pick a plan to keep going.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
                {/* No trial-length claim here: the free window varies (30-day
                    signups vs. the extended fall 2026 period). */}
                Your free trial has ended. Choose a plan to restore full access — everything you built stays exactly as you left it.
              </p>
            </>
          ) : null}
        </div>

        {showPricing && (
        <>
        {user && (
          <div className="flex justify-center items-center gap-2 mb-8">
            <button
              type="button"
              onClick={() => setCycle('monthly')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${cycle === 'monthly' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle('annual')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${cycle === 'annual' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
            >
              Annual <span className="text-xs opacity-70">(save 2 months)</span>
            </button>
          </div>
        )}
        {checkoutError && (
          <p className="text-center text-sm text-red-600 mb-6">{checkoutError}</p>
        )}
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
                {!user ? (
                  // Signed-out visitors can't start a session-authenticated
                  // checkout — keep the reach-us mailto for them.
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
                ) : tier.scope !== 'tenant' ? (
                  <p className="text-xs text-slate-500">
                    Individual plan — sign up from your personal account, not the workspace.
                  </p>
                ) : !tierIsSelfServe(tier) ? (
                  <a
                    href={`mailto:kevin@gleeworld.org?subject=${encodeURIComponent(`${tier.label} plan quote`)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
                    style={{ backgroundColor: '#0f172a' }}
                  >
                    Contact us
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={pendingTier !== null}
                    onClick={() => startCheckout(tier.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={featured
                      ? { background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }
                      : { backgroundColor: '#0f172a' }}
                  >
                    {pendingTier === tier.id ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        Choose Plan
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        </>
        )}

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
    </PublicLayout>
  );
}
