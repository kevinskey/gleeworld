import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SheetMusicJump } from '@/lib/jumps';

export function useSheetMusicJumps(sheetMusicId: string | undefined) {
  const qc = useQueryClient();
  const queryKey = ['sheet-music-jumps', sheetMusicId];

  const { data: jumps = [], isLoading } = useQuery<SheetMusicJump[]>({
    queryKey,
    enabled: !!sheetMusicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music_jumps')
        .select('*')
        .eq('sheet_music_id', sheetMusicId!)
        .order('source_page')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as SheetMusicJump[];
    },
  });

  const addJump = useMutation({
    mutationFn: async (input: Omit<SheetMusicJump, 'id' | 'created_at' | 'sheet_music_id'>) => {
      if (!sheetMusicId) throw new Error('Missing sheet_music_id');
      const { error } = await supabase
        .from('gw_sheet_music_jumps')
        .insert({ ...input, sheet_music_id: sheetMusicId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  const deleteJump = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gw_sheet_music_jumps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey }); },
  });

  return { jumps, isLoading, addJump, deleteJump };
}
