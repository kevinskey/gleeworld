import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProviderService {
  id: string;
  provider_id: string;
  service_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service?: {
    id: string;
    name: string;
    category: string;
    price_display: string;
    duration_minutes: number;
  };
}

// Hook to get services for a specific provider
export const useProviderServices = (providerId?: string) => {
  return useQuery({
    queryKey: ['provider-services', providerId],
    queryFn: async (): Promise<ProviderService[]> => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from('gw_provider_services')
        .select(`
          *,
          service:service_id (
            id,
            name,
            category,
            price_display,
            duration_minutes
          )
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching provider services:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!providerId
  });
};

// Hook to get services available to a provider (not yet assigned)
export const useAvailableServices = (providerId?: string) => {
  return useQuery({
    queryKey: ['available-services', providerId],
    queryFn: async () => {
      if (!providerId) return [];

      // Get all services
      const { data: allServices, error: servicesError } = await supabase
        .from('gw_services')
        .select('*')
        .eq('is_active', true);

      if (servicesError) throw servicesError;

      // Get services already assigned to this provider
      const { data: assignedServices, error: assignedError } = await supabase
        .from('gw_provider_services')
        .select('service_id')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (assignedError) throw assignedError;

      const assignedServiceIds = new Set(assignedServices?.map(ps => ps.service_id) || []);
      
      return allServices?.filter(service => !assignedServiceIds.has(service.id)) || [];
    },
    enabled: !!providerId
  });
};

// Hook to assign a service to a provider
export const useAssignServiceToProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, serviceId }: { providerId: string; serviceId: string }) => {
      const { data, error } = await supabase
        .from('gw_provider_services')
        .insert({
          provider_id: providerId,
          service_id: serviceId,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { providerId }) => {
      queryClient.invalidateQueries({ queryKey: ['provider-services', providerId] });
      queryClient.invalidateQueries({ queryKey: ['available-services', providerId] });
    }
  });
};

// Hook to remove a service from a provider
export const useRemoveServiceFromProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, serviceId }: { providerId: string; serviceId: string }) => {
      const { error } = await supabase
        .from('gw_provider_services')
        .update({ is_active: false })
        .eq('provider_id', providerId)
        .eq('service_id', serviceId);

      if (error) throw error;
    },
    onSuccess: (_, { providerId }) => {
      queryClient.invalidateQueries({ queryKey: ['provider-services', providerId] });
      queryClient.invalidateQueries({ queryKey: ['available-services', providerId] });
    }
  });
};

// Hook to get providers for a specific service
export const useServiceProviders = (serviceId?: string) => {
  return useQuery({
    queryKey: ['service-providers', serviceId],
    queryFn: async () => {
      if (!serviceId) return [];

      const { data, error } = await supabase
        .from('gw_provider_services')
        .select(`
          *,
          provider:provider_id (
            id,
            provider_name,
            title,
            email,
            department,
            profile_image_url
          )
        `)
        .eq('service_id', serviceId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching service providers:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!serviceId
  });
};