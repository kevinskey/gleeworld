import { supabase } from '@/integrations/supabase/client';

/** Use the Music Library's server-side sharing rules for every Viewer entry. */
export async function fetchViewerScores(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('gw_sheet_music_browse')
    .select('id, title, composer, pdf_url, storage_path, storage_bucket')
    .in('id', [...new Set(ids)]);
  if (error) throw error;
  return data ?? [];
}
