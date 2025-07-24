import { supabase } from '@/integrations/supabase/client';

export interface SheetMusicAnalyticsData {
  sheetMusicId: string;
  userId: string;
  actionType: 'view' | 'download' | 'print' | 'annotate' | 'play_audio' | 'search';
  pageNumber?: number;
  sessionDuration?: number;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
}

/**
 * Consolidated analytics logger to prevent code duplication
 * Uses the database function for consistent logging
 */
export const logSheetMusicAction = async (data: SheetMusicAnalyticsData): Promise<void> => {
  try {
    const { error } = await supabase.rpc('log_sheet_music_action', {
      p_sheet_music_id: data.sheetMusicId,
      p_user_id: data.userId,
      p_action_type: data.actionType,
      p_page_number: data.pageNumber || null,
      p_session_duration: data.sessionDuration || null,
      p_device_type: data.deviceType || null
    });

    if (error) {
      console.error('Analytics logging error:', error);
      // Don't throw - analytics should not break user experience
    }
  } catch (error) {
    console.error('Analytics logging failed:', error);
    // Silently fail to avoid disrupting user experience
  }
};

/**
 * Get device type for analytics
 */
export const getDeviceType = (): 'desktop' | 'tablet' | 'mobile' => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/tablet|ipad/.test(userAgent)) {
    return 'tablet';
  }
  
  if (/mobile|phone|android|ios/.test(userAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
};

/**
 * Batch analytics for bulk operations
 */
export const logBulkSheetMusicActions = async (actions: SheetMusicAnalyticsData[]): Promise<void> => {
  // Process in parallel but don't wait for completion
  Promise.all(actions.map(action => logSheetMusicAction(action))).catch(error => {
    console.error('Bulk analytics logging failed:', error);
  });
};