// Shared read of the tenant's Stripe Connect status (gw_tenants columns).
// Extracted from BoxOfficePage so any add-on that runs on the tenant's own
// Connect account (Box Office, Store, ...) can show the same "Connect your
// Stripe account" flow without duplicating the query.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantStripeStatus {
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
}

export function useTenantStripeStatus() {
  // gw_tenants has no RLS isolation, so we explicitly scope by the
  // subdomain's bootstrap slug — the same source useBrandingSettings uses.
  // Without this, supabase-js returns the first row in the table (typically
  // "main"), which has no stripe_account_id and silently mis-renders the
  // "Connect Stripe" state for tenants that have already connected.
  const tenantSlug = typeof window !== 'undefined'
    ? (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant ?? null
    : null;

  return useQuery<TenantStripeStatus | null>({
    queryKey: ['tenant_stripe_status', tenantSlug],
    enabled: !!tenantSlug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tenants')
        .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('slug', tenantSlug!)
        .maybeSingle();
      if (error) {
        console.warn('[useTenantStripeStatus] query failed', error.message);
        return null;
      }
      return data as TenantStripeStatus | null;
    },
    staleTime: 30_000,
  });
}
