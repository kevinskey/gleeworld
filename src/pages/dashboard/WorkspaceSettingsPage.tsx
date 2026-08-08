// /dashboard/workspace — tenant-level settings hub: branding (placeholder),
// modules grid (read of UNIFIED_MODULES + activation state), billing
// (placeholder + Stripe checkout for add-ons), integrations (placeholder).
// Slack-style "Workspace Settings" page split from /control-center so
// tenants don't accidentally see platform-owner controls.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { decodeJwtClaims } from '@/lib/demoSession';
import { useUserRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { applyTenantThemeVars } from '@/components/theme/TenantThemeRoot';
import { ASSISTANT_VOICES, BROWSER_VOICE_ID, DEFAULT_VOICE_ID } from '@/lib/assistant/voices';
import { speak } from '@/lib/assistant/speech';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FONT_OPTIONS } from '@/components/public-site/types';
import { ImageUploadField } from '@/components/public-site/ImageUploadField';
import { PLAN_TIERS, TIER_PASTELS, formatPrice, monthsFreeFor, type PlanTier } from '@/lib/planTiers';
import { ArrowRight } from 'lucide-react';
import {
  Loader2, CheckCircle2, ExternalLink, CreditCard, Palette,
  Save, Building2, Lock, Sparkles, Users, Menu, CalendarDays,
} from 'lucide-react';
import { hideableNavItems, HIDEABLE_NAV_ROLES, type NavRole, type HideableNavItem } from '@/lib/navigation/navCatalog';
import { getPreviewRole, setPreviewRole, usePreviewRole } from '@/lib/nav/navPreview';
import { toast } from 'sonner';
import { billingPortalErrorMessage } from '@/lib/billingPortalError';
import { cn } from '@/lib/utils';
import { DateCardTabPanel } from '@/components/home/date-card/DateCardTabPanel';
import { ParentsTabPanel } from '@/components/workspace-settings/ParentsTabPanel';
import { K12ToggleField } from '@/components/travel-manager/K12ToggleField';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { PlatformTenantWarning } from '@/components/admin/PlatformTenantWarning';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

const TAB_VALUES = new Set(['plan', 'navigation', 'branding', 'datecard', 'parents', 'billing', 'general']);

