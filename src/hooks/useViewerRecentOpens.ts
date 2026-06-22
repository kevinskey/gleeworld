import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecentOpenedScore {
  sheet_music_id: string;
  last_opened_at: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  pdf_url: string | null;
}

// Map of sheet_music_id → last_opened_at for sorting the library list by
// the user's actual reading history. Pulled in one round-trip and joined
// in JS against the library rows already in cache.
export function useViewerRecentOpens() {
  const { user } = useAuth();
  return useQuery<Record<string, string>>({
    queryKey: ['viewer-recent-opens', user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_sheet_music_recent_opens')
        .select('sheet_music_id, last_opened_at')
        .order('last_opened_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.sheet_music_id] = r.last_opened_at;
      return map;
    },
  });
}
