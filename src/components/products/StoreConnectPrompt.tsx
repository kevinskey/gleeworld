// Store admin — Stripe Connect prompt.
//
// The tenant Store runs on the tenant's own Stripe account via Stripe's
// Standard OAuth flow. When the admin clicks "Connect with Stripe":
//   1. We call `stripe-oauth-start` to mint a signed state token, and
//      redirect them to connect.stripe.com/oauth/authorize.
//   2. Stripe's own page lets them create a new Stripe account or sign in
//      to an existing one — the account is theirs, not GleeWorld's.
//   3. Stripe posts back to `stripe-oauth-callback`, which persists the
//      stripe_user_id and returns them here with ?stripe=connected.
//   4. The account.updated webhook keeps charges/payouts state fresh.
//
// Renders nothing once the tenant is fully connected (charges_enabled),
// so it reads as a banner at the top of the Store admin rather than a
// gate — the catalog can still be built before Stripe is finished.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantStripeStatus } from '@/hooks/useTenantStripeStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RETURN_PATH = '/dashboard/store';

export function StoreConnectPrompt() {
  const { data: stripe, isLoading } = useTenantStripeStatus();
  const [connecting, setConnecting] = useState(false);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const stripeParam = searchParams.get('stripe');
  const stripeErrorReason = searchParams.get('reason');

  // On Stripe's return, the callback edge fn has already persisted the
  // stripe_user_id + snapshot of charges_enabled. But the account.updated
  // webhook may still be catching up, so poll a few times.
  useEffect(() => {
    if (stripeParam !== 'connected') return;
    const kick = () => queryClient.invalidateQueries({ queryKey: ['tenant_stripe_status'] });
    kick();
    const t1 = setTimeout(kick, 2000);
    const t2 = setTimeout(kick, 5000);
    const t3 = setTimeout(kick, 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [stripeParam, queryClient]);

  const startConnect = async () => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke('stripe-oauth-start', {
        body: { return_path: RETURN_PATH },
      });
      if (error) throw new Error(error.message || 'failed');
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('No onboarding URL returned');
      window.location.href = data.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start Stripe onboarding.';
      toast.error(msg);
      setConnecting(false);
    }
  };

  if (isLoading) return null;

  const connected = !!stripe?.stripe_account_id;
  const ready = connected && stripe?.stripe_charges_enabled;

  // Post-connect success flash — shown once, before the row settles into "no
  // banner" state on the next status query.
  if (ready) {
    if (stripeParam === 'connected') {
      return (
        <div className="border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-3 mb-6 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Stripe connected. You're ready to accept payments.</div>
            <p className="text-sm mt-0.5">Money from your Store lands in your Stripe account. Manage it any time from your Stripe Dashboard.</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // Stripe-side error (user cancelled, Stripe rejected, etc). Show a plain
  // message and let them retry.
  if (stripeParam === 'error') {
    return (
      <div className="border border-status-warning-border bg-status-warning-bg text-status-warning-fg px-4 py-3 mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Stripe connection didn't finish</div>
          <p className="text-sm mt-0.5">
            {stripeErrorReason ? `Reason: ${stripeErrorReason}.` : 'The connection was cancelled or interrupted.'} You can start over any time.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button size="sm" onClick={startConnect} disabled={connecting}>
              {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-status-warning-border bg-status-warning-bg text-status-warning-fg px-4 py-3 mb-6 flex items-start gap-3">
      <CreditCard className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">
          {connected ? 'Finish connecting your Stripe account' : 'Set up payments with Stripe'}
        </div>
        <p className="text-sm mt-0.5">
          {connected
            ? "Your Stripe account is linked but charges aren't enabled yet. Finish the remaining verification steps to start taking payments."
            : "You'll be sent to Stripe to create a new Stripe account or sign in to yours. Store payments go directly to your Stripe — GleeWorld never holds the funds."}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button size="sm" onClick={startConnect} disabled={connecting}>
            {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            {connected ? 'Finish on Stripe' : 'Connect with Stripe'}
          </Button>
          {connected && (
            <Button asChild size="sm" variant="outline">
              <a href="https://dashboard.stripe.com" target="_blank" rel="noreferrer">
                Stripe Dashboard <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
