import { supabase } from '@/integrations/supabase/client';

export type SongRecording = {
  id: string; song_id: string; user_id: string; storage_key: string;
  mime_type: string; size_bytes: number; duration_ms: number | null;
  created_at: string;
};

// Safari claims webm MediaRecorder support but produces undecodable
// 5-byte husks (Part Tracks bug, PR #80). Detect Safari by vendor and
// force mp4/aac there; everywhere else prefer webm/opus.
export function pickRecordingMime(): { mimeType: string; ext: string } {
  const isSafari =
    typeof navigator !== 'undefined' &&
    /apple/i.test(navigator.vendor ?? '') &&
    !/chrome|crios|android/i.test(navigator.userAgent ?? '');
  const webm = 'audio/webm;codecs=opus';
  if (!isSafari && typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(webm)) {
    return { mimeType: webm, ext: 'webm' };
  }
  return { mimeType: 'audio/mp4', ext: 'm4a' };
}

async function tenantAndUser(): Promise<{ tenantId: string; userId: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token ?? '';
  const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  return { tenantId: claims.tenant_id, userId: claims.sub };
}

// Upload the blob FIRST, insert metadata only after storage confirms,
// and let the caller keep its local blob until this resolves — a failed
// take must never be lost (Part Tracks lesson).
export async function uploadRecording(args: {
  songId: string; blob: Blob; mimeType: string; ext: string; durationMs?: number;
}): Promise<SongRecording> {
  const { tenantId, userId } = await tenantAndUser();
  const key = `${tenantId}/${userId}/${args.songId}/take-${Date.now()}.${args.ext}`;
  const { error: upErr } = await supabase.storage
    .from('songwriting')
    .upload(key, args.blob, { contentType: args.mimeType, upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('gw_song_recordings')
    .insert({
      song_id: args.songId,
      user_id: userId,
      storage_key: key,
      mime_type: args.mimeType,
      size_bytes: args.blob.size,
      duration_ms: args.durationMs ?? null,
    })
    .select('*').single();
  if (error) {
    // metadata failed → remove the orphan object so storage stays clean
    await supabase.storage.from('songwriting').remove([key]);
    throw error;
  }
  return data as SongRecording;
}

export async function listRecordings(songId: string): Promise<(SongRecording & { url: string })[]> {
  const { data, error } = await supabase
    .from('gw_song_recordings').select('*')
    .eq('song_id', songId).order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as SongRecording[];
  const out: (SongRecording & { url: string })[] = [];
  for (const rec of rows) {
    const { data: signed } = await supabase.storage
      .from('songwriting').createSignedUrl(rec.storage_key, 3600);
    out.push({ ...rec, url: signed?.signedUrl ?? '' });
  }
  return out;
}

export async function deleteRecording(rec: SongRecording): Promise<void> {
  const { error } = await supabase.from('gw_song_recordings').delete().eq('id', rec.id);
  if (error) throw error;
  await supabase.storage.from('songwriting').remove([rec.storage_key]);
}
