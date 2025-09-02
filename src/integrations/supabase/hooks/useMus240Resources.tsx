import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Mus240Resource {
  id: string;
  title: string;
  url: string;
  description: string;
  category: 'reading' | 'website' | 'video' | 'article' | 'database';
  is_active: boolean;
  display_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  is_file_upload?: boolean;
}

export function useMus240Resources() {
  return useQuery({
    queryKey: ['mus240-resources', Date.now()], // Force cache refresh
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_resources')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Mus240Resource[];
    },
  });
}

export function useCreateMus240Resource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (resource: Omit<Mus240Resource, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('mus240_resources')
        .insert([resource])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mus240-resources'] });
      queryClient.invalidateQueries({ queryKey: ['mus240-resources-admin'] });
    },
  });
}

export function useUpdateMus240Resource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Mus240Resource> & { id: string }) => {
      const { data, error } = await supabase
        .from('mus240_resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mus240-resources'] });
      queryClient.invalidateQueries({ queryKey: ['mus240-resources-admin'] });
    },
  });
}

export function useDeleteMus240Resource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mus240_resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mus240-resources'] });
      queryClient.invalidateQueries({ queryKey: ['mus240-resources-admin'] });
    },
  });
}

// Admin hook to fetch all resources (including inactive ones)
export function useMus240ResourcesAdmin() {
  return useQuery({
    queryKey: ['mus240-resources-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mus240_resources')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Mus240Resource[];
    },
  });
}