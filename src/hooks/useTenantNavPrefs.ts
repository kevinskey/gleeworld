// Tenant navigation preferences hook.
//
// Returns the Set of nav paths the current user should NOT see in the
// sidebar, based on their tenant role.
//
// SOURCE OF TRUTH — critical: the Navigation settings tab writes rows
// keyed by gw_tenant_members.role (values: super_admin, admin, student,
// fan, graduate, member). We MUST look up the current user's role from
// the same table, not from gw_profiles.role — those are different
// role-spaces and mixing them silently kills the filter.
//
// Super-admins (gw_tenant_members.role = 'super_admin') always see
// every nav item so they can reach settings to unhide things later.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePreviewRole } from '@/lib/nav/navPreview';

interface NavPrefRow {
  role: string;
  hidden_items: string[] | null;
}

export function useTenantNavPrefs(): Set<string> {
  const { user } = useAuth();
  const previewRole = usePreviewRole();

  // Current user's tenant-scoped role — the exact value the Nav tab
  // wrote to gw_tenant_nav_prefs.role. RLS scopes this to the caller's
  // own tenant, so no explicit tenant_id filter is required.
  const { data: myRole } = useQuery<string | null>({
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

  const { data: rows = [] } = useQuery<NavPrefRow[]>({
    queryKey: ['tenant-nav-prefs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tenant_nav_prefs')
        .select('role, hidden_items');
      if (error) return [];
      return (data as NavPrefRow[]) ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Preview override — a super-admin on the Navigation settings tab
  // can turn on "Preview as <role>" to see the nav through that
  // role's eyes without signing out. This ONLY takes effect for
  // super-admins so a non-admin can't opt themselves out of a
  // restriction their tenant admin set.
  const effectiveRole = (myRole === 'super_admin' && previewRole) ? previewRole : myRole;

  // Memoized so consumers can use the Set as a dependency — a fresh Set
  // every render made downstream useMemos (HouseHome's NavContext) inert.
  return useMemo(() => {
    // Tenant super-admin bypass. If we haven't resolved the role yet,
    // do NOT filter — otherwise the sidebar flashes empty during the
    // first render.
    if (!effectiveRole || effectiveRole === 'super_admin') return new Set<string>();
    const row = rows.find((r) => r.role === effectiveRole);
    return new Set(row?.hidden_items ?? []);
  }, [effectiveRole, rows]);
}
