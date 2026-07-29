import { supabase } from '@/integrations/supabase/client';
import { bufferToWav } from './wav';

export interface CapturedAccompaniment {
  url: string;
  title: string;
}

/** Decode a mic-recorder Blob (webm/opus or mp4/aac) into a WAV, upload
 *  it into the studio bucket under the session's asset prefix, and
 *  return a signed URL. Used by the "Capture from playback" flow.
 *
 *  The studio bucket is PRIVATE (`public = false`) so `getPublicUrl`
 *  returns a `/object/public/` URL that will 403 on fetch. Signed URLs
 *  carry a JWT in the query string, bypass RLS, and work on private
 *  buckets. 1-year expiry is generous for a session-lifetime asset;
 *  callers refresh at load time when they detect an expired URL.
 *
 *  Path shape: `<tenantId>/sessions/<sessionId>/audio/<file>`.
 *  The studio bucket's write RLS still requires the first segment to
 *  be the caller's tenant UUID; do NOT include the bucket name here. */
export async function captureFromPlayback(input: {
  blob: Blob;
  sessionId: string;
  tenantId: string;
}): Promise<CapturedAccompaniment> {
  const { blob, sessionId, tenantId } = input;
  if (!blob || blob.size < 1024) {
    throw new Error('Captured audio is too short — check the mic and speaker volume.');
  }

  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  const ctx = new AC();
  try {
    const ab = await blob.arrayBuffer();
    const buffer = await ctx.decodeAudioData(ab.slice(0));
    const wav = bufferToWav(buffer);
    const title = `accompaniment-capture-${Date.now()}.wav`;
    const path = `${tenantId}/sessions/${sessionId}/audio/${title}`;
    const { error } = await supabase.storage
      .from('studio')
      .upload(path, wav, { contentType: 'audio/wav', upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: signed, error: signErr } = await supabase.storage
      .from('studio')
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed?.signedUrl) {
      throw new Error(`Failed to sign captured audio URL: ${signErr?.message ?? 'no url'}`);
    }
    return { url: signed.signedUrl, title };
  } finally {
    try { await ctx.close(); } catch { /* ignore */ }
  }
}
