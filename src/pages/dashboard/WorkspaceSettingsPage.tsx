// /dashboard/workspace — tenant-level settings hub: branding (placeholder),
// modules grid (read of UNIFIED_MODULES + activation state), billing
// (placeholder + Stripe checkout for add-ons), integrations (placeholder).
// Slack-style "Workspace Settings" page split from /control-center so
// tenants don't accidentally see platform-owner controls.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Settings, Loader2, CheckCircle2, ExternalLink, CreditCard, Palette,
  Plug, Save, Building2, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function WorkspaceSettingsPage() {
  const { isSuperAdmin, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const canManage = isSuperAdmin() || isAdmin();

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your workspace — branding, modules, billing, integrations.
        </p>
        {!canManage && (
          <Badge variant="outline" className="mt-2 text-xs bg-amber-50 text-amber-700 border-amber-200">
            <Lock className="w-3 h-3 mr-1" /> Read-only — only workspace admins can change settings
          </Badge>
        )}
      </div>

      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList className="grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="modules"><Plug className="w-3.5 h-3.5 mr-1.5" />Modules</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="w-3.5 h-3.5 mr-1.5" />Branding</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="w-3.5 h-3.5 mr-1.5" />Billing</TabsTrigger>
          <TabsTrigger value="general"><Building2 className="w-3.5 h-3.5 mr-1.5" />General</TabsTrigger>
        </TabsList>

        <TabsContent value="modules"><ModulesTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="branding"><BrandingTabPanel canManage={canManage} /></TabsContent>
        <TabsContent value="billing"><BillingTabPanel /></TabsContent>
        <TabsContent value="general"><GeneralTabPanel canManage={canManage} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ── Modules ─────────────────────────────────────────────────────────

function ModulesTabPanel({ canManage }: { canManage: boolean }) {
  // Tenant's active billed modules.
  const { data: tenantModules = [] } = useQuery({
    queryKey: ['workspace-tenant-modules'],
    queryFn: async () => {
      const { data } = await supabase.from('gw_tenant_modules').select('module_id, is_active');
      return data ?? [];
    },
  });
  const active = new Set(tenantModules.filter((m: any) => m.is_active).map((m: any) => m.module_id));

  // Catalog of all add-ons that can be billed.
  const { data: catalog = [] } = useQuery({
    queryKey: ['workspace-billing-catalog'],
    queryFn: async () => {
      const { data } = await supabase.from('gw_billing_modules').select('id, name, description, price_cents, is_active').eq('is_active', true);
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
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold mb-1">Add-ons</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Activate paid features for your workspace. Already-active ones show as enabled.
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
                        {m.price_cents ? `$${(m.price_cents / 100).toFixed(2)}/mo` : 'Free'}
                      </div>
                      {!isActive && canManage && (
                        <Button size="sm" onClick={() => checkout.mutate(m.id)} disabled={checkout.isPending}>
                          {checkout.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Activate'}
                        </Button>
                      )}
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

  useMemo(() => {
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
        .from('gw_tenant_modules')
        .select('module_id, is_active, activated_at, gw_billing_modules!inner(id, name, price_cents)')
        .eq('is_active', true);
      return data ?? [];
    },
  });

  const monthlyTotal = active.reduce((s: number, m: any) => s + ((m.gw_billing_modules?.price_cents || 0) / 100), 0);

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
                      <div className="text-base font-semibold truncate">{m.gw_billing_modules?.name}</div>
                      {m.activated_at && (
                        <div className="text-sm text-muted-foreground">
                          Active since {new Date(m.activated_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      ${((m.gw_billing_modules?.price_cents || 0) / 100).toFixed(2)}/mo
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

function GeneralTabPanel({ canManage }: { canManage: boolean }) {
  const { settings } = useBrandingSettings();
  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 space-y-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Workspace</div>
          <div className="text-base font-semibold">{(settings as any)?.org_name || 'Untitled workspace'}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Tenant slug</div>
          <code className="text-sm bg-muted/40 px-2 py-1 rounded">{(settings as any)?.short_name || '—'}</code>
        </div>
        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            More general settings (timezone, default language, data export) coming soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
