// Reads the current tenant's Stripe Connect status from gw_tenants.
// Aligns with useTenantStripeStatus – uses window.__TENANT_CONFIG__.tenant
// (slug) to scope the query, the same subdomain-aware pattern that avoids
// accidentally reading the "main" tenant row (no RLS isolation on gw_tenants).
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TenantStripeConnectStatus {
  enabled: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  loading: boolean;
}

const DEFAULT_STATE: TenantStripeConnectStatus = {
  enabled: false,
  accountId: null,
  chargesEnabled: false,
  payoutsEnabled: false,
  loading: true,
};

export function useTenantStripeConnect(): TenantStripeConnectStatus {
  const [state, setState] = useState<TenantStripeConnectStatus>(DEFAULT_STATE);

  useEffect(() => {
    const tenantSlug =
      typeof window !== 'undefined'
        ? (
            window as { __TENANT_CONFIG__?: { tenant?: string } }
          ).__TENANT_CONFIG__?.tenant ?? null
        : null;

    if (!tenantSlug) {
      setState({ ...DEFAULT_STATE, loading: false });
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('gw_tenants')
        .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
        .eq('slug', tenantSlug)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        console.warn('[useTenantStripeConnect] query failed', error?.message);
        setState({ ...DEFAULT_STATE, loading: false });
        return;
      }

      const chargesEnabled = !!data.stripe_charges_enabled;
      setState({
        enabled: chargesEnabled,
        accountId: data.stripe_account_id ?? null,
        chargesEnabled,
        payoutsEnabled: !!data.stripe_payouts_enabled,
        loading: false,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
