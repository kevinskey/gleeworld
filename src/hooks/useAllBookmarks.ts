import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchViewerScores } from '@/lib/viewerAccess';
import { useAuth } from '@/contexts/AuthContext';

export interface BookmarkWithScore {
  id: string;
  sheet_music_id: string;
  page_number: number;
  label: string;
  created_at: string;
  score_title: string;
  score_composer: string | null;
}

// Cross-score bookmark index for the Viewer's Bookmarks tab.
// Bookmarks are user-scoped by RLS; resolve titles through the library's
// browse view as sharing may have been revoked since the bookmark was saved.
export function useAllBookmarks() {
  const { user } = useAuth();
  return useQuery<BookmarkWithScore[]>({
    queryKey: ['viewer-all-bookmarks', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music_bookmarks')
        .select('id, sheet_music_id, page_number, label, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const scores = await fetchViewerScores((data ?? []).map((b) => b.sheet_music_id));
      const visible = new Map(scores.map((score) => [score.id, score]));
      return (data ?? []).filter((b) => visible.has(b.sheet_music_id)).map((b) => ({
        id: b.id,
        sheet_music_id: b.sheet_music_id,
        page_number: b.page_number,
        label: b.label,
        created_at: b.created_at,
        score_title: visible.get(b.sheet_music_id)?.title ?? '(untitled)',
        score_composer: visible.get(b.sheet_music_id)?.composer ?? null,
      }));
    },
  });
}
