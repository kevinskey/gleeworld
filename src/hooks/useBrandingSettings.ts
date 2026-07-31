import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingSettings {
  id: number;
  org_name: string | null;
  short_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  /** Optional hero image rendered behind the auth page; falls back to the tenant gradient. */
  auth_background_url: string | null;
  /** Optional portrait variant used on portrait viewports; falls back to auth_background_url. */
  auth_background_mobile_url: string | null;
  primary_color: string;
  /** Site theme fields moved off the Header block so branding owns the palette. */
  accent_color: string;
  font_family: string;
  letter_spacing: number;
  /** ElevenLabs voice_id used for assistant TTS, or 'browser' to force
   *  browser SpeechSynthesis, or null for the app default (Jessica). Set
   *  on the Branding tab in Workspace Settings — tenant-scoped like the
   *  color palette. */
  assistant_voice_id: string | null;
  setup_completed: boolean;
}

const TENANT = typeof window !== 'undefined' ? (window as any).__TENANT_CONFIG__ : null;

/** Defaults sourced from the tenant bootstrap, used while the DB query is loading. */
function fallback(): BrandingSettings {
  return {
    id: 1,
    org_name: TENANT?.org ?? null,
    short_name: TENANT?.shortName ?? null,
    tagline: null,
    logo_url: TENANT?.logoUrl ?? null,
    auth_background_url: null,
    auth_background_mobile_url: null,
    primary_color: 'hsl(var(--brand-navy))',
    accent_color: '#9333ea',
    font_family: 'sans',
    letter_spacing: 0,
    assistant_voice_id: null,
    setup_completed: false,
  };
}

export function useBrandingSettings() {
  const bootstrapTenantSlug = TENANT?.tenant ?? null;

  const query = useQuery({
    queryKey: ['gw_branding_settings', bootstrapTenantSlug],
    queryFn: async () => {
      // For ANON visitors, RLS doesn't filter by tenant (no tenant claim in JWT).
      // We pin the lookup to the subdomain's tenant via the bootstrap slug.
      // For authenticated visitors, RLS also enforces the match — defense in depth.
      let q = supabase.from('gw_branding_settings').select('*, gw_tenants!inner(slug)');
      if (bootstrapTenantSlug) {
        q = q.eq('gw_tenants.slug', bootstrapTenantSlug);
      }
      const { data, error } = await q.limit(1).maybeSingle();
      const fb = fallback();
      if (error) {
        console.warn('[branding] read failed', error.message);
        return fb;
      }
      if (!data) return fb;
      // Merge: DB row wins for set fields, TENANT bootstrap fills the holes
      // (org_name/short_name/logo_url often null on freshly provisioned tenants).
      const row = data as Partial<BrandingSettings>;
      const merged: BrandingSettings = { ...fb };
      for (const [k, v] of Object.entries(row)) {
        if (v !== null && v !== undefined && v !== '') {
          (merged as Record<string, unknown>)[k] = v;
        }
      }
      return merged;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    settings: query.data ?? fallback(),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
