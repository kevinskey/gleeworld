import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isPersonalScoreId, toTableId } from '@/lib/viewerScoreId';

// gw_personal_score_annotations is the personal-score twin of
// gw_sheet_music_annotations (that one FKs gw_sheet_music). Both are
// addressed here through the viewer id: `personal:`-prefixed ids route to
// the personal table with the bare uuid; anything else is a tenant score.
const routeFor = (musicId: string) =>
  isPersonalScoreId(musicId)
    ? { table: 'gw_personal_score_annotations', idColumn: 'personal_score_id', idValue: toTableId(musicId), personal: true as const }
    : { table: 'gw_sheet_music_annotations', idColumn: 'sheet_music_id', idValue: musicId, personal: false as const };

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
      const route = routeFor(musicId);
      let query = (supabase as any)
        .from(route.table)
        .select('*')
        .eq(route.idColumn, route.idValue)
        .order('created_at', { ascending: true });

      if (pageNumber !== undefined) {
        query = query.eq('page_number', pageNumber);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnnotations((data || []).map((r: any) =>
        route.personal ? { ...r, sheet_music_id: musicId, annotation_layer_id: null } : r
      ) as Annotation[]);
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
      const route = routeFor(musicId);
      const { error } = await (supabase as any)
        .from(route.table)
        .insert({
          [route.idColumn]: route.idValue,
          user_id: user.id,
          page_number: pageNumber,
          annotation_type: type,
          annotation_data: annotationData,
          position_data: positionData,
          ...(route.personal ? {} : { annotation_layer_id: annotationLayerId ?? null }),
        });

      if (error) throw error;

      if (!route.personal) {
        // Log analytics
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
      const route = routeFor(sheetMusicId ?? '');
      const updateData: any = { annotation_data: annotationData };
      if (positionData) {
        updateData.position_data = positionData;
      }

      const { data, error } = await (supabase as any)
        .from(route.table)
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
      const route = routeFor(sheetMusicId ?? '');
      const { error } = await (supabase as any)
        .from(route.table)
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
      const route = routeFor(musicId);
      const { error } = await (supabase as any)
        .from(route.table)
        .delete()
        .eq(route.idColumn, route.idValue)
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