import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Database } from '@/integrations/supabase/types';

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

export const useSheetMusic = () => {
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);

  const fetchSheetMusic = useCallback(async () => {
    if (!userProfile?.user_id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('gw_sheet_music')
        .select('*')
        .eq('is_archived', false)
        .order('title');

      if (fetchError) throw fetchError;

      setSheetMusic(data || []);
    } catch (err) {
      console.error('Error fetching sheet music:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sheet music');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.user_id]);

  useEffect(() => {
    if (userProfile?.user_id) {
      fetchSheetMusic();
    }
  }, [userProfile?.user_id, fetchSheetMusic]);

  return {
    sheetMusic,
    loading,
    error,
    fetchSheetMusic,
  };
};