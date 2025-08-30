import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Track {
  title: string;
  source: string;
  url: string;
}

export const useMus240VideoEdits = (weekNumber: number) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVideoEdits();
  }, [weekNumber]);

  const fetchVideoEdits = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('mus240_video_edits')
        .select('tracks')
        .eq('week_number', weekNumber)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching video edits:', error);
        return;
      }

      if (data?.tracks) {
        setTracks(data.tracks as unknown as Track[]);
      }
    } catch (error) {
      console.error('Error fetching video edits:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveVideoEdits = async (editedTracks: Track[]) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('mus240_video_edits')
        .upsert({
          week_number: weekNumber,
          tracks: editedTracks as any,
          edited_by: (await supabase.auth.getUser()).data.user?.id
        }, {
          onConflict: 'week_number'
        });

      if (error) {
        throw error;
      }

      setTracks(editedTracks);
      
      toast({
        title: "Changes Saved",
        description: "Video edits have been saved successfully.",
      });

      return true;
    } catch (error) {
      console.error('Error saving video edits:', error);
      toast({
        title: "Error Saving",
        description: "Failed to save video edits. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    tracks,
    loading,
    saving,
    saveVideoEdits,
    refetch: fetchVideoEdits
  };
};