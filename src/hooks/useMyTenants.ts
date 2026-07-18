import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyTenant {
  tenant_id: string;
  slug: string;
  name: string | null;
  role: string | null;
}

/**
 * Every tenant the signed-in user belongs to, via the `my_tenants` RPC
 * (SECURITY DEFINER — reads across per-tenant RLS, scoped to auth.uid()).
 * Powers the account menu's "Switch organization" list. Returns [] on error
 * or before the RPC exists, so callers degrade gracefully (no switcher).
 */
export function useMyTenants() {
  const { user } = useAuth();
  return useQuery<MyTenant[]>({
    queryKey: ['my-tenants', user?.id],
    queryFn: async () => {
      // Cast: the RPC isn't in the generated types yet.
      const { data, error } = await supabase.rpc('my_tenants' as never);
      if (error) {
        console.warn('[useMyTenants] query failed', error.message);
        return [];
      }
      return (data ?? []) as MyTenant[];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

/** Absolute URL for a tenant's own subdomain (main = the platform apex). */
export function tenantHomeUrl(slug: string): string {
  return slug === 'main' ? 'https://gleeworld.org' : `https://${slug}.gleeworld.org`;
}
