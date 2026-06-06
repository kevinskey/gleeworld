import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BrandingSettings {
  id: number;
  org_name: string | null;
  short_name: string | null;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string;
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
    primary_color: '#150d26',
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
      if (error) {
        console.warn('[branding] read failed', error.message);
        return fallback();
      }
      return (data as BrandingSettings) || fallback();
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
