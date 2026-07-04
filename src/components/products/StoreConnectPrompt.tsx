// Store admin — Stripe Connect prompt.
//
// The tenant Store runs on the tenant's own Stripe Connect (Standard)
// account, exactly like Box Office. Rather than standing up a second
// onboarding flow, this reuses the existing `box-office-connect-onboarding`
// edge function — it already creates/resumes the Connect account keyed on
// gw_tenants.stripe_account_id, which both add-ons read from. See the
// Box Office equivalent at src/pages/dashboard/BoxOfficePage.tsx.
//
// Renders nothing once the tenant is fully connected (charges_enabled),
// so it reads as a banner at the top of the Store admin rather than a
// gate — the catalog can still be built before Stripe is finished.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTenantStripeStatus } from '@/hooks/useTenantStripeStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function StoreConnectPrompt() {
  const { data: stripe, isLoading } = useTenantStripeStatus();
  const [connecting, setConnecting] = useState(false);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Stripe redirects back with ?stripe=return after onboarding. Box Office's
  // return_url is hardcoded to /dashboard/box-office (it doesn't know which
  // add-on started the flow), so a Store-initiated connect lands the admin
  // back on Box Office rather than here. The tenant's stripe_account_id is
  // shared across add-ons, so the connection itself still completes — this
  // is a UX rough edge to fix in the edge function later, not a data bug.
  if (searchParams.get('stripe') === 'return') {
    queryClient.invalidateQueries({ queryKey: ['tenant_stripe_status'] });
  }

  const startConnect = async () => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke('box-office-connect-onboarding');
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
  if (ready) return null;

  return (
    <div className="border border-status-warning-border bg-status-warning-bg text-status-warning-fg px-4 py-3 mb-6 flex items-start gap-3">
      <CreditCard className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">
          {connected ? 'Finish connecting your Stripe account' : 'Connect your Stripe to accept payments'}
        </div>
        <p className="text-sm mt-0.5">
          {connected
            ? "You started Stripe Connect setup but charges aren't enabled yet. Finish the remaining steps to start taking payments."
            : 'The Store runs on Stripe Connect, so order payments go directly to your own account — GleeWorld never holds the funds. Setup takes a few minutes.'}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button size="sm" onClick={startConnect} disabled={connecting}>
            {connecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            {connected ? 'Finish onboarding' : 'Connect Stripe'}
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
