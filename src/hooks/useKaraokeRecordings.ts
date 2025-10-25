import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KaraokeRecording {
  id: string;
  user_id: string;
  title: string;
  audio_url: string;
  audio_duration: number | null;
  file_path: string;
  song_name: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  likes: number;
}

export const useKaraokeRecordings = () => {
  const [recordings, setRecordings] = useState<KaraokeRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('karaoke_recordings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error fetching karaoke recordings:', error);
      toast({
        title: "Error",
        description: "Failed to load recordings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadRecording = async (
    audioBlob: Blob,
    title: string = 'Karaoke Recording',
    songName?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload audio to Supabase Storage
      const fileName = `karaoke-${Date.now()}.webm`;
      const filePath = `karaoke-recordings/${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sight-singing-recordings')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sight-singing-recordings')
        .getPublicUrl(filePath);

      // Calculate duration (approximate from blob size)
      const duration = Math.floor(audioBlob.size / 16000); // rough estimate

      // Insert recording metadata
      const { data, error } = await supabase
        .from('karaoke_recordings')
        .insert({
          user_id: user.id,
          title,
          audio_url: publicUrl,
          audio_duration: duration,
          file_path: filePath,
          song_name: songName,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your recording has been uploaded",
      });

      await fetchRecordings();
      return { success: true, recording: data };
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast({
        title: "Error",
        description: "Failed to upload recording",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const deleteRecording = async (id: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('sight-singing-recordings')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('karaoke_recordings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Recording deleted successfully",
      });

      await fetchRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Error",
        description: "Failed to delete recording",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  return {
    recordings,
    loading,
    uploadRecording,
    deleteRecording,
    refetch: fetchRecordings,
  };
};