export default function WorkspaceSettingsPage() {
  const { isSuperAdmin, isAdmin } = useUserRole();
  const canManage = isSuperAdmin() || isAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  // `modules` is the retired Add-ons tab — bounce old bookmarks to Plan
  // (the tier's included feature list) instead of a dead 404 tab state.
  const activeTab = tab === 'modules'
    ? 'plan'
    : (tab && TAB_VALUES.has(tab) ? tab : 'plan');
  const setActiveTab = (value: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', value);
    setSearchParams(sp, { replace: true });
  };

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Workspace Settings"
      subtitle="Configure your workspace — branding, modules, billing, integrations."
    >
      {!canManage && (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
          <Lock className="w-4 h-4 mr-1" /> Read-only — only workspace admins can change settings
        </Badge>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Mobile: one swipeable scroll strip (no wrap) so 6 sections read as
            a single row instead of a scattered 2-col grid. md+: 6-across grid.
            The Add-ons tab was removed 2026-07-28 — features are now bundled
            by plan tier, not toggled à la carte. A legacy ?tab=modules query
            param transparently redirects to `plan` below. */}
        <TabsList className="flex md:grid md:grid-cols-7 h-auto w-full max-w-3xl justify-start gap-1 overflow-x-auto touch-pan-x overscroll-x-contain md:overflow-visible scrollbar-hide">
          <TabsTrigger value="plan" className="shrink-0 text-sm xl:text-base px-2 lg:px-3"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Plan</TabsTrigger>
          <TabsTrigger value="navigation" className="shrink-0 text-sm xl:text-base px-2 lg:px-3"><Menu className="w-3.5 h-3.5 mr-1.5" />Navigation</TabsTrigger>
          <TabsTrigger value="branding" className="shrink-0 text-sm xl:text-base px-2 lg:px-3"><Palette className="w-3.5 h-3.5 mr-1.5" />Branding</TabsTrigger>
          <TabsTrigger value="datecard" className="shrink-0 text-sm xl:text-base px-2 lg:px-3"><CalendarDays className="w-3.5 h-3.5 mr-1.5" />Date card</TabsTrigger>
          <TabsTrigger value="parents" className="shrink-0 text-sm xl:text-base px-2 lg:px-3"><Users className="w-3.5 h-3.5 mr-1.5" />Parents</TabsTrigger>
          <TabsTrigger value="billing" className="shrink-0 text-sm xl:text-base px-2 lg:px-3"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Billing</TabsTrigger>
          <TabsTrigger value="general" className="shrink-0 text-sm xl:text-base px-2 lg:px-3"><Building2 className="w-3.5 h-3.5 mr-1.5" />General</TabsTrigger>
        </TabsList>

        <TabsContent value="plan"><PlanTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="navigation"><NavigationTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="branding"><BrandingTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="datecard"><DateCardTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="parents"><ParentsTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="billing"><BillingTabPanel /></TabsContent>
        <TabsContent value="general"><GeneralTabPanel canManage={canManage} /></TabsContent>
      </Tabs>
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

// ── Plan ────────────────────────────────────────────────────────────

function PlanTabPanel({ canManage }: { canManage: boolean }) {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');

  // Plan catalog comes from PLAN_TIERS (single source of truth, shared with
  // the marketing landing) rather than gw_billing_plans, so the two surfaces
  // can never drift on labels/prices/features. gw_billing_plans is still the
  // authoritative table for stripe lookup keys + gw_tenant_plans.plan_id FK
  // targets, but nothing here needs to read it.
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

  const currentTierLabel = current
    ? (PLAN_TIERS.find((t) => t.id === current.plan_id)?.label ?? current.plan_id)
    : null;

  return (
    <div className="space-y-4">
      {/* Current plan + usage */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Current plan</h2>
              {current ? (
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold">{currentTierLabel}</span>
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

      {/* Plan grid — the same 4 tiers the marketing landing shows, in the
          same pastel treatment so a tenant sees the identical catalog whether
          they land on gleeworld.org or here. Director carries the featured
          treatment (matches the landing's MOST POPULAR chip). */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLAN_TIERS.map((tier: PlanTier) => {
          const isCurrent = current?.plan_id === tier.id && current?.billing_cycle === cycle;
          const featured = tier.id === 'director_60';
          const priceLabel = tier.quote ? `From ${formatPrice(tier.monthlyCents)}` : formatPrice(tier.monthlyCents);
          const monthsFree = monthsFreeFor(tier);
          return (
            <div
              key={tier.id}
              className={cn(
                'relative rounded-3xl flex flex-col p-5 sm:p-6',
                featured ? 'shadow-2xl ring-2 ring-violet-500' : 'shadow-sm border border-slate-200',
                isCurrent ? 'ring-2 ring-primary' : '',
              )}
              style={{ background: TIER_PASTELS[tier.id] }}
            >
              {featured && !isCurrent && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full text-white tracking-wider"
                  style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }}
                >
                  MOST POPULAR
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full text-white tracking-wider bg-emerald-600">
                  CURRENT
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-1">{tier.label}</h3>
              <p className="text-sm text-slate-600 mb-4 line-clamp-2 min-h-[2.5rem]" title={tier.tagline}>{tier.tagline}</p>
              <div className="mb-2">
                <span className="text-4xl font-bold text-slate-900">{priceLabel}</span>
                <span className="text-sm text-slate-600">/mo</span>
              </div>
              {monthsFree >= 1 && (
                <p className="text-xs text-slate-500 mb-4">
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
              {canManage && !isCurrent && (
                // create-plan-checkout doesn't yet support the new tier ids
                // + lookup-key resolution — clicking today surfaces the fn
                // error via the mutation's onError toast. Button label stays
                // "Choose Plan" per Kevin; wiring self-serve checkout is a
                // separate billing workstream.
                <button
                  type="button"
                  disabled={checkout.isPending}
                  onClick={() => checkout.mutate(tier.id)}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                  style={featured
                    ? { background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #c084fc 100%)' }
                    : { backgroundColor: '#0f172a' }}
                >
                  {checkout.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
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
    </div>
  );
}

// ── Modules ─────────────────────────────────────────────────────────

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

  // Demo tenant (sandbox toggles) — but never for read-only demo viewers:
  // their writes are RLS-blocked, so showing toggles would just fail.
  const { data: isDemo = false } = useQuery({
    queryKey: ['workspace-is-demo'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return false;
      const { decodeJwtClaims } = await import('@/lib/demoSession');
      const claims = decodeJwtClaims(token);
      return claims?.tenant_slug === 'demo' && claims?.demo_viewer !== true;
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
      // tenant_id lives in the TOKEN PAYLOAD (GoTrue custom-claims
      // hook), NOT in app_metadata — accounts created outside the
      // invite flow (e.g. the platform owner) have no tenant_id there,
      // which made this throw 'No tenant in session' on every call.
      // Metadata reads stay as fallbacks for invite-flow accounts.
      const claims = decodeJwtClaims(session?.access_token ?? '');
      const tenantId = (claims?.tenant_id as string | undefined)
        ?? (session?.user?.app_metadata as any)?.tenant_id
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
        <CardContent className="p-4 sm:p-5">
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
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Active
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
                          'inline-flex items-center justify-center h-8 px-3.5 rounded-full text-xs font-medium ' +
                          'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors ' +
                          'disabled:opacity-60 disabled:cursor-not-allowed';
                        if (isDemo) {
                          return (
                            <button
                              type="button"
                              data-compact
                              className={pill}
                              onClick={() => sandboxToggle.mutate({ moduleId: m.id, active: !isActive })}
                              disabled={sandboxPending}
                            >
                              {sandboxPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isActive ? 'Turn off' : 'Turn on'}
                            </button>
                          );
                        }
                        if (needsStripe) {
                          return (
                            <button
                              type="button"
                              data-compact
                              className={pill}
                              onClick={() => checkout.mutate(m.id)}
                              disabled={checkoutPending}
                            >
                              {checkoutPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate'}
                            </button>
                          );
                        }
                        return (
                          <button
                            type="button"
                            data-compact
                              className={pill}
                            onClick={() => directToggle.mutate({ moduleId: m.id, active: !isActive })}
                            disabled={directPending}
                          >
                            {directPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isActive ? 'Deactivate' : 'Activate'}
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
      // tenant_id lives in the TOKEN PAYLOAD (GoTrue custom-claims
      // hook), NOT in app_metadata — accounts created outside the
      // invite flow (e.g. the platform owner) have no tenant_id there,
      // which made this throw 'No tenant in session' on every call.
      // Metadata reads stay as fallbacks for invite-flow accounts.
      const claims = decodeJwtClaims(session?.access_token ?? '');
      const tenantId = (claims?.tenant_id as string | undefined)
        ?? (session?.user?.app_metadata as any)?.tenant_id
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

  // Group by section for display. Derived from the shared nav catalog so
  // the checkbox list always matches what the sidebar + home grid render.
  const bySection = hideableNavItems().reduce<Record<string, HideableNavItem[]>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  // Compact grey pill styling — same recipe used for Add-ons so the
  // two tabs read as one settings surface.
  const pill =
    'inline-flex items-center justify-center h-8 px-3.5 rounded-full text-xs font-medium ' +
    'bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors ' +
    'disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="space-y-4">
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold mb-1">Navigation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which sidebar items each type of user in your tenant sees.
            You (as super-admin) always see everything.
          </p>

          <div className="mb-3">
            <div className="text-sm font-medium mb-2">Editing view for:</div>
            <div className="flex gap-2 overflow-x-auto touch-pan-x overscroll-x-contain scrollbar-hide pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {HIDEABLE_NAV_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  data-compact
                  onClick={() => changeRole(r.value)}
                  className={cn(
                    'shrink-0 inline-flex items-center justify-center h-8 px-3.5 rounded-full text-xs font-medium transition-colors',
                    role === r.value
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4 rounded-lg bg-slate-50 border px-3 py-2">
            <div className="text-xs text-muted-foreground mb-2">Preview my sidebar as:</div>
            <div className="flex gap-2 overflow-x-auto touch-pan-x overscroll-x-contain scrollbar-hide pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              <button
                type="button"
                data-compact
                onClick={() => setPreviewRole(null)}
                className={cn(
                  'shrink-0 inline-flex items-center justify-center h-8 px-3.5 rounded-full text-xs font-medium transition-colors',
                  !preview
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                Super-admin (me)
              </button>
              {HIDEABLE_NAV_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  data-compact
                  onClick={() => togglePreview(r.value)}
                  className={cn(
                    'shrink-0 inline-flex items-center justify-center h-8 px-3.5 rounded-full text-xs font-medium transition-colors',
                    preview === r.value
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
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
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Visible
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
                              data-compact
                              className={pill}
                              onClick={() => toggleItem(item.path, isHidden)}
                              disabled={pending}
                            >
                              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : isHidden ? 'Show' : 'Hide'}
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
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    org_name: '',
    short_name: '',
    primary_color: '#7c3aed',
    accent_color: '#9333ea',
    font_family: 'sans',
    letter_spacing: 0,
    logo_url: '',
    assistant_voice_id: '' as string,
    youtube_channel_handle: '',
    welcome_sms_template: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        org_name: (settings as any).org_name || '',
        short_name: (settings as any).short_name || '',
        primary_color: (settings as any).primary_color || '#7c3aed',
        accent_color: (settings as any).accent_color || '#9333ea',
        font_family: (settings as any).font_family || 'sans',
        letter_spacing: Number((settings as any).letter_spacing ?? 0),
        logo_url: (settings as any).logo_url || '',
        assistant_voice_id: (settings as any).assistant_voice_id || '',
        youtube_channel_handle: (settings as any).youtube_channel_handle || '',
        welcome_sms_template: settings.welcome_sms_template || '',
      });
    }
  }, [settings]);

  // Live preview: paint the tenant's chosen colors onto the CSS vars the
  // whole app reads (--primary, --accent, --site-primary, --site-accent,
  // and their foregrounds/contrast) the instant the color picker changes.
  // No save required — the tenant SEES the effect on the surrounding UI
  // (sidebar tint, buttons, Command Center accents) in real time.
  //
  // On unmount (tab switch or route change) we re-apply the persisted
  // branding values so navigating away without saving reverts the
  // preview. TenantThemeRoot's own effect also re-asserts on any
  // branding refetch, so a successful save just keeps the same values.
  useEffect(() => {
    applyTenantThemeVars(form.primary_color, form.accent_color);
    return () => {
      const persistedPrimary = (settings as { primary_color?: string } | null)?.primary_color ?? null;
      const persistedAccent = (settings as { accent_color?: string } | null)?.accent_color ?? null;
      applyTenantThemeVars(persistedPrimary, persistedAccent);
    };
  }, [form.primary_color, form.accent_color, settings]);

  async function save() {
    // ImageUploadField hands us a `blob:` URL during the upload window and
    // swaps it for the real public URL once storage has the file. Persisting
    // a blob: URL would 404 on the next load — hard-stop the save until the
    // upload settles rather than write garbage.
    if (form.logo_url.startsWith('blob:')) {
      toast.error('Logo is still uploading — wait a moment and try again.');
      return;
    }
    setSaving(true);
    // gw_branding_settings' PRIMARY KEY is the legacy singleton `id`
    // (DEFAULT 1). A bare upsert lets PostgREST arbitrate on that PK, which
    // always resolves to id=1 (the `main` tenant's row) and is invisible
    // under RLS to every other tenant. Pin the conflict target to the real
    // per-tenant UNIQUE constraint instead. Do NOT "simplify" this back to
    // a bare upsert, and never add tenant_id/id to the payload — the column
    // DEFAULT + trg_set_tenant_id trigger supply tenant_id server-side.
    const { data, error } = await supabase
      .from('gw_branding_settings')
      .upsert({
        org_name: form.org_name,
        short_name: form.short_name,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        font_family: form.font_family,
        letter_spacing: form.letter_spacing,
        logo_url: form.logo_url,
        assistant_voice_id: form.assistant_voice_id || null,
        youtube_channel_handle: form.youtube_channel_handle.trim().replace(/^@/, '') || null,
        welcome_sms_template: form.welcome_sms_template.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      .select('id');
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    // Silent-noop guard: an upsert with a missing UPDATE policy returns 0
    // rows and no error. Without this the toast lied to the user ("Saved")
    // while the next page load reverted their changes. Root cause is
    // per-migration (see 20260724113345_branding_admin_update_policy); this
    // is defense in depth.
    if (!data || data.length === 0) {
      toast.error("Save didn't land — you may not have permission to edit branding on this workspace.");
      return;
    }
    toast.success('Branding saved.');
    // refetch() only updates THIS instance of useBrandingSettings; every
    // other page/component using the hook keeps stale data until its
    // 5-minute staleTime expires — that's the "doesn't work immediately"
    // bug. Invalidating the base query key wakes ALL consumers so the new
    // colors, logo, font, etc. propagate app-wide without a reload. Also
    // bump the tenant-public-site theme so UniversalLayout re-tints.
    void queryClient.invalidateQueries({ queryKey: ['gw_branding_settings'] });
    void queryClient.invalidateQueries({ queryKey: ['tenant-public-site'] });
    refetch?.();
  }

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <PlatformTenantWarning />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Organization name</Label>
            <Input value={form.org_name} disabled={!canManage} onChange={(e) => setForm({ ...form, org_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Short name</Label>
            <Input value={form.short_name} disabled={!canManage} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Label className="text-xs">Accent color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.accent_color}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border"
              />
              <Input value={form.accent_color} disabled={!canManage} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font</Label>
            <Select
              value={form.font_family}
              onValueChange={(v) => setForm({ ...form, font_family: v })}
              disabled={!canManage}
            >
              <SelectTrigger className="h-10"><SelectValue placeholder="Choose a font" /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span style={{ fontFamily: opt.css }}>{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Letter spacing</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{form.letter_spacing.toFixed(2)}em</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={-0.05}
                max={0.3}
                step={0.005}
                value={form.letter_spacing}
                disabled={!canManage}
                onChange={(e) => setForm({ ...form, letter_spacing: Number(e.target.value) })}
                className="flex-1 accent-primary cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, letter_spacing: 0 })}
                disabled={!canManage}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          {canManage ? (
            <ImageUploadField
              label="Logo"
              prefix="logo"
              thumbClass="w-16 h-16"
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              buttonColor={form.primary_color}
            />
          ) : (
            <>
              <Label className="text-xs">Logo</Label>
              {form.logo_url ? (
                <div className="rounded-xl border bg-muted/30 p-3 inline-flex items-center gap-3">
                  <img src={form.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
                  <div className="text-xs text-muted-foreground truncate max-w-[240px]">{form.logo_url}</div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No logo uploaded.</p>
              )}
            </>
          )}
        </div>
        {/* Assistant voice — tenant-branded like the color palette. Sets
            the ElevenLabs voice everyone in this workspace hears when
            they talk to the assistant. "Browser default" opts out of
            ElevenLabs and uses the browser's built-in TTS (free, no API
            quota). */}
        <div className="space-y-1.5">
          <Label className="text-xs">Assistant voice</Label>
          <Select
            value={form.assistant_voice_id || DEFAULT_VOICE_ID}
            onValueChange={(v) => {
              const nextVoiceId = v === BROWSER_VOICE_ID ? BROWSER_VOICE_ID : v;
              setForm({ ...form, assistant_voice_id: nextVoiceId });
              // Immediate audio preview so the admin hears the picked voice
              // reading the tenant's welcome line, before they Save. Bypasses
              // the mute toggle so the picker demo always plays — this is an
              // explicit action, not an assistant reply. Fire-and-forget:
              // speak() self-serializes (stopElevenLabs + synth.cancel), so
              // switching voices quickly cuts the previous line and starts
              // the new one.
              void (async () => {
                const { data: { session } } = await supabase.auth.getSession();
                const name = (form.short_name || (settings as any)?.short_name || '').trim();
                // VITE_SUPABASE_URL isn't set in this project (client.ts derives
                // it from the tenant bootstrap at runtime), so pass SUPABASE_URL
                // explicitly — otherwise speak() falls through to browser
                // SpeechSynthesis, which uses ONE OS voice regardless of
                // voiceId → every "voice" sounds identical.
                speak(`Welcome to ${name || 'GleeWorld'}`, {
                  voiceId: nextVoiceId,
                  accessToken: session?.access_token,
                  supabaseUrl: SUPABASE_URL,
                  volume: 0.55,
                  muted: false,
                });
              })();
            }}
            disabled={!canManage}
          >
            <SelectTrigger className="h-10"><SelectValue placeholder="Pick a voice" /></SelectTrigger>
            <SelectContent>
              {ASSISTANT_VOICES.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label} <span className="text-muted-foreground">— {v.description}</span>
                </SelectItem>
              ))}
              <SelectItem value={BROWSER_VOICE_ID}>Browser default (no ElevenLabs)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Applies to every user in the workspace. Preview voices in Studio → The Lab.
          </p>
        </div>
        {/* YouTube channel handle — Video Library page can sync uploads
            from this channel so a tenant's YouTube content lands
            automatically alongside anything manually pasted. Store the
            bare handle (leading @ is stripped on save). */}
        <div className="space-y-1.5">
          <Label className="text-xs">YouTube channel handle</Label>
          <Input
            value={form.youtube_channel_handle}
            disabled={!canManage}
            onChange={(e) => setForm({ ...form, youtube_channel_handle: e.target.value })}
            placeholder="@GleeWorldOfficial"
          />
          <p className="text-xs text-muted-foreground">
            Optional. When set, the Video Library gets a "Sync from YouTube" button that pulls
            the channel's uploads into this workspace.
          </p>
        </div>
        {/* Welcome SMS — sent by the public-intake edge function after an
            anonymous visitor books an appointment or finishes an audition
            on this tenant's public site. Server-side rendering + fallback
            live in supabase/functions/_shared/publicIntake.ts
            (renderSmsTemplate / DEFAULT_WELCOME_SMS_TEMPLATE) — this field
            must keep naming exactly those two placeholders. */}
        <div className="space-y-1.5">
          <Label className="text-xs">Welcome SMS</Label>
          <Textarea
            value={form.welcome_sms_template}
            disabled={!canManage}
            onChange={(e) => setForm({ ...form, welcome_sms_template: e.target.value })}
            placeholder="Thanks for joining {org_name}!"
            rows={3}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Sent after someone books an appointment or finishes an audition. Use{' '}
            <code className="text-xs bg-muted/40 px-1 py-0.5 rounded">{'{org_name}'}</code> and{' '}
            <code className="text-xs bg-muted/40 px-1 py-0.5 rounded">{'{first_name}'}</code>.
            Leave blank for the default: "Thanks for joining {'{org_name}'}!"
          </p>
        </div>
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
  // Reads gw_tenant_plans (the new plan-tier model) rather than
  // gw_tenant_active_addons (the retired per-add-on model). The Plan
  // tab handles browsing/upgrading; this tab is about the money side —
  // what you're on, when it renews, and how to update your card /
  // download invoices via Stripe.
  const { data: current, isLoading } = useQuery({
    queryKey: ['workspace-billing-current-plan'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tenant_plans')
        .select('plan_id, billing_cycle, status, current_period_end, trial_ends_at')
        .maybeSingle();
      return data;
    },
  });

  const tier = current ? PLAN_TIERS.find((t) => t.id === current.plan_id) ?? null : null;
  const cycle = current?.billing_cycle === 'annual' ? 'annual' : 'monthly';
  const priceCents = tier
    ? cycle === 'annual' ? tier.annualCents : tier.monthlyCents
    : 0;
  const cycleLabel = cycle === 'annual' ? '/year' : '/month';
  const renewal = current?.current_period_end
    ? new Date(current.current_period_end)
    : null;
  const trialEnds = current?.trial_ends_at ? new Date(current.trial_ends_at) : null;

  return (
    <div className="space-y-4">
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Current subscription</h2>
            <p className="text-sm text-muted-foreground">
              Change or compare plans in the <strong>Plan</strong> tab. Manage payment method and
              invoices through the Stripe portal below.
            </p>
          </div>

          {isLoading ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !current || !tier ? (
            <div className="rounded-lg border border-dashed p-4 text-center space-y-1">
              <p className="text-sm font-medium">No paid plan yet.</p>
              <p className="text-xs text-muted-foreground">
                You're on the free tier — pick a plan from the Plan tab when you're ready.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold">{tier.label}</span>
                  <Badge variant="outline" className="text-xs capitalize">{current.status}</Badge>
                  <Badge variant="outline" className="text-xs capitalize">{cycle}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{tier.tagline}</p>
                {trialEnds && current.status === 'trial' && (
                  <p className="text-xs text-amber-700 font-medium">
                    Trial ends {trialEnds.toLocaleDateString()}
                  </p>
                )}
                {renewal && current.status !== 'trial' && (
                  <p className="text-xs text-muted-foreground">
                    Next renewal {renewal.toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{formatPrice(priceCents)}</div>
                <div className="text-xs text-muted-foreground">{cycleLabel}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-6 sm:p-8 text-center space-y-3">
          <CreditCard className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-semibold">Payment method &amp; invoices</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Update your card, review past invoices, or cancel your subscription through Stripe.
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
      // Non-2xx responses arrive as a thrown FunctionsHttpError with data
      // null, so the real reason (e.g. no_stripe_customer_for_tenant on
      // free-tier tenants) must be recovered from the error body — checking
      // data.error here was dead code and users saw only the generic toast.
      const failure = await billingPortalErrorMessage(error, data as Record<string, unknown> | null);
      if (failure) {
        toast.error(failure);
      } else if ((data as any)?.url) {
        window.location.href = (data as any).url;
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
    // gw_branding_settings' PRIMARY KEY is the legacy singleton `id`
    // (DEFAULT 1). A bare upsert lets PostgREST arbitrate on that PK, which
    // always resolves to id=1 (the `main` tenant's row) and is invisible
    // under RLS to every other tenant. Pin the conflict target to the real
    // per-tenant UNIQUE constraint instead. Do NOT "simplify" this back to
    // a bare upsert, and never add tenant_id/id to the payload — the column
    // DEFAULT + trg_set_tenant_id trigger supply tenant_id server-side.
    const { error } = await supabase
      .from('gw_branding_settings')
      .upsert({
        timezone: form.timezone,
        locale: form.locale,
        contact_email: form.contact_email || null,
        week_start: form.week_start,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' });
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
        <CardContent className="p-4 sm:p-5 space-y-4">
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
        <CardContent className="p-4 sm:p-5 space-y-4">
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
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Ensemble type</h2>
            <p className="text-sm text-muted-foreground">
              Controls age-specific features such as guardian permission slips for Travel Manager.
            </p>
          </div>
          <K12ToggleField canManage={canManage} />
        </CardContent>
      </Card>

      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-4 sm:p-5 space-y-3">
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
