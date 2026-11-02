import { supabase } from '@/integrations/supabase/client';

export interface ViewerAccessibleScore {
  id: string;
  title: string;
  composer: string | null;
  pdf_url: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
}

/** Use the Music Library's server-side sharing rules for every Viewer entry. */
export async function fetchViewerScores(ids: string[]): Promise<ViewerAccessibleScore[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('gw_sheet_music_browse')
    .select('id, title, composer, pdf_url, storage_path, storage_bucket')
    .in('id', [...new Set(ids)]);
  if (error) throw error;
  return data ?? [];
}
