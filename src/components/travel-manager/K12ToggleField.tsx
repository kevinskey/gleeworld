// K12ToggleField — persists gw_branding_settings.k12_ensemble for this tenant.
// CRITICAL: must use onConflict:'tenant_id' to avoid the legacy singleton PK
// trap (bare .upsert() always hits id=1, i.e. the main tenant's row).
import { useEffect, useState } from 'react';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  /** When false, renders the toggle but ignores interactions. */
  canManage?: boolean;
}

export function K12ToggleField({ canManage = true }: Props) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // Pin to the current tenant: a platform owner's RLS reads every
      // tenant's branding row, so an unpinned maybeSingle() errors
      // (multiple rows) or picks an arbitrary tenant.
      const { data } = await supabase
        .from('gw_branding_settings')
        .select('k12_ensemble, gw_tenants!inner(slug)')
        .eq('gw_tenants.slug', getTenantSlug())
        .limit(1)
        .maybeSingle();
      // null row → treat as false (tenant has no branding row yet)
      setEnabled(!!data?.k12_ensemble);
    })();
  }, []);

  const toggle = async (next: boolean) => {
    if (!canManage || busy) return;
    setEnabled(next);
    setBusy(true);
    try {
      // Look up tenant_id so we can write it explicitly in the upsert payload.
      // The server-side trigger also sets it, but supplying it here ensures the
      // onConflict:'tenant_id' target resolves to the right row even on first insert.
      const { data: existing } = await supabase
        .from('gw_branding_settings')
        .select('tenant_id, gw_tenants!inner(slug)')
        .eq('gw_tenants.slug', getTenantSlug())
        .limit(1)
        .maybeSingle();

      if (!existing?.tenant_id) {
        // No branding row yet and no way to determine tenant_id client-side —
        // rely on the trg_set_tenant_id trigger to fill it on insert.
        const { error } = await supabase
          .from('gw_branding_settings')
          .upsert({ k12_ensemble: next }, { onConflict: 'tenant_id' });
        if (error) throw error;
      } else {
        // IMPORTANT: onConflict:'tenant_id' — bare .upsert() would hit the
        // legacy singleton PK (id DEFAULT 1) and corrupt other tenants' rows.
        const { error } = await supabase
          .from('gw_branding_settings')
          .upsert(
            { tenant_id: existing.tenant_id, k12_ensemble: next },
            { onConflict: 'tenant_id' },
          );
        if (error) throw error;
      }
      toast.success(next ? 'K–12 mode enabled.' : 'K–12 mode disabled.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Could not save K–12 setting: ${msg}`);
      // Roll back optimistic update
      setEnabled(!next);
    } finally {
      setBusy(false);
    }
  };

  // Don't render until initial load completes (avoids flash of wrong state)
  if (enabled === null) return null;

  return (
    <div className="flex items-start gap-3">
      <Switch
        id="k12-ensemble"
        checked={enabled}
        onCheckedChange={toggle}
        disabled={!canManage || busy}
        aria-label="K–12 ensemble mode"
      />
      <div className="space-y-0.5">
        <Label htmlFor="k12-ensemble" className="text-sm font-medium leading-none cursor-pointer">
          K–12 ensemble
        </Label>
        <p className="text-xs text-muted-foreground">
          When enabled, permission slips are automatically sent to guardians
          whenever a student is added to a travel roster.
        </p>
      </div>
    </div>
  );
}
