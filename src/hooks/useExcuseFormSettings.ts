import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExcuseFormSettings {
  ensembles: string[];
  conflict_types: string[];
  policy_text: string | null;
  require_acknowledgment: boolean;
}

// Per-tenant absence-form configuration. RLS scopes the read to the
// current tenant; tenants with no row get the default simple form.
export function useExcuseFormSettings() {
  const { data, isLoading } = useQuery({
    queryKey: ['excuse-form-settings'],
    queryFn: async (): Promise<ExcuseFormSettings | null> => {
      const { data, error } = await (supabase as any)
        .from('gw_excuse_form_settings')
        .select('ensembles, conflict_types, policy_text, require_acknowledgment')
        .maybeSingle();
      if (error) {
        console.warn('[useExcuseFormSettings]', error.message);
        return null;
      }
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { settings: data ?? null, loading: isLoading };
}
