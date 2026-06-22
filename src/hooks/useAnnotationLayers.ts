import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AnnotationLayer {
  id: string;
  sheet_music_id: string;
  user_id: string | null;
  name: string;
  color: string;
  is_visible: boolean;
  sort_order: number;
}

// Per-score annotation layers. user_id is set to the caller's id when the
// layer is meant to be private; pass null for shared layers visible to
// every member of the tenant.
export function useAnnotationLayers(sheetMusicId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ['annotation-layers', sheetMusicId];

  const { data: layers = [], isLoading } = useQuery<AnnotationLayer[]>({
    queryKey,
    enabled: !!sheetMusicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music_annotation_layers')
        .select('*')
        .eq('sheet_music_id', sheetMusicId!)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as AnnotationLayer[];
    },
  });

  const addLayer = useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      if (!sheetMusicId) throw new Error('Missing sheet_music_id');
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase
        .from('gw_sheet_music_annotation_layers')
        .insert({
          sheet_music_id: sheetMusicId,
          user_id: user?.id ?? null,
          name: input.name.trim(),
          color: input.color ?? '#ff0000',
          sort_order: layers.length,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AnnotationLayer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const toggleLayerVisible = useMutation({
    mutationFn: async (input: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from('gw_sheet_music_annotation_layers')
        .update({ is_visible: input.visible, updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const renameLayer = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase
        .from('gw_sheet_music_annotation_layers')
        .update({ name: input.name.trim(), updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const deleteLayer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_sheet_music_annotation_layers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return { layers, isLoading, addLayer, toggleLayerVisible, renameLayer, deleteLayer };
}
