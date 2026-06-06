import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantModule {
  module_id: string;
  module_name: string;
  description: string | null;
  tier: 'starter' | 'addon' | 'enterprise';
  category: string | null;
  icon: string | null;
  sort_order: number;
  status: 'starter' | 'active' | 'trial' | 'past_due' | 'cancelled';
  current_period_end: string | null;
  trial_ends_at: string | null;
}

/**
 * All modules currently accessible to the signed-in user's tenant.
 * Returns starter modules + any active/trial add-ons. RLS scopes to current tenant.
 */
export function useTenantModules() {
  return useQuery<TenantModule[]>({
    queryKey: ['v_tenant_active_modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_tenant_active_modules')
        .select('*');
      if (error) {
        console.warn('[useTenantModules] query failed', error.message);
        return [];
      }
      return (data ?? []) as TenantModule[];
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

/** Boolean check for one module — most call sites only need this. */
export function useModuleAccess(moduleId: string) {
  const { data: modules = [], isLoading } = useTenantModules();
  const found = modules.find((m) => m.module_id === moduleId);
  return {
    isLoading,
    hasAccess: !!found,
    status: found?.status ?? null,
    isTrial: found?.status === 'trial',
    trialEndsAt: found?.trial_ends_at ?? null,
  };
}
