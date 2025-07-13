import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSheetMusicAnalytics = () => {
  const { user } = useAuth();

  const logView = useCallback(async (sheetMusicId: string, pageNumber: number) => {
    if (!user?.id || !sheetMusicId) return;

    try {
      await supabase.rpc('log_sheet_music_analytics', {
        sheet_music_id_param: sheetMusicId,
        user_id_param: user.id,
        action_type_param: 'view',
        page_number_param: pageNumber,
        device_type_param: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
      });
    } catch (error) {
      console.error('Error logging view:', error);
    }
  }, [user?.id]);

  const logDownload = useCallback(async (sheetMusicId: string) => {
    if (!user?.id || !sheetMusicId) return;

    try {
      await supabase.rpc('log_sheet_music_analytics', {
        sheet_music_id_param: sheetMusicId,
        user_id_param: user.id,
        action_type_param: 'download',
        device_type_param: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
      });
    } catch (error) {
      console.error('Error logging download:', error);
    }
  }, [user?.id]);

  return {
    logView,
    logDownload
  };
};