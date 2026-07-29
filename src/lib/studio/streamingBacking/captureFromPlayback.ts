import { supabase } from '@/integrations/supabase/client';
import { bufferToWav } from '@/components/partTracks/audioProcessing';

export interface CapturedAccompaniment {
  url: string;
  title: string;
}

/** Decode a mic-recorder Blob (webm/opus or mp4/aac) into a WAV, upload
 *  it into the studio bucket under the session's asset prefix, and
 *  return the public URL. Used by the "Capture from playback" flow. */
export async function captureFromPlayback(input: {
  blob: Blob;
  sessionId: string;
}): Promise<CapturedAccompaniment> {
  const { blob, sessionId } = input;
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
    // Colocate with the session's other assets. RLS + storage prefix
    // rules on the studio bucket scope reads to the tenant already.
    const path = `studio/sessions/${sessionId}/audio/${title}`;
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
