import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// page_order is 1-indexed: logical position i → page_order[i-1] physical page.
// null/empty means identity. We store as int[] for compactness.
export function useSheetMusicPageOrder(sheetMusicId: string | undefined, totalPhysical: number) {
  const qc = useQueryClient();
  const queryKey = ['sheet-music-page-order', sheetMusicId];

  const { data: pageOrder = null } = useQuery<number[] | null>({
    queryKey,
    enabled: !!sheetMusicId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('page_order')
        .eq('id', sheetMusicId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.page_order ?? null) as number[] | null;
    },
  });

  // Effective order — falls back to identity when nothing is saved or when
  // the stored array doesn't match the PDF (e.g. user uploaded a new PDF
  // with a different page count; rather than break navigation we ignore).
  const effectiveOrder: number[] = (() => {
    if (!pageOrder || pageOrder.length === 0) {
      return totalPhysical > 0 ? Array.from({ length: totalPhysical }, (_, i) => i + 1) : [];
    }
    const ok = pageOrder.every((p) => p >= 1 && p <= totalPhysical);
    if (!ok) return Array.from({ length: totalPhysical }, (_, i) => i + 1);
    return pageOrder;
  })();

  const savePageOrder = useMutation({
    mutationFn: async (order: number[] | null) => {
      if (!sheetMusicId) throw new Error('Missing sheet_music_id');
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({ page_order: order })
        .eq('id', sheetMusicId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return { pageOrder, effectiveOrder, savePageOrder };
}
