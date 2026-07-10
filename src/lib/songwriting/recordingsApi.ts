import { supabase } from '@/integrations/supabase/client';

export type SongRecording = {
  id: string; song_id: string; user_id: string; storage_key: string;
  mime_type: string; size_bytes: number; duration_ms: number | null;
  created_at: string;
};

// Every iOS browser shell (Safari, Chrome-for-iOS/CriOS, Firefox-for-iOS/
// FxiOS, ...) is forced onto Apple's WebKit under the hood, so they all
// share Safari's webm bug: MediaRecorder.isTypeSupported claims webm/opus
// support but decodeAudioData rejects it, producing undecodable husks
// (Part Tracks bug, PR #80). Mirrors audioEngine.ts's isAppleWebEngine():
// detect by vendor (catches every iOS shell + macOS Safari) OR by
// iPhone/iPad/iPod in the UA as a belt-and-suspenders check, and force
// mp4/aac there; everywhere else prefer webm/opus.
function isAppleShell(): boolean {
  if (typeof navigator === 'undefined') return false;
  const vendor = navigator.vendor ?? '';
  const ua = navigator.userAgent ?? '';
  return /apple/i.test(vendor) || /iphone|ipad|ipod/i.test(ua);
}

export function pickRecordingMime(): { mimeType: string; ext: string } {
  const isApple = isAppleShell();
  const webm = 'audio/webm;codecs=opus';
  if (!isApple && typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(webm)) {
    return { mimeType: webm, ext: 'webm' };
  }
  return { mimeType: 'audio/mp4', ext: 'm4a' };
}

async function tenantAndUser(): Promise<{ tenantId: string; userId: string }> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not signed in');
  const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  if (!claims.tenant_id || !claims.sub) throw new Error('Session is missing tenant claims — sign in again');
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
    const { error: cleanErr } = await supabase.storage.from('songwriting').remove([key]);
    if (cleanErr) console.warn('[songwriting] storage cleanup failed', key, cleanErr);
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
  const signed = await Promise.all(
    rows.map(async (rec) => {
      const { data: s, error: signErr } = await supabase.storage
        .from('songwriting').createSignedUrl(rec.storage_key, 3600);
      if (signErr || !s?.signedUrl) {
        console.error('[songwriting] could not sign recording url', rec.storage_key, signErr);
        return null;
      }
      return { ...rec, url: s.signedUrl };
    }),
  );
  return signed.filter((r): r is SongRecording & { url: string } => r !== null);
}

export async function deleteRecording(rec: SongRecording): Promise<void> {
  const { error } = await supabase.from('gw_song_recordings').delete().eq('id', rec.id);
  if (error) throw error;
  const { error: cleanErr } = await supabase.storage.from('songwriting').remove([rec.storage_key]);
  if (cleanErr) console.warn('[songwriting] storage cleanup failed', rec.storage_key, cleanErr);
}
