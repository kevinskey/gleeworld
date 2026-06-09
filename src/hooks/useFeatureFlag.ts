import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureFlag(key: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['feature_flag', key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_feature_flags')
        .select('is_enabled')
        .eq('flag_key', key)
        .maybeSingle();
      if (error) throw error;
      return data?.is_enabled ?? false;
    },
    staleTime: 60_000,
  });

  return { enabled: data ?? false, isLoading };
}
