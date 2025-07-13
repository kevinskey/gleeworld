import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

type Recording = Database['public']['Tables']['gw_recordings']['Row'];
type RecordingInsert = Database['public']['Tables']['gw_recordings']['Insert'];

interface RecordingFilters {
  sheet_music_id?: string;
  quality?: string;
  format?: string;
}

export const useRecordings = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRecordings = async (filters?: RecordingFilters) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('gw_recordings')
        .select('*')
        .eq('recorded_by', user.id)
        .order('created_at', { ascending: false });

      if (filters?.sheet_music_id) {
        query = query.eq('associated_sheet_music_id', filters.sheet_music_id);
      }

      if (filters?.quality) {
        query = query.eq('quality', filters.quality);
      }

      if (filters?.format) {
        query = query.eq('format', filters.format);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRecordings(data || []);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  };

  const uploadRecording = async (
    file: File, 
    recordingData: Omit<RecordingInsert, 'recorded_by' | 'audio_url' | 'created_at'>
  ) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Upload file to storage
      const fileName = `recordings/${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(fileName);

      // Create recording record
      const { data, error: insertError } = await supabase
        .from('gw_recordings')
        .insert({
          ...recordingData,
          recorded_by: user.id,
          audio_url: publicUrl,
          file_size: file.size,
          format: file.type,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setRecordings(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error uploading recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload recording');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRecording = async (id: string, updates: Partial<RecordingInsert>) => {
    try {
      setLoading(true);
      const { data, error: updateError } = await supabase
        .from('gw_recordings')
        .update(updates)
        .eq('id', id)
        .eq('recorded_by', user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setRecordings(prev => 
        prev.map(recording => recording.id === id ? data : recording)
      );
      return data;
    } catch (err) {
      console.error('Error updating recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to update recording');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteRecording = async (id: string) => {
    try {
      setLoading(true);
      
      // Find the recording to get its audio URL
      const recording = recordings.find(r => r.id === id);
      
      // Delete from database
      const { error: deleteError } = await supabase
        .from('gw_recordings')
        .delete()
        .eq('id', id)
        .eq('recorded_by', user?.id);

      if (deleteError) throw deleteError;

      // Delete file from storage if it exists
      if (recording?.audio_url) {
        const fileName = recording.audio_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('user-files')
            .remove([`recordings/${user?.id}/${fileName}`]);
        }
      }

      setRecordings(prev => prev.filter(recording => recording.id !== id));
    } catch (err) {
      console.error('Error deleting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete recording');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getRecordingsForSheetMusic = (sheetMusicId: string) => {
    return recordings.filter(recording => recording.associated_sheet_music_id === sheetMusicId);
  };

  useEffect(() => {
    if (user?.id) {
      fetchRecordings();
    }
  }, [user?.id]);

  return {
    recordings,
    loading,
    error,
    fetchRecordings,
    uploadRecording,
    updateRecording,
    deleteRecording,
    getRecordingsForSheetMusic,
  };
};