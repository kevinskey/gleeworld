import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AnnotationShare {
  id: string;
  annotation_id: string;
  shared_by: string;
  shared_with: string;
  created_at: string;
  expires_at: string | null;
}

export const useAnnotationSharing = () => {
  const [loading, setLoading] = useState(false);

  const shareAnnotation = useCallback(async (
    annotationId: string,
    sharedWithUserId: string,
    expiresAt?: Date
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music_annotation_shares')
        .insert({
          annotation_id: annotationId,
          shared_by: (await supabase.auth.getUser()).data.user?.id,
          shared_with: sharedWithUserId,
          expires_at: expiresAt?.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Annotation shared successfully');
      return data as AnnotationShare;
    } catch (error: any) {
      console.error('Error sharing annotation:', error);
      toast.error(error.message || 'Failed to share annotation');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const unshareAnnotation = useCallback(async (shareId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('gw_sheet_music_annotation_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast.success('Annotation unshared');
      return true;
    } catch (error: any) {
      console.error('Error unsharing annotation:', error);
      toast.error('Failed to remove share');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAnnotationShares = useCallback(async (annotationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music_annotation_shares')
        .select('*')
        .eq('annotation_id', annotationId);

      if (error) throw error;

      return (data || []) as AnnotationShare[];
    } catch (error) {
      console.error('Error fetching shares:', error);
      toast.error('Failed to load shares');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    shareAnnotation,
    unshareAnnotation,
    getAnnotationShares
  };
};
