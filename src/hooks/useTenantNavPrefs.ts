// Tenant navigation preferences hook.
//
// Returns the Set of nav paths the current user should NOT see in the
// sidebar, based on their tenant role. Super-admins bypass filtering
// entirely — they always see every nav item so they can reach settings
// to unhide things later.

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface NavPrefRow {
  role: string;
  hidden_items: string[] | null;
}

export function useTenantNavPrefs(): Set<string> {
  const { user } = useAuth();
  const { profile } = useUserRole();

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

  // Super-admin always sees everything — don't filter their nav.
  if (profile?.is_super_admin) return new Set<string>();

  // Match the current user's role to a preferences row. Fall back to
  // an empty set if no prefs are configured for that role.
  const role = profile?.role ?? 'member';
  const row = rows.find((r) => r.role === role);
  return new Set(row?.hidden_items ?? []);
}
