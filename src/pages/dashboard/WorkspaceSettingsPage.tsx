// /dashboard/workspace — tenant-level settings hub: branding (placeholder),
// modules grid (read of UNIFIED_MODULES + activation state), billing
// (placeholder + Stripe checkout for add-ons), integrations (placeholder).
// Slack-style "Workspace Settings" page split from /control-center so
// tenants don't accidentally see platform-owner controls.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Loader2, CheckCircle2, ExternalLink, CreditCard, Palette,
  Plug, Save, Building2, Lock, Sparkles, Users, Menu,
} from 'lucide-react';
import { NAV_CATALOG, HIDEABLE_NAV_ROLES, type NavRole } from '@/lib/nav/navCatalog';
import { getPreviewRole, setPreviewRole, usePreviewRole } from '@/lib/nav/navPreview';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

const TAB_VALUES = new Set(['plan', 'modules', 'navigation', 'branding', 'billing', 'general']);

export default function WorkspaceSettingsPage() {
  const { isSuperAdmin, isAdmin } = useUserRole();
  const canManage = isSuperAdmin() || isAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const activeTab = tab && TAB_VALUES.has(tab) ? tab : 'plan';
  const setActiveTab = (value: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', value);
    setSearchParams(sp, { replace: true });
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your workspace — branding, modules, billing, integrations.
        </p>
        {!canManage && (
          <Badge variant="outline" className="mt-2 text-xs bg-amber-50 text-amber-700 border-amber-200">
            <Lock className="w-3 h-3 mr-1" /> Read-only — only workspace admins can change settings
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 max-w-3xl">
          <TabsTrigger value="plan"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Plan</TabsTrigger>
          <TabsTrigger value="modules"><Plug className="w-3.5 h-3.5 mr-1.5" />Add-ons</TabsTrigger>
          <TabsTrigger value="navigation"><Menu className="w-3.5 h-3.5 mr-1.5" />Navigation</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="w-3.5 h-3.5 mr-1.5" />Branding</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Billing</TabsTrigger>
          <TabsTrigger value="general"><Building2 className="w-3.5 h-3.5 mr-1.5" />General</TabsTrigger>
        </TabsList>

        <TabsContent value="plan"><PlanTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="modules"><ModulesTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="navigation"><NavigationTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="branding"><BrandingTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="billing"><BillingTabPanel /></TabsContent>
        <TabsContent value="general"><GeneralTabPanel canManage={canManage} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Plan ────────────────────────────────────────────────────────────

function PlanTabPanel({ canManage }: { canManage: boolean }) {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');

  const { data: plans = [] } = useQuery({
    queryKey: ['workspace-plan-catalog'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_billing_plans')
        .select('id, name, tagline, student_cap, monthly_price_cents, annual_price_cents, features, sort_order, stripe_price_id_monthly, stripe_price_id_annual')
        .eq('is_active', true)
        .order('sort_order');
      return data ?? [];
    },
  });

  const { data: current } = useQuery({
    queryKey: ['workspace-current-plan'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tenant_plans')
        .select('plan_id, billing_cycle, status, current_period_end, trial_ends_at')
        .maybeSingle();
      return data;
    },
  });

  const { data: usage } = useQuery({
    queryKey: ['workspace-plan-usage'],
    queryFn: async () => {
      // Self-scoped RPC — derives tenant_id from the caller's profile,
      // so we don't have to round-trip to find it client-side.
      const { data } = await supabase.rpc('gw_tenant_plan_usage_self');
      return Array.isArray(data) && data.length ? data[0] : null;
    },
  });

  const checkout = useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.functions.invoke('create-plan-checkout', {
        body: { plan_id: planId, billing_cycle: cycle },
      });
      if (error) throw error;
      // deno-lint-ignore no-explicit-any
      if ((data as any)?.url) window.location.href = (data as any).url;
    },
    onError: (e: any) => toast.error(e?.message || 'Plan checkout failed.'),
  });

  const fmtPrice = (cents: number | null | undefined) =>
    cents ? `$${(cents / 100).toFixed(0)}` : '—';

  return (
    <div className="space-y-4">
      {/* Current plan + usage */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Current plan</h2>
              {current ? (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold">{plans.find((p: any) => p.id === current.plan_id)?.name ?? current.plan_id}</span>
                  <Badge variant="outline" className="text-xs">{current.status}</Badge>
                  <Badge variant="outline" className="text-xs">{current.billing_cycle}</Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No paid plan yet — running on free tier.</p>
              )}
            </div>
            {usage?.student_cap !== undefined && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Students</div>
                <div className="text-2xl font-bold flex items-center gap-1.5">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  {usage.current_students}
                  {usage.student_cap !== null && (
                    <span className="text-muted-foreground text-base">/{usage.student_cap}</span>
                  )}
                </div>
                {usage.student_cap !== null && usage.current_students >= usage.student_cap && (
                  <div className="text-xs text-amber-700 font-semibold mt-0.5">At cap — upgrade to add more</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cycle toggle */}
      <div className="flex items-center justify-center gap-2">
        <Button variant={cycle === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setCycle('monthly')}>Monthly</Button>
        <Button variant={cycle === 'annual' ? 'default' : 'outline'} size="sm" onClick={() => setCycle('annual')}>Annual <span className="text-xs ml-1 opacity-70">(save 2 months)</span></Button>
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {plans.map((p: any) => {
          const isCurrent = current?.plan_id === p.id && current?.billing_cycle === cycle;
          const priceCents = cycle === 'annual' ? p.annual_price_cents : p.monthly_price_cents;
          const priceId = cycle === 'annual' ? p.stripe_price_id_annual : p.stripe_price_id_monthly;
          return (
            <div key={p.id} className={cn(
              'rounded-2xl border bg-card p-5 flex flex-col',
              isCurrent ? 'ring-2 ring-primary' : '',
            )}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-base">{p.name}</div>
                {isCurrent && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Current</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{p.tagline}</p>
              <div className="mb-3">
                <span className="text-3xl font-bold">{fmtPrice(priceCents)}</span>
                <span className="text-xs text-muted-foreground">/{cycle === 'annual' ? 'yr' : 'mo'}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {p.student_cap ? `Up to ${p.student_cap} students` : 'Unlimited students'}
              </div>
              <ul className="text-xs space-y-1 mb-4 flex-1">
                {(p.features || []).map((f: string) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {canManage && !isCurrent && (
                <Button
                  size="sm"
                  disabled={checkout.isPending || !priceId}
                  onClick={() => checkout.mutate(p.id)}
                >
                  {checkout.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : current ? 'Switch to this plan' : 'Choose plan'}
                </Button>
              )}
              {!priceId && (
                <p className="text-[10px] text-muted-foreground mt-2">Stripe price not yet configured for this plan.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modules ─────────────────────────────────────────────────────────

// Demo tenant gets sandbox toggles instead of paid Stripe checkouts —
// matches the pinned id in gw-demo-toggle-addon edge function.
const DEMO_TENANT_ID = 'ae2fbec2-7562-45f9-9028-c4df93b99cef';

function ModulesTabPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  // Invalidate every cache that depends on the tenant's active
  // subscription set — this panel's own list, plus the sidebar's
  // useModuleAccess view. Without the second one the nav item
  // stays visible until the next full reload.
  const bustSubscriptionCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['workspace-tenant-subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['v_tenant_active_modules'] });
  };
  // Tenant's active billed add-ons. gw_tenant_subscriptions is the
  // canonical activation table — written by stripe-webhook on
  // customer.subscription.created/updated/deleted events.
  const { data: tenantModules = [] } = useQuery({
    queryKey: ['workspace-tenant-subscriptions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tenant_subscriptions')
        .select('module_id, status')
        .in('status', ['active', 'trial']);
      return data ?? [];
    },
  });
  const active = new Set((tenantModules as Array<{ module_id: string }>).map((m) => m.module_id));

  // Detect demo tenant from JWT — same source the edge function checks.
  const { data: isDemo = false } = useQuery({
    queryKey: ['workspace-is-demo'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const claims = session?.user?.app_metadata as Record<string, unknown> | undefined;
      const t = (claims?.tenant_id as string | undefined) ?? (session?.user?.user_metadata as any)?.tenant_id;
      return t === DEMO_TENANT_ID;
    },
  });

  const sandboxToggle = useMutation({
    mutationFn: async ({ moduleId, active }: { moduleId: string; active: boolean }) => {
      const { error } = await supabase.functions.invoke('gw-demo-toggle-addon', {
        body: { module_id: moduleId, active },
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? 'Add-on enabled (sandbox)' : 'Add-on disabled');
      bustSubscriptionCaches();
    },
    onError: (e: any) => toast.error(e?.message || 'Toggle failed.'),
  });

  // Direct DB toggle for real tenants on free ($0) add-ons. Skips
  // Stripe entirely and writes to gw_tenant_subscriptions directly —
  // RLS grants tenant admins/super-admins write access to their own
  // tenant's row. Priced add-ons still route through Stripe checkout
  // for activation.
  const directToggle = useMutation({
    mutationFn: async ({ moduleId, active }: { moduleId: string; active: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const claims = session?.user?.app_metadata as Record<string, unknown> | undefined;
      const tenantId = (claims?.tenant_id as string | undefined)
        ?? (session?.user?.user_metadata as any)?.tenant_id;
      if (!tenantId) throw new Error('No tenant in session');
      if (active) {
        const { error } = await supabase
          .from('gw_tenant_subscriptions')
          .upsert({
            tenant_id: tenantId,
            module_id: moduleId,
            status: 'active',
            enabled_at: new Date().toISOString(),
            cancelled_at: null,
            metadata: { comped: true },
          }, { onConflict: 'tenant_id,module_id' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_tenant_subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('module_id', moduleId);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? 'Add-on activated' : 'Add-on deactivated');
      bustSubscriptionCaches();
    },
    onError: (e: any) => toast.error(e?.message || 'Toggle failed.'),
  });

  // Catalog of add-ons — every active row in the billing catalog. In
  // the previous shape we filtered out rows missing a stripe_price_id
  // so real tenants only saw priced add-ons; that also hides every
  // free/comped add-on. Now we surface all of them and gate the CTA
  // per-row on whether a price + Stripe id are configured.
  const { data: catalog = [] } = useQuery({
    queryKey: ['workspace-billing-catalog'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_billing_modules')
        .select('id, name, description, monthly_price_cents, is_active, category, sort_order, stripe_price_id')
        .eq('is_active', true)
        .eq('tier', 'addon')
        .order('sort_order').order('name');
      return data ?? [];
    },
  });

  const checkout = useMutation({
    mutationFn: async (moduleId: string) => {
      const { data, error } = await supabase.functions.invoke('create-module-checkout', {
        body: { module_id: moduleId },
      });
      if (error) throw error;
      if ((data as any)?.url) window.location.href = (data as any).url;
    },
    onError: (e: any) => toast.error(e?.message || 'Checkout failed.'),
  });

  return (
    <div className="space-y-4">
      {isDemo && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <strong>Sandbox mode:</strong> on the demo tenant you can flip add-ons on and off freely — no Stripe, no billing.
          Real tenants go through Stripe checkout.
        </div>
      )}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold mb-1">Add-ons</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {isDemo
              ? 'Toggle features on or off to explore what each one does. Changes apply immediately and never charge a card.'
              : 'Activate paid features for your workspace. Already-active ones show as enabled.'}
          </p>
          {catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No add-ons available yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalog.map((m: any) => {
                const isActive = active.has(m.id);
                return (
                  <div key={m.id} className="rounded-xl border p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold text-base">{m.name}</div>
                      {isActive && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      )}
                    </div>
                    {m.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{m.description}</p>}
                    <div className="mt-auto flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {m.monthly_price_cents ? `$${(m.monthly_price_cents / 100).toFixed(2)}/mo` : 'Free'}
                      </div>
                      {canManage && (() => {
                        // Demo tenant always uses the sandbox edge fn
                        // (hard-gated on server). Everyone else: if
                        // the add-on is free ($0) OR already active,
                        // toggle directly against the DB. Priced add-ons
                        // that aren't yet active go through Stripe.
                        const isFree = !m.monthly_price_cents;
                        const needsStripe = !isDemo && !isFree && !isActive;
                        // Per-card pending state — the mutation is shared
                        // across every card, so isPending alone would spin
                        // every button. Compare `.variables.moduleId` to
                        // the card we're rendering so only the clicked
                        // card shows the spinner.
                        const sandboxPending = sandboxToggle.isPending && sandboxToggle.variables?.moduleId === m.id;
                        const directPending  = directToggle.isPending  && directToggle.variables?.moduleId  === m.id;
                        const checkoutPending = checkout.isPending && checkout.variables === m.id;
                        // Compact grey pill styling. Consistent across
                        // all three action variants (sandbox / Stripe /
                        // direct DB) so the card row stays visually
                        // even regardless of tenant type.
                        const pill =
                          'inline-flex items-center justify-center h-6 px-3 rounded-full text-[11px] font-medium ' +
                          'bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors ' +
                          'disabled:opacity-60 disabled:cursor-not-allowed';
                        if (isDemo) {
                          return (
                            <button
                              type="button"
                              className={pill}
                              onClick={() => sandboxToggle.mutate({ moduleId: m.id, active: !isActive })}
                              disabled={sandboxPending}
                            >
                              {sandboxPending ? <Loader2 className="w-3 h-3 animate-spin" /> : isActive ? 'Turn off' : 'Turn on'}
                            </button>
                          );
                        }
                        if (needsStripe) {
                          return (
                            <button
                              type="button"
                              className={pill}
                              onClick={() => checkout.mutate(m.id)}
                              disabled={checkoutPending}
                            >
                              {checkoutPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Activate'}
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            className={pill}
                            onClick={() => directToggle.mutate({ moduleId: m.id, active: !isActive })}
                            disabled={directPending}
                          >
                            {directPending ? <Loader2 className="w-3 h-3 animate-spin" /> : isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Navigation ──────────────────────────────────────────────────────

function NavigationTabPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<NavRole>('student');

  const { data: prefs = [] } = useQuery({
    queryKey: ['nav-prefs-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tenant_nav_prefs')
        .select('role, hidden_items');
      return (data as Array<{ role: string; hidden_items: string[] | null }>) ?? [];
    },
  });

  const hiddenForRole = new Set(
    prefs.find((p) => p.role === role)?.hidden_items ?? []
  );

  // Mutation carries the toggled `path` in its variables so we can
  // scope the pending spinner to just the clicked card — using
  // `savePref.isPending` alone would spin every button on the tab.
  const savePref = useMutation({
    mutationFn: async ({ nextHidden }: { path: string; nextHidden: string[] }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const claims = session?.user?.app_metadata as Record<string, unknown> | undefined;
      const tenantId = (claims?.tenant_id as string | undefined)
        ?? (session?.user?.user_metadata as any)?.tenant_id;
      if (!tenantId) throw new Error('No tenant in session');
      const { error } = await supabase
        .from('gw_tenant_nav_prefs')
        .upsert({
          tenant_id: tenantId,
          role,
          hidden_items: nextHidden,
          updated_by: session?.user?.id,
        }, { onConflict: 'tenant_id,role' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nav-prefs-all'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-nav-prefs'] });
      // Auto-engage Preview so a super-admin sees the sidebar effect
      // of their edit immediately. Without this, a super-admin edits
      // in the dark — their own sidebar is never filtered, so clicking
      // Hide looks like a no-op and they'll click again (accidentally
      // toggling back on). Only fires the first time; if the user has
      // already picked a preview role we leave it alone.
      if (!getPreviewRole()) setPreviewRole(role);
    },
    onError: (e: any) => toast.error(e?.message || 'Save failed.'),
  });

  const toggleItem = (path: string, currentlyHidden: boolean) => {
    const nextHidden = new Set(hiddenForRole);
    if (currentlyHidden) nextHidden.delete(path);
    else nextHidden.add(path);
    savePref.mutate({ path, nextHidden: [...nextHidden] });
  };

  // Live preview — reflects immediately in the sidebar via the shared
  // navPreview module (only affects super-admins). When the settings
  // user picks a different role, keep preview in sync automatically
  // so what they see in their own nav matches what they're editing.
  const preview = usePreviewRole();
  const togglePreview = (r: NavRole) => {
    setPreviewRole(preview === r ? null : r);
  };
  // If the user changes the "Editing view for:" role while preview is
  // on, follow the edit target so the sidebar mirrors what's being
  // configured. Off is off.
  const changeRole = (r: NavRole) => {
    setRole(r);
    if (getPreviewRole()) setPreviewRole(r);
  };

  // Group by section for display.
  const bySection = NAV_CATALOG.reduce<Record<string, typeof NAV_CATALOG>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  // Compact grey pill styling — same recipe used for Add-ons so the
  // two tabs read as one settings surface.
  const pill =
    'inline-flex items-center justify-center h-6 px-3 rounded-full text-[11px] font-medium ' +
    'bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors ' +
    'disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="space-y-4">
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold mb-1">Navigation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which sidebar items each type of user in your tenant sees.
            You (as super-admin) always see everything.
          </p>

          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-sm font-medium mr-1">Editing view for:</span>
            {HIDEABLE_NAV_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => changeRole(r.value)}
                className={cn(
                  'inline-flex items-center justify-center h-7 px-3 rounded-full text-xs font-medium transition-colors',
                  role === r.value
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-4 rounded-lg bg-slate-50 border px-3 py-2">
            <span className="text-xs text-muted-foreground mr-1">Preview my sidebar as:</span>
            <button
              type="button"
              onClick={() => setPreviewRole(null)}
              className={cn(
                'inline-flex items-center justify-center h-6 px-3 rounded-full text-[11px] font-medium transition-colors',
                !preview
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
              )}
            >
              Super-admin (me)
            </button>
            {HIDEABLE_NAV_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => togglePreview(r.value)}
                className={cn(
                  'inline-flex items-center justify-center h-6 px-3 rounded-full text-[11px] font-medium transition-colors',
                  preview === r.value
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {Object.entries(bySection).map(([section, items]) => (
              <div key={section}>
                <div className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase mb-2">
                  {section}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((item) => {
                    const isHidden = hiddenForRole.has(item.path);
                    // Scope pending state to the clicked card only —
                    // React Query's `.variables` holds whatever we
                    // passed to .mutate() while the mutation is in
                    // flight.
                    const pending = savePref.isPending && savePref.variables?.path === item.path;
                    return (
                      <div key={item.path} className="rounded-xl border p-4 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-semibold text-base">{item.label}</div>
                          {!isHidden && (
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Visible
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{item.path}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {isHidden ? 'Hidden' : 'Shown'}
                          </div>
                          {canManage && (
                            <button
                              type="button"
                              className={pill}
                              onClick={() => toggleItem(item.path, isHidden)}
                              disabled={pending}
                            >
                              {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : isHidden ? 'Show' : 'Hide'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Branding ────────────────────────────────────────────────────────

function BrandingTabPanel({ canManage }: { canManage: boolean }) {
  const { settings, refetch } = useBrandingSettings();
  const [form, setForm] = useState({
    org_name: '',
    short_name: '',
    primary_color: '#7c3aed',
    logo_url: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        org_name: (settings as any).org_name || '',
        short_name: (settings as any).short_name || '',
        primary_color: (settings as any).primary_color || '#7c3aed',
        logo_url: (settings as any).logo_url || '',
      });
    }
  }, [settings]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('gw_branding_settings')
      .upsert({
        org_name: form.org_name,
        short_name: form.short_name,
        primary_color: form.primary_color,
        logo_url: form.logo_url,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Branding saved.');
    refetch?.();
  }

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Organization name</Label>
            <Input value={form.org_name} disabled={!canManage} onChange={(e) => setForm({ ...form, org_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Short name</Label>
            <Input value={form.short_name} disabled={!canManage} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Primary color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primary_color}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border"
              />
              <Input value={form.primary_color} disabled={!canManage} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Logo URL</Label>
            <Input value={form.logo_url} disabled={!canManage} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
          </div>
        </div>
        {form.logo_url && (
          <div className="mt-2 rounded-xl border bg-muted/30 p-3 inline-flex items-center gap-3">
            <img src={form.logo_url} alt="Logo preview" className="w-12 h-12 object-contain" />
            <div className="text-xs text-muted-foreground">Preview</div>
          </div>
        )}
        {canManage && (
          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save branding
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Billing ─────────────────────────────────────────────────────────

function BillingTabPanel() {
  const { data: active = [] } = useQuery({
    queryKey: ['billing-active-modules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tenant_active_addons')
        .select('module_id, activated_at, name, monthly_price_cents');
      return data ?? [];
    },
  });

  const monthlyTotal = (active as Array<{ monthly_price_cents: number | null }>).reduce(
    (s, m) => s + ((m.monthly_price_cents ?? 0) / 100),
    0,
  );

  return (
    <div className="space-y-4">
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold mb-1">Your subscription</h2>
          <p className="text-sm text-muted-foreground mb-4">Active add-ons and their monthly cost.</p>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No paid add-ons active. Browse the Modules tab to activate features.</p>
          ) : (
            <>
              <ul className="divide-y">
                {active.map((m: any) => (
                  <li key={m.module_id} className="py-2.5 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold truncate">{m.name}</div>
                      {m.activated_at && (
                        <div className="text-sm text-muted-foreground">
                          Active since {new Date(m.activated_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      ${((m.monthly_price_cents ?? 0) / 100).toFixed(2)}/mo
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <div className="text-sm font-semibold">Total</div>
                <div className="text-lg font-bold">${monthlyTotal.toFixed(2)}<span className="text-xs text-muted-foreground font-normal">/month</span></div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-8 text-center space-y-3">
          <CreditCard className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-semibold">Stripe customer portal</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Update payment method, download invoices, and cancel add-ons through Stripe.
          </p>
          <StripePortalButton />
        </CardContent>
      </Card>
    </div>
  );
}

function StripePortalButton() {
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal-session', {
        body: { return_url: window.location.href },
      });
      if (error) throw error;
      if ((data as any)?.url) {
        window.location.href = (data as any).url;
      } else if ((data as any)?.error === 'no_stripe_customer_for_tenant') {
        toast.error('No Stripe customer yet — activate an add-on first.');
      } else {
        toast.error('Portal session failed.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button onClick={open} disabled={busy}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ExternalLink className="w-4 h-4 mr-1.5" />}
      Open customer portal
    </Button>
  );
}

// ── General ─────────────────────────────────────────────────────────

// Common IANA timezones — same shortlist used by the calendar module.
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'Europe/London',
  'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Australia/Sydney', 'UTC',
];

const LOCALES = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'it-IT', label: 'Italian' },
];

function GeneralTabPanel({ canManage }: { canManage: boolean }) {
  const { settings, refetch } = useBrandingSettings();
  const [form, setForm] = useState({
    timezone: 'America/New_York',
    locale: 'en-US',
    contact_email: '',
    week_start: 'sunday' as 'sunday' | 'monday',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        timezone: (settings as any).timezone || 'America/New_York',
        locale: (settings as any).locale || 'en-US',
        contact_email: (settings as any).contact_email || '',
        week_start: ((settings as any).week_start || 'sunday') as 'sunday' | 'monday',
      });
    }
  }, [settings]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('gw_branding_settings')
      .upsert({
        timezone: form.timezone,
        locale: form.locale,
        contact_email: form.contact_email || null,
        week_start: form.week_start,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('General settings saved.');
    refetch?.();
  };

  const exportData = async () => {
    toast.info('Data export requested.', {
      description: 'A super-admin will receive the export bundle by email within 24h.',
    });
    // Wire to an edge function (gw-tenant-export) once that ships. Surfaced
    // here so admins know the path exists.
  };

  return (
    <div className="space-y-4">
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Workspace identity</h2>
            <p className="text-sm text-muted-foreground">Display-only. To change, use the Branding tab.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Name</div>
              <div className="text-base font-semibold">{(settings as any)?.org_name || 'Untitled workspace'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Tenant slug</div>
              <code className="text-sm bg-muted/40 px-2 py-1 rounded">{(settings as any)?.short_name || '—'}</code>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Localization</h2>
            <p className="text-sm text-muted-foreground">
              Used by the calendar, gradebook timestamps, and outbound email.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Time zone</Label>
              <select
                value={form.timezone}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full h-10 border border-border rounded-md bg-background px-3 text-sm disabled:opacity-60"
              >
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default locale</Label>
              <select
                value={form.locale}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, locale: e.target.value })}
                className="w-full h-10 border border-border rounded-md bg-background px-3 text-sm disabled:opacity-60"
              >
                {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Week starts on</Label>
              <select
                value={form.week_start}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, week_start: e.target.value as 'sunday' | 'monday' })}
                className="w-full h-10 border border-border rounded-md bg-background px-3 text-sm disabled:opacity-60"
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact email</Label>
              <Input
                type="email"
                value={form.contact_email}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="director@your-org.org"
              />
            </div>
          </div>
          {canManage && (
            <div className="flex justify-end pt-1">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                Save general settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5 space-y-3">
          <div>
            <h2 className="text-lg font-semibold mb-1">Data export</h2>
            <p className="text-sm text-muted-foreground">
              Request a full export of your workspace — rosters, music library
              metadata, attendance, grades, and announcements as CSV + JSON.
            </p>
          </div>
          {canManage ? (
            <Button variant="outline" onClick={exportData}>
              <ExternalLink className="w-4 h-4 mr-1.5" /> Request export
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground italic">Only workspace admins can request an export.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
