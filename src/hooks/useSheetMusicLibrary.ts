import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SheetMusic = {
  id: string;
  title: string;
  composer?: string;
  arranger?: string;
  difficulty_level?: string;
  key_signature?: string;
  time_signature?: string;
  voice_parts?: string[];
  tags?: string[];
  xml_content?: string;
  xml_url?: string;
  pdf_url?: string;
  created_at?: string;
  created_by?: string;
  is_public?: boolean;
};

export const useSheetMusicLibrary = () => {
  const [scores, setScores] = useState<SheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase.from('gw_sheet_music').select('*');
      
      if (user?.id) {
        // Show public scores and user's own scores
        query = query.or(`is_public.eq.true,created_by.eq.${user.id}`);
      } else {
        // Only show public scores for non-authenticated users
        query = query.eq('is_public', true);
      }

      const { data, error: fetchError } = await query
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setScores(data || []);
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scores');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const addScore = useCallback(async (scoreData: Omit<SheetMusic, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) {
      throw new Error('Must be logged in to add scores');
    }

    try {
      const { data, error: insertError } = await supabase
        .from('gw_sheet_music')
        .insert({
          ...scoreData,
          created_by: user.id,
          is_archived: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setScores(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding score:', err);
      throw err;
    }
  }, [user?.id]);

  const updateScore = useCallback(async (id: string, updates: Partial<SheetMusic>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('gw_sheet_music')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setScores(prev => prev.map(score => score.id === id ? data : score));
      return data;
    } catch (err) {
      console.error('Error updating score:', err);
      throw err;
    }
  }, []);

  const deleteScore = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('gw_sheet_music')
        .update({ is_archived: true })
        .eq('id', id);

      if (deleteError) throw deleteError;

      setScores(prev => prev.filter(score => score.id !== id));
    } catch (err) {
      console.error('Error archiving score:', err);
      throw err;
    }
  }, []);

  const uploadXML = useCallback(async (file: File, scoreId?: string) => {
    if (!user?.id) {
      throw new Error('Must be logged in to upload files');
    }

    try {
      // Read file content
      const xmlContent = await file.text();
      
      // Upload file to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('sheet-music')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('sheet-music')
        .getPublicUrl(uploadData.path);

      if (scoreId) {
        // Update existing score
        return await updateScore(scoreId, {
          xml_content: xmlContent,
          xml_url: urlData.publicUrl,
        });
      } else {
        // Create new score from XML
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        return await addScore({
          title: fileName,
          xml_content: xmlContent,
          xml_url: urlData.publicUrl,
          is_public: false,
        });
      }
    } catch (err) {
      console.error('Error uploading XML:', err);
      throw err;
    }
  }, [user?.id, addScore, updateScore]);

  const downloadXML = useCallback((score: SheetMusic, filename?: string) => {
    if (!score.xml_content) {
      throw new Error('No XML content available for this score');
    }

    const blob = new Blob([score.xml_content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${score.title}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return {
    scores,
    loading,
    error,
    fetchScores,
    addScore,
    updateScore,
    deleteScore,
    uploadXML,
    downloadXML,
  };
};