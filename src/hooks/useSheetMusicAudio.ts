import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SheetMusicAudio {
  audio_url: string | null;
  audio_title: string | null;
  apple_music_id: string | null;
  apple_music_storefront: string | null;
  apple_music_title: string | null;
  apple_music_artist: string | null;
  apple_music_artwork_url: string | null;
}

export const useSheetMusicAudio = (musicId: string | undefined) => {
  const [audioData, setAudioData] = useState<SheetMusicAudio | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAudioAssociation = useCallback(async () => {
    if (!musicId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('audio_url, audio_title, apple_music_id, apple_music_storefront, apple_music_title, apple_music_artist, apple_music_artwork_url')
        .eq('id', musicId)
        .single();

      if (error) {
        console.error('Error fetching audio association:', error);
        return;
      }

      setAudioData(data);
    } catch (err) {
      console.error('Error fetching audio association:', err);
    } finally {
      setLoading(false);
    }
  }, [musicId]);

  const saveAudioAssociation = useCallback(async (audioUrl: string, audioTitle: string) => {
    if (!musicId) {
      toast.error('Cannot save audio: No music ID');
      return false;
    }

    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({ 
          audio_url: audioUrl, 
          audio_title: audioTitle 
        })
        .eq('id', musicId);

      if (error) {
        console.error('Error saving audio association:', error);
        toast.error('Failed to save audio association');
        return false;
      }

      setAudioData({ audio_url: audioUrl, audio_title: audioTitle });
      toast.success('Audio linked to this score');
      return true;
    } catch (err) {
      console.error('Error saving audio association:', err);
      toast.error('Failed to save audio association');
      return false;
    }
  }, [musicId]);

  const clearAudioAssociation = useCallback(async () => {
    if (!musicId) return false;

    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({ 
          audio_url: null, 
          audio_title: null 
        })
        .eq('id', musicId);

      if (error) {
        console.error('Error clearing audio association:', error);
        toast.error('Failed to clear audio association');
        return false;
      }

      setAudioData(null);
      toast.success('Audio association removed');
      return true;
    } catch (err) {
      console.error('Error clearing audio association:', err);
      toast.error('Failed to clear audio association');
      return false;
    }
  }, [musicId]);

  useEffect(() => {
    fetchAudioAssociation();
  }, [fetchAudioAssociation]);

  return {
    audioData,
    loading,
    saveAudioAssociation,
    clearAudioAssociation,
    refetch: fetchAudioAssociation,
  };
};
