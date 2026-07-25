// Fundraising store card — enable + status + one-click store admin.
//
// Rendered inside FinancialManagement (Finance section) since the
// tenant's fundraising apparel revenue naturally belongs alongside
// dues, payments, and budgets. Talks to two edge functions:
//   • provision-tsb-store — creates or fetches the tenant's TSB group store
//   • tsb-store-sso — mints a short-lived JWT + admin URL for one-click login

import { useCallback, useEffect, useState } from 'react';
import { Store, ExternalLink, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';

interface StoreState {
  slug: string | null;
  subdomain: string | null;
  name: string | null;
  storefront_url: string | null;
  admin_url: string | null;
}

export function FundraisingStoreSection() {
  const { isSuperAdmin, isAdmin } = useUserRole();
  const canManage = isSuperAdmin() || isAdmin();

  const [state, setState] = useState<StoreState | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [openingAdmin, setOpeningAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error('Not signed in');
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('tenant_id')
        .eq('user_id', userRes.user.id)
        .maybeSingle();
      if (!profile?.tenant_id) throw new Error('Profile has no tenant');
      const { data: tenant } = await supabase
        .from('gw_tenants')
        .select('tsb_store_slug, tsb_store_subdomain, name')
        .eq('id', profile.tenant_id)
        .maybeSingle();
      if (!tenant?.tsb_store_slug) {
        setState({ slug: null, subdomain: null, name: null, storefront_url: null, admin_url: null });
      } else {
        const base = tenant.tsb_store_subdomain
          ? `https://${tenant.tsb_store_subdomain}.tshirtbrothers.com`
          : `https://tshirtbrothers.com/stores/${tenant.tsb_store_slug}`;
        setState({
          slug: tenant.tsb_store_slug,
          subdomain: tenant.tsb_store_subdomain,
          name: tenant.name,
          storefront_url: base,
          admin_url: `${base}/admin`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load store status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadState(); }, [loadState]);

  const enableStore = async () => {
    setProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-tsb-store', {});
      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || 'Provisioning returned no data');
      toast.success(data.created ? 'Fundraising store enabled.' : 'Store already existed — linked back.');
      await loadState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setProvisioning(false);
    }
  };

  const openAdmin = async () => {
    setOpeningAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke('tsb-store-sso', {});
      if (error) throw error;
      if (!data?.admin_url) throw new Error('SSO returned no admin URL');
      window.open(data.admin_url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open store admin');
    } finally {
      setOpeningAdmin(false);
    }
  };

  return (
    <div className="border border-border rounded-lg bg-card divide-y divide-border">
      <div className="px-3 py-2 bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
        <Store className="w-3.5 h-3.5" />
        Fundraising Store
      </div>
      <div className="px-3 py-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking store status…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        ) : !state?.slug ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Turn on your branded apparel storefront powered by T-Shirt Brothers.
              TSB handles design, print, shipping, and returns; you keep 15% of every sale.
            </div>
            <Button
              onClick={enableStore}
              disabled={!canManage || provisioning}
              size="sm"
            >
              {provisioning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Enable Fundraising Store</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-semibold">{state.name || state.slug}</span>
              <span className="text-muted-foreground"> · {state.storefront_url?.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={state.storefront_url!} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View storefront
                </a>
              </Button>
              <Button
                onClick={openAdmin}
                disabled={!canManage || openingAdmin}
                size="sm"
              >
                {openingAdmin ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Opening…</>
                ) : (
                  <><ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Manage store</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
