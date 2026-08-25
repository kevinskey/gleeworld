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
// Tenant super-admins always see every nav item so they can reach
// settings to unhide things later. Both spellings count — see
// isTenantSuperAdminRole; real tenants store 'super-admin'.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMyTenantRole, useEffectivePreviewRole } from '@/hooks/useEffectivePreviewRole';
import { isTenantSuperAdminRole } from '@/lib/auth/tenantRoles';

interface NavPrefRow {
  role: string;
  hidden_items: string[] | null;
  /** The shelf a NEW member of this role starts with — My World →
   *  "Defaults for members". Selected here rather than through
   *  useTenantDefaultTools so a preview costs no extra round trip: it is the
   *  same table, the same row, and this query is already on every page. */
  default_tools: string[] | null;
}

/**
 * The tenant's configured default shelf for a role, or null when that role
 * has none saved. Reads the row this hook already fetched.
 */
export function useTenantRoleDefaults(role: string | null | undefined): string[] | null {
  const { user } = useAuth();
  const { data: rows = [] } = useQuery<NavPrefRow[]>({
    queryKey: ['tenant-nav-prefs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tenant_nav_prefs')
        .select('role, hidden_items, default_tools');
      if (error) return [];
      return (data as NavPrefRow[]) ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return useMemo(() => {
    if (!role) return null;
    const configured = rows.find((r) => r.role === role)?.default_tools;
    // An absent list means the tenant never configured this role. An empty
    // one is a real choice and is NOT the same thing — only the former should
    // fall back to the built-in constants.
    return Array.isArray(configured) && configured.length > 0 ? configured : null;
  }, [role, rows]);
}

export function useTenantNavPrefs(): Set<string> {
  const { user } = useAuth();
  const myRole = useMyTenantRole();
  const previewRole = useEffectivePreviewRole();

  const { data: rows = [] } = useQuery<NavPrefRow[]>({
    queryKey: ['tenant-nav-prefs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_tenant_nav_prefs')
        .select('role, hidden_items, default_tools');
      if (error) return [];
      return (data as NavPrefRow[]) ?? [];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Preview override — a super-admin can turn on "Preview as <role>" from
  // the header's Views switcher to see the nav through that role's eyes
  // without signing out. useEffectivePreviewRole already enforces that this
  // is non-null only for super-admins.
  const effectiveRole = previewRole ?? myRole;

  // Memoized so consumers can use the Set as a dependency — a fresh Set
  // every render made downstream useMemos (HouseHome's NavContext) inert.
  return useMemo(() => {
    // Tenant super-admin bypass. If we haven't resolved the role yet,
    // do NOT filter — otherwise the sidebar flashes empty during the
    // first render.
    if (!effectiveRole || isTenantSuperAdminRole(effectiveRole)) return new Set<string>();
    const row = rows.find((r) => r.role === effectiveRole);
    return new Set(row?.hidden_items ?? []);
  }, [effectiveRole, rows]);
}
