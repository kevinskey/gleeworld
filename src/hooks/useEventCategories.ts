// Tenant-scoped event categories. Backed by public.gw_event_categories
// (RLS + DEFAULT current_tenant_id() + BEFORE INSERT trigger). Defaults
// are seeded by the migration with is_default=true so the dialog can
// gate deletion.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventCategory {
  id: string;
  slug: string;
  label: string;
  color: string;
  icon: string;
  position: number;
  is_default: boolean;
}

const KEY = ['event-categories'];

export function useEventCategories() {
  return useQuery<EventCategory[]>({
    queryKey: KEY,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_event_categories')
        .select('id, slug, label, color, icon, position, is_default')
        .order('position')
        .order('label');
      if (error) throw error;
      return (data as EventCategory[]) || [];
    },
  });
}

export function useCreateEventCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; color: string; icon?: string }) => {
      const slug = input.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || `cat-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from('gw_event_categories')
        .insert({
          slug,
          label: input.label,
          color: input.color,
          icon: input.icon ?? 'tag',
          position: 1000,
          is_default: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EventCategory;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteEventCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_event_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateEventCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; label?: string; color?: string }) => {
      const patch: Record<string, unknown> = {};
      if (input.label !== undefined) patch.label = input.label;
      if (input.color !== undefined) patch.color = input.color;
      const { error } = await supabase
        .from('gw_event_categories')
        .update(patch)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
