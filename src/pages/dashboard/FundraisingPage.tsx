// Fundraising store status + entry point for a tenant. Talks to two
// edge functions:
//   • provision-tsb-store — creates or fetches the tenant's TSB group store
//   • tsb-store-sso — mints a short-lived JWT + admin URL for one-click login
//
// Layout: a single card. Not-enabled state → CTA. Enabled state → live
// store info + external "View Store" and one-click "Manage Store"
// buttons. No inline TSB order list in v1 — the manage-store button
// deep-links into TSB's existing admin UI where all the depth already
// exists.

import { useCallback, useEffect, useState } from 'react';
import { Store, ExternalLink, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StoreState {
  slug: string | null;
  subdomain: string | null;
  name: string | null;
  storefront_url: string | null;
  admin_url: string | null;
}

export default function FundraisingPage() {
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
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="Fundraising Store"
          subtitle="Sell branded apparel powered by T-Shirt Brothers. TSB fulfills orders; a slice of margin routes back to your organization."
        >
          {!canManage && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 mb-4">
              Only workspace admins can enable or manage the store.
            </Badge>
          )}

          <div className="rounded-2xl bg-card p-6 max-w-2xl" style={{ boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)' }}>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Checking store status…
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            ) : !state?.slug ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">No store yet</div>
                    <div className="text-sm text-muted-foreground">
                      Turn on your fundraising storefront in one click. TSB handles design, print,
                      shipping, and returns; you get a per-sale contribution and a live order dashboard.
                    </div>
                  </div>
                </div>
                <Button
                  onClick={enableStore}
                  disabled={!canManage || provisioning}
                  className="w-full sm:w-auto"
                >
                  {provisioning ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enabling…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Enable Fundraising Store</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{state.name || state.slug}</div>
                    <div className="text-sm text-muted-foreground break-all">
                      {state.storefront_url?.replace(/^https?:\/\//, '')}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild variant="outline" className="justify-between">
                    <a href={state.storefront_url!} target="_blank" rel="noopener noreferrer">
                      View storefront <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    onClick={openAdmin}
                    disabled={!canManage || openingAdmin}
                    className="justify-between"
                  >
                    {openingAdmin ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening…</>
                    ) : (
                      <>Manage store <ExternalLink className="w-4 h-4" /></>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Manage-store uses one-click sign-in from your GleeWorld account — no email code needed.
                  Product catalog + design center live on the TSB side.
                </p>
              </div>
            )}
          </div>
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
}
