// Tenant-scoped role lookup + the authorization gate for nav preview.
//
// Both the hidden-items filter (useTenantNavPrefs) and the capability
// override (DashboardShell / HouseHome) need the same two facts: what the
// caller's real tenant role is, and whether their "preview as X" selection
// is allowed to take effect. Keeping them here means the gate can't drift
// between consumers — a bug that would silently let a non-admin opt out of
// a restriction their tenant admin set.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewRole } from '@/lib/nav/navPreview';
import type { NavRole } from '@/lib/navigation/navCatalog';

/**
 * The caller's role from gw_tenant_members — the exact value the Navigation
 * settings tab writes to gw_tenant_nav_prefs.role. NOT gw_profiles.role;
 * those are different role-spaces and mixing them kills the filter silently.
 * RLS scopes this to the caller's own tenant, so no tenant_id filter here.
 */
export function useMyTenantRole(): string | null {
  const { user } = useAuth();
  const { data } = useQuery<string | null>({
    queryKey: ['tenant-nav-prefs-my-role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('gw_tenant_members')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      return (data?.role as string | undefined) ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  return data ?? null;
}

/**
 * The preview role that should actually be applied, or null.
 *
 * Returns non-null ONLY for tenant super-admins. Everyone else gets null no
 * matter what sits in sessionStorage, so forging the key does nothing.
 */
export function useEffectivePreviewRole(): NavRole | null {
  const previewRole = usePreviewRole();
  const myRole = useMyTenantRole();
  return myRole === 'super_admin' ? previewRole : null;
}
