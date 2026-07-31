// Reads and writes the tenant's date card choice on gw_branding_settings.
// NEVER send tenant_id — set_tenant_id_default() supplies it. Malformed
// stored JSON degrades to the plain default rather than throwing.
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, getTenantSlug } from '@/integrations/supabase/client';
import { getDateCardModule, DEFAULT_DATE_CARD_TYPE } from '@/components/home/date-card/registry';
import type { DateCardSetting } from '@/components/home/date-card/types';

export const DEFAULT_DATE_CARD_SETTING: DateCardSetting = {
  v: 1, type: DEFAULT_DATE_CARD_TYPE, config: {},
};

// Same bootstrap-slug source useBrandingSettings uses.
const TENANT = typeof window !== 'undefined' ? (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__ : null;

export function parseDateCardSetting(raw: unknown): DateCardSetting {
  if (!raw || typeof raw !== 'object') return DEFAULT_DATE_CARD_SETTING;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return DEFAULT_DATE_CARD_SETTING;
  if (typeof o.type !== 'string' || !getDateCardModule(o.type)) return DEFAULT_DATE_CARD_SETTING;
  const config = (o.config && typeof o.config === 'object')
    ? (o.config as Record<string, unknown>)
    : {};
  return { v: 1, type: o.type, config };
}

export function useDateCardConfig() {
  const qc = useQueryClient();
  // getTenantSlug() falls back to 'main' when no bootstrap exists (the
  // gleeworld.org apex) — never drop the pin: a platform owner's RLS reads
  // every tenant's row, so an unpinned limit-1 returns an arbitrary tenant.
  const bootstrapTenantSlug = getTenantSlug();

  const { data: setting = DEFAULT_DATE_CARD_SETTING, isLoading, refetch } = useQuery<DateCardSetting>({
    queryKey: ['date-card-setting', bootstrapTenantSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // For ANON visitors, RLS doesn't filter by tenant (no tenant claim in
      // JWT) — pin the lookup to the subdomain's tenant via the bootstrap
      // slug, same as useBrandingSettings. For authenticated visitors, RLS
      // also enforces the match — defense in depth. `.limit(1)` keeps this
      // from throwing PGRST116 if RLS ever returns more than one row;
      // `.maybeSingle()` alone would throw instead of picking one.
      const { data, error } = await supabase
        .from('gw_branding_settings')
        .select('date_card, gw_tenants!inner(slug)')
        .eq('gw_tenants.slug', bootstrapTenantSlug)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return parseDateCardSetting((data as { date_card?: unknown } | null)?.date_card);
    },
  });

  const save = useCallback(async (next: DateCardSetting) => {
    // gw_branding_settings' PRIMARY KEY is the legacy singleton `id`
    // (DEFAULT 1). A bare upsert (no payload id) lets PostgREST arbitrate
    // on that PK, which always resolves to id=1 — the `main` tenant's row.
    // For every other tenant that row is invisible under RLS, so the
    // "upsert" silently fails to touch their own row (id=2, 3, ...).
    // The real per-tenant identity is the `tenant_id` UNIQUE constraint
    // (gw_branding_settings_one_per_tenant), so the conflict target must
    // be pinned there explicitly. Do NOT "simplify" this back to a bare
    // upsert — and never add tenant_id/id to the payload; the column
    // DEFAULT + trg_set_tenant_id trigger supply tenant_id server-side.
    const { error } = await supabase
      .from('gw_branding_settings')
      .upsert(
        { date_card: next, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      );
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['date-card-setting'] });
  }, [qc]);

  return { setting, loading: isLoading, save, refetch };
}
