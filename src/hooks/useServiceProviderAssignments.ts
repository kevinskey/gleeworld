import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ServiceProviderAssignment {
  id: string;
  user_id: string;
  provider_name: string;
  services_offered: string[];
  is_active: boolean;
  assigned_at: string;
  email: string;
}

export const useServiceProviderAssignments = () => {
  return useQuery({
    queryKey: ['service-provider-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_service_providers')
        .select(`
          id,
          user_id,
          provider_name,
          services_offered,
          is_active,
          created_at,
          email
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(item => ({
        id: item.id,
        user_id: item.user_id,
        provider_name: item.provider_name,
        services_offered: item.services_offered || [],
        is_active: item.is_active,
        assigned_at: item.created_at,
        email: item.email
      })) as ServiceProviderAssignment[];
    }
  });
};

export const useAssignServiceProvider = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      providerName,
      email,
      servicesOffered 
    }: { 
      userId: string; 
      providerName: string;
      email: string;
      servicesOffered: string[]; 
    }) => {
      const { data, error } = await supabase
        .from('gw_service_providers')
        .insert({
          user_id: userId,
          provider_name: providerName,
          email: email,
          services_offered: servicesOffered,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-provider-assignments'] });
      toast({
        title: "Service Provider Assigned",
        description: "User has been successfully assigned as a service provider.",
      });
    },
    onError: (error) => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign service provider: " + error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUnassignServiceProvider = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('gw_service_providers')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-provider-assignments'] });
      toast({
        title: "Assignment Removed",
        description: "Service provider assignment has been deactivated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unassignment Failed",
        description: "Failed to remove assignment: " + error.message,
        variant: "destructive",
      });
    },
  });
};