import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ViewerSetlist {
  id: string;
  title: string;
  concert_name: string;
  event_date: string | null;
  venue: string | null;
  item_count: number;
}

export interface SetlistScore {
  id: string;
  sheet_music_id: string;
  order_index: number;
  title: string;
  composer: string | null;
  // Direct URL (legacy) OR a storage_bucket+storage_path pair (newer
  // uploads via Supabase Storage 1.48 → DO Spaces). Callers gate
  // openability on `hasSource(sc)` — the reader will sign the storage
  // path on demand when it opens the score.
  pdf_url: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
}

/** True when this setlist row points at either a direct URL or a
 *  storage_bucket+storage_path — the two conventions the reader can
 *  actually open. */
export function hasSource(sc: Pick<SetlistScore, 'pdf_url' | 'storage_path'>): boolean {
  return !!(sc.pdf_url || sc.storage_path);
}

// All published setlists visible to this tenant. RLS handles scoping;
// item_count is a denormalized convenience for the landing list.
export function useViewerSetlists() {
  return useQuery<ViewerSetlist[]>({
    queryKey: ['viewer-setlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_setlists')
        .select('id, title, concert_name, event_date, venue, items:gw_setlist_items(count)')
        .order('event_date', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        id: s.id,
        title: s.title,
        concert_name: s.concert_name,
        event_date: s.event_date,
        venue: s.venue,
        item_count: s.items?.[0]?.count ?? 0,
      }));
    },
  });
}

// Ordered scores for one setlist. Used by the setlist-player mode in the
// reader to step Next/Prev between scores.
export function useSetlistScores(setlistId: string | undefined) {
  return useQuery<SetlistScore[]>({
    queryKey: ['viewer-setlist-scores', setlistId],
    enabled: !!setlistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_setlist_items')
        .select('id, music_id, order_index, score:gw_sheet_music(title, composer, pdf_url, storage_path, storage_bucket)')
        .eq('setlist_id', setlistId!)
        .order('order_index');
      if (error) throw error;
      return (data ?? []).map((it: any) => ({
        id: it.id,
        sheet_music_id: it.music_id,
        order_index: it.order_index,
        title: it.score?.title ?? '(untitled)',
        composer: it.score?.composer ?? null,
        pdf_url: it.score?.pdf_url ?? null,
        storage_path: it.score?.storage_path ?? null,
        storage_bucket: it.score?.storage_bucket ?? null,
      }));
    },
  });
}
