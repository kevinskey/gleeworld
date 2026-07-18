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
import { isTenantSuperAdminRole } from '@/lib/auth/tenantRoles';

/**
 * The caller's role from gw_tenant_members for the tenant whose site they
 * are currently on — the exact value the Navigation settings tab writes to
 * gw_tenant_nav_prefs.role. NOT gw_profiles.role; those are different
 * role-spaces and mixing them kills the filter silently.
 *
 * This MUST be scoped to the current tenant. An earlier version assumed
 * "RLS scopes this to the caller's own tenant, so no tenant_id filter here"
 * and used .maybeSingle(). Both halves were wrong: users really do hold
 * memberships in several tenants (18 of 103 in live data), and maybeSingle()
 * ERRORS when more than one row matches, returning null — so every
 * multi-tenant user silently failed the super-admin gate no matter how their
 * role was spelled. One Lyke House super-admin is also a student elsewhere;
 * another super_admin is a fan elsewhere.
 *
 * Returning the row for the CURRENT tenant is also the correct semantics:
 * being a super-admin of tenant A must not grant admin nav on tenant B.
 */
export function useMyTenantRole(): string | null {
  const { user } = useAuth();
  const tenantSlug = (typeof window !== 'undefined'
    && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || 'main';

  const { data } = useQuery<string | null>({
    queryKey: ['tenant-nav-prefs-my-role', user?.id, tenantSlug],
    queryFn: async () => {
      if (!user) return null;
      // Resolve this subdomain's tenant id, then read the membership row
      // for exactly that tenant. Two small reads, both cached.
      const { data: tenantRow } = await supabase
        .from('gw_tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .maybeSingle();
      const tenantId = (tenantRow as { id?: string } | null)?.id;
      if (!tenantId) return null;

      const { data: rows } = await supabase
        .from('gw_tenant_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId);
      // No .maybeSingle(): take the first row for this tenant. A duplicate
      // membership row must not blank the role out.
      const first = (rows as Array<{ role?: string }> | null)?.[0];
      return first?.role ?? null;
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  return data ?? null;
}

/**
 * The preview role that should actually be applied, or null.
 *
 * Returns non-null ONLY for tenant super-admins (either spelling). Everyone
 * else gets null no matter what sits in sessionStorage, so forging the key
 * does nothing.
 */
export function useEffectivePreviewRole(): NavRole | null {
  const previewRole = usePreviewRole();
  const myRole = useMyTenantRole();
  return isTenantSuperAdminRole(myRole) ? previewRole : null;
}
