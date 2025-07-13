import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];
type SheetMusicInsert = Database['public']['Tables']['gw_sheet_music']['Insert'];

interface SheetMusicFilters {
  voice_parts?: string[];
  difficulty_level?: string;
  composer?: string;
  search?: string;
  tags?: string[];
}

export const useSheetMusic = () => {
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSheetMusic = async (filters?: SheetMusicFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('gw_sheet_music')
        .select('*')
        .eq('is_public', true)
        .order('title', { ascending: true });

      // Apply filters
      if (filters?.voice_parts && filters.voice_parts.length > 0) {
        query = query.overlaps('voice_parts', filters.voice_parts);
      }

      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.composer) {
        query = query.ilike('composer', `%${filters.composer}%`);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,composer.ilike.%${filters.search}%,arranger.ilike.%${filters.search}%`);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setSheetMusic(data || []);
    } catch (err) {
      console.error('Error fetching sheet music:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sheet music');
    } finally {
      setLoading(false);
    }
  };

  const createSheetMusic = async (sheetMusicData: SheetMusicInsert) => {
    try {
      setLoading(true);
      const { data, error: createError } = await supabase
        .from('gw_sheet_music')
        .insert({
          ...sheetMusicData,
          created_by: user?.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;

      setSheetMusic(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error creating sheet music:', err);
      setError(err instanceof Error ? err.message : 'Failed to create sheet music');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSheetMusic = async (id: string, updates: Partial<SheetMusicInsert>) => {
    try {
      setLoading(true);
      const { data, error: updateError } = await supabase
        .from('gw_sheet_music')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSheetMusic(prev => 
        prev.map(item => item.id === id ? data : item)
      );
      return data;
    } catch (err) {
      console.error('Error updating sheet music:', err);
      setError(err instanceof Error ? err.message : 'Failed to update sheet music');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteSheetMusic = async (id: string) => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('gw_sheet_music')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setSheetMusic(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting sheet music:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete sheet music');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetMusic();
  }, []);

  return {
    sheetMusic,
    loading,
    error,
    fetchSheetMusic,
    createSheetMusic,
    updateSheetMusic,
    deleteSheetMusic,
  };
};