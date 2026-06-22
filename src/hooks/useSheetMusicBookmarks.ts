import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SheetMusicBookmark {
  id: string;
  sheet_music_id: string;
  user_id: string;
  page_number: number;
  label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Per-user bookmarks inside a score (e.g. "Letter B", "Coda").
// Same pattern as useSheetMusicAnnotations — react-query for cache, RLS on
// the table handles tenant + ownership.
export function useSheetMusicBookmarks(sheetMusicId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ['sheet-music-bookmarks', sheetMusicId, user?.id];

  const { data: bookmarks = [], isLoading } = useQuery<SheetMusicBookmark[]>({
    queryKey,
    enabled: !!sheetMusicId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music_bookmarks')
        .select('*')
        .eq('sheet_music_id', sheetMusicId!)
        .order('sort_order')
        .order('page_number');
      if (error) throw error;
      return (data ?? []) as SheetMusicBookmark[];
    },
  });

  const addBookmark = useMutation({
    mutationFn: async (input: { page_number: number; label: string }) => {
      if (!sheetMusicId || !user?.id) throw new Error('Missing context');
      const { data, error } = await supabase
        .from('gw_sheet_music_bookmarks')
        .insert({
          sheet_music_id: sheetMusicId,
          user_id: user.id,
          page_number: input.page_number,
          label: input.label.trim(),
          sort_order: bookmarks.length,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  const renameBookmark = useMutation({
    mutationFn: async (input: { id: string; label: string }) => {
      const { error } = await supabase
        .from('gw_sheet_music_bookmarks')
        .update({ label: input.label.trim(), updated_at: new Date().toISOString() })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  const deleteBookmark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gw_sheet_music_bookmarks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  return { bookmarks, isLoading, addBookmark, renameBookmark, deleteBookmark };
}
