import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Countdown {
  id: string;
  event_name: string;
  target_date: string;
  is_active: boolean;
  display_in_header: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useCountdowns = () => {
  return useQuery({
    queryKey: ['countdowns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_countdowns')
        .select('*')
        .order('target_date', { ascending: true });
      
      if (error) throw error;
      return data as Countdown[];
    },
  });
};

export const useActiveHeaderCountdown = () => {
  return useQuery({
    queryKey: ['active-header-countdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_countdowns')
        .select('*')
        .eq('is_active', true)
        .eq('display_in_header', true)
        .gte('target_date', new Date().toISOString())
        .order('target_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as Countdown | null;
    },
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useCreateCountdown = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (countdown: Omit<Countdown, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('gw_countdowns')
        .insert(countdown)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['active-header-countdown'] });
    },
  });
};

export const useUpdateCountdown = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Countdown> & { id: string }) => {
      const { data, error } = await supabase
        .from('gw_countdowns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['active-header-countdown'] });
    },
  });
};

export const useDeleteCountdown = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_countdowns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['active-header-countdown'] });
    },
  });
};

export const useSetActiveCountdown = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First, deactivate all countdowns
      await supabase
        .from('gw_countdowns')
        .update({ is_active: false })
        .neq('id', id);
      
      // Then activate the selected one
      const { data, error } = await supabase
        .from('gw_countdowns')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      queryClient.invalidateQueries({ queryKey: ['active-header-countdown'] });
    },
  });
};
