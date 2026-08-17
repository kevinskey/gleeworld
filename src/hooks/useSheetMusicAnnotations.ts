import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { annotationTarget, isPersonalScoreId } from '@/lib/viewerScoreId';

export interface Annotation {
  id: string;
  sheet_music_id: string;
  user_id: string;
  page_number: number;
  annotation_type: 'drawing' | 'highlight' | 'text_note' | 'stamp';
  annotation_data: any;
  position_data: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  annotation_layer_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useSheetMusicAnnotations = (sheetMusicId?: string) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchAnnotations = useCallback(async (musicId: string, pageNumber?: number) => {
    if (!musicId) return;
    
    setLoading(true);
    try {
      const t = annotationTarget(musicId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from(t.table)
        .select('*')
        .eq(t.idColumn, t.rowId)
        .order('created_at', { ascending: true });

      if (pageNumber !== undefined) {
        query = query.eq('page_number', pageNumber);
      }

      const { data, error } = await query;

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data || []).map((r: any) => ({
        ...r,
        sheet_music_id: musicId,                       // prefixed id round-trips
        annotation_layer_id: r.annotation_layer_id ?? null, // personal table has no layers
      }));
      setAnnotations(rows as Annotation[]);
    } catch (error) {
      console.error('Error fetching annotations:', error);
      toast.error('Failed to load annotations');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAnnotation = useCallback(async (
    musicId: string,
    pageNumber: number,
    type: Annotation['annotation_type'],
    annotationData: any,
    positionData: Annotation['position_data'],
    annotationLayerId?: string | null,
  ) => {
    if (!user?.id || !musicId) return null;

    try {
      const t = annotationTarget(musicId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(t.table)
        .insert({
          [t.idColumn]: t.rowId,
          user_id: user.id,
          page_number: pageNumber,
          annotation_type: type,
          annotation_data: annotationData,
          position_data: positionData,
          ...(t.table === 'gw_sheet_music_annotations'
            ? { annotation_layer_id: annotationLayerId ?? null }
            : {}),
        });

      if (error) throw error;

      // Log analytics (skip for personal scores — RPC FKs gw_sheet_music)
      if (!isPersonalScoreId(musicId)) {
        await supabase.rpc('log_sheet_music_analytics', {
          sheet_music_id_param: musicId,
          user_id_param: user.id,
          action_type_param: 'annotate',
          page_number_param: pageNumber,
          device_type_param: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
        });
      }

      // Success (we'll refetch annotations after save)
      return true;
    } catch (error: any) {
      console.error('Error saving annotation:', error, { musicId, pageNumber, type });
      toast.error(`Failed to save annotation: ${error?.message || error?.hint || 'Unknown error'}`);
      return null;
    }
  }, [user?.id]);

  const updateAnnotation = useCallback(async (
    annotationId: string,
    annotationData: any,
    positionData?: Annotation['position_data']
  ) => {
    if (!user?.id) return false;

    try {
      const updateData: any = { annotation_data: annotationData };
      if (positionData) {
        updateData.position_data = positionData;
      }

      const t = annotationTarget(sheetMusicId ?? '');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from(t.table)
        .update(updateData)
        .eq('id', annotationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setAnnotations(prev =>
        prev.map(annotation =>
          annotation.id === annotationId ? { ...annotation, ...(data as Annotation) } : annotation
        )
      );

      return true;
    } catch (error) {
      console.error('Error updating annotation:', error);
      toast.error('Failed to update annotation');
      return false;
    }
  }, [user?.id, sheetMusicId]);

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    if (!user?.id) return false;

    try {
      const t = annotationTarget(sheetMusicId ?? '');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(t.table)
        .delete()
        .eq('id', annotationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setAnnotations(prev => prev.filter(annotation => annotation.id !== annotationId));
      toast.success('Annotation deleted');
      return true;
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Failed to delete annotation');
      return false;
    }
  }, [user?.id, sheetMusicId]);

  const clearPageAnnotations = useCallback(async (musicId: string, pageNumber: number) => {
    if (!user?.id) return false;

    try {
      const t = annotationTarget(musicId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from(t.table)
        .delete()
        .eq(t.idColumn, t.rowId)
        .eq('page_number', pageNumber)
        .eq('user_id', user.id);

      if (error) throw error;

      setAnnotations(prev => 
        prev.filter(annotation => 
          !(annotation.sheet_music_id === musicId && 
            annotation.page_number === pageNumber &&
            annotation.user_id === user.id)
        )
      );

      toast.success('Page annotations cleared');
      return true;
    } catch (error) {
      console.error('Error clearing annotations:', error);
      toast.error('Failed to clear annotations');
      return false;
    }
  }, [user?.id]);

  return {
    annotations,
    loading,
    fetchAnnotations,
    saveAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearPageAnnotations
  };
};