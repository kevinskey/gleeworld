import { supabase } from '@/integrations/supabase/client';
import { bufferToWav } from './wav';

export interface CapturedAccompaniment {
  url: string;
  title: string;
}

/** Decode a mic-recorder Blob (webm/opus or mp4/aac) into a WAV, upload
 *  it into the studio bucket under the session's asset prefix, and
 *  return the public URL. Used by the "Capture from playback" flow.
 *
 *  The studio bucket's RLS policy requires that the FIRST path segment
 *  (before the first '/') is the tenant UUID:
 *    (storage.foldername(name))[1] = current_tenant_id()::text
 *  So the object key must be `<tenantId>/sessions/<sessionId>/audio/<file>`.
 *  Do NOT include the bucket name in the key — `from('studio').upload(path)`
 *  already routes into the `studio` bucket. */
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
    // Path shape: <tenantId>/sessions/<sessionId>/audio/<file>
    // The studio bucket RLS requires the first segment to be the tenant UUID.
    const path = `${tenantId}/sessions/${sessionId}/audio/${title}`;
    const { error } = await supabase.storage
      .from('studio')
      .upload(path, wav, { contentType: 'audio/wav', upsert: true });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const url = supabase.storage.from('studio').getPublicUrl(path).data.publicUrl;
    return { url, title };
  } finally {
    try { await ctx.close(); } catch { /* ignore */ }
  }
}
