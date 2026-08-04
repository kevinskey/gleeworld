// The single place a youtube_videos row gets created. Both the /video header
// search and the Add-video dialog (search, paste-URL, and upload modes) go
// through addVideoToLibrary so there is one insert shape to keep correct.
//
// Note youtube_videos writes are admin-only at the RLS level (migration
// 20260216024654 replaced the old permissive policies with
// "Admins can manage youtube videos"). A non-admin call resolves to
// { outcome: 'failed' } with an empty row set rather than throwing — callers
// should gate the UI on isAdmin() rather than relying on this to explain it.
import { supabase } from '@/integrations/supabase/client';
import { providerLabel, type ParsedVideoSource } from '@/lib/videoSources';

export type AddOutcome = 'added' | 'duplicate' | 'failed';

export interface AddVideoResult {
  outcome: AddOutcome;
  message?: string;
}

// Reports an outcome instead of toasting, so a bulk paste can tally a whole
// batch while a single add keeps its one-video-shaped message.
export async function addVideoToLibrary(
  source: ParsedVideoSource,
  providedTitle: string,
): Promise<AddVideoResult> {
  try {
    const { data, error } = await supabase
      .from('youtube_videos')
      .insert({
        video_id: source.videoId,
        // NOT a channels row — see clientActions.ts add_video for why null is
        // correct here and 'manual-upload' (a string) is not: this column is a
        // UUID FK and a non-UUID string fails every insert.
        channel_id: null as unknown as string,
        title:
          providedTitle ||
          (source.provider === 'youtube'
            ? source.videoId
            : `${providerLabel(source.provider)} video`),
        thumbnail_url: source.thumbnailUrl ?? '',
        video_url: source.canonicalUrl,
        published_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      if (error.code === '23505') return { outcome: 'duplicate' };
      return { outcome: 'failed', message: error.message };
    }
    if (!data?.length) {
      return { outcome: 'failed', message: 'No row was returned — check permissions.' };
    }
    return { outcome: 'added' };
  } catch (err) {
    return { outcome: 'failed', message: err instanceof Error ? err.message : 'Unknown error' };
  }
}
