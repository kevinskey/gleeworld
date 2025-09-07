import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceProvider {
  id: string;
  user_id?: string;
  provider_name: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  bio?: string;
  profile_image_url?: string;
  is_active: boolean;
  services_offered: string[];
  default_calendar_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  break_between_slots_minutes: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderTimeOff {
  id: string;
  provider_id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  is_recurring: boolean;
  recurrence_type?: string; // Changed from union type to string
  created_at: string;
  updated_at: string;
}

// Hook to get all service providers
export const useServiceProviders = () => {
  return useQuery({
    queryKey: ['service-providers'],
    queryFn: async (): Promise<ServiceProvider[]> => {
      const { data, error } = await supabase
        .from('gw_service_providers')
        .select('*')
        .eq('is_active', true)
        .order('provider_name');

      if (error) {
        console.error('Error fetching service providers:', error);
        throw error;
      }

      return data || [];
    }
  });
};

// Hook to get current user's provider profile
export const useCurrentProvider = () => {
  return useQuery({
    queryKey: ['current-provider'],
    queryFn: async (): Promise<ServiceProvider | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('gw_service_providers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        console.error('Error fetching current provider:', error);
        throw error;
      }

      return data;
    }
  });
};

// Hook to get provider availability
export const useProviderAvailability = (providerId?: string) => {
  return useQuery({
    queryKey: ['provider-availability', providerId],
    queryFn: async (): Promise<ProviderAvailability[]> => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from('gw_provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .order('day_of_week')
        .order('start_time');

      if (error) {
        console.error('Error fetching provider availability:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!providerId
  });
};

// Hook to get provider time off
export const useProviderTimeOff = (providerId?: string) => {
  return useQuery({
    queryKey: ['provider-time-off', providerId],
    queryFn: async (): Promise<ProviderTimeOff[]> => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from('gw_provider_time_off')
        .select('*')
        .eq('provider_id', providerId)
        .order('start_date');

      if (error) {
        console.error('Error fetching provider time off:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!providerId
  });
};

// Hook to create/update provider availability
export const useUpdateProviderAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (availability: Omit<ProviderAvailability, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      if (availability.id) {
        // Update existing
        const { id, ...updateData } = availability;
        const { data, error } = await supabase
          .from('gw_provider_availability')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { id, ...insertData } = availability;
        const { data, error } = await supabase
          .from('gw_provider_availability')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-availability', data.provider_id] });
    }
  });
};

// Hook to delete provider availability
export const useDeleteProviderAvailability = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (availabilityId: string) => {
      const { error } = await supabase
        .from('gw_provider_availability')
        .delete()
        .eq('id', availabilityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
    }
  });
};

// Hook to create/update provider time off
export const useUpdateProviderTimeOff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeOff: Omit<ProviderTimeOff, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      if (timeOff.id) {
        // Update existing
        const { id, ...updateData } = timeOff;
        const { data, error } = await supabase
          .from('gw_provider_time_off')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { id, ...insertData } = timeOff;
        const { data, error } = await supabase
          .from('gw_provider_time_off')
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['provider-time-off', data.provider_id] });
    }
  });
};

// Hook to update provider profile
export const useUpdateProviderProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<ServiceProvider> & { id: string }) => {
      const { data, error } = await supabase
        .from('gw_service_providers')
        .update(updates)
        .eq('id', updates.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
    }
  });
};