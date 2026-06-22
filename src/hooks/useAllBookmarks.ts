import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

// Cross-score bookmark index for the Viewer's Bookmarks tab. Joins
// gw_sheet_music_bookmarks with gw_sheet_music for title/composer. RLS
// already scopes to current user + tenant, so no extra filter needed.
export function useAllBookmarks() {
  const { user } = useAuth();
  return useQuery<BookmarkWithScore[]>({
    queryKey: ['viewer-all-bookmarks', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music_bookmarks')
        .select('id, sheet_music_id, page_number, label, created_at, score:gw_sheet_music(title, composer)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((b: any) => ({
        id: b.id,
        sheet_music_id: b.sheet_music_id,
        page_number: b.page_number,
        label: b.label,
        created_at: b.created_at,
        score_title: b.score?.title ?? '(untitled)',
        score_composer: b.score?.composer ?? null,
      }));
    },
  });
}
