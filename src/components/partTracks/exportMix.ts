// Part Tracks export — offline-render the current mix to an MP3, and
// download individual takes as files. Uses the decoded AudioBuffers the
// engine already holds (getTrackBuffer), so exporting never re-fetches
// audio. Streaming backings (Apple Music / YouTube) live outside the
// Web Audio graph (DRM) and can never be part of the render — callers
// should tell the user when one is being skipped.
import { encodeMp3 } from '@/lib/audio/encodeMp3';

export interface ExportEntry {
  buffer: AudioBuffer;
  volume: number;   // 0..1 (track fader)
  muted: boolean;
  pan: number;      // -1..1
  /** Master-timeline position of this take (record_offset_sec). */
  offsetSec: number;
}

const EXPORT_SAMPLE_RATE = 44100;
// Mirrors the live engine's master gain so the file sounds like playback.
const MASTER_GAIN = 0.9;

/** Render the given tracks into one stereo MP3 blob. Muted tracks are
 *  skipped; each source starts at its timeline offset like playback. */
export async function renderMixToMp3(entries: ExportEntry[], bitrate = 192): Promise<Blob> {
  const live = entries.filter((e) => !e.muted && e.buffer.duration > 0);
  if (!live.length) throw new Error('Nothing to export — every track is muted or empty.');
  const durationSec = Math.max(...live.map((e) => e.offsetSec + e.buffer.duration));
  const ctx = new OfflineAudioContext(2, Math.ceil(durationSec * EXPORT_SAMPLE_RATE), EXPORT_SAMPLE_RATE);

  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(ctx.destination);

  for (const e of live) {
    const src = ctx.createBufferSource();
    src.buffer = e.buffer;
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, e.volume));
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, e.pan));
    src.connect(gain).connect(panner).connect(master);
    src.start(Math.max(0, e.offsetSec));
  }

  const rendered = await ctx.startRendering();
  const channels = [rendered.getChannelData(0), rendered.getChannelData(1)];
  return encodeMp3(channels, rendered.sampleRate, bitrate);
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Deferred revoke — Safari can cancel the download if the URL dies
  // before the save sheet commits.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Download a saved take exactly as stored (no re-encode). The storage
 *  URL is cross-origin, so a plain <a download> would navigate instead
 *  of saving — fetch to a blob first. */
export async function downloadTake(audioUrl: string, filename: string) {
  const res = await fetch(audioUrl);
  if (!res.ok) throw new Error(`Could not fetch the recording (${res.status})`);
  const blob = await res.blob();
  const ext = extFromUrl(audioUrl);
  downloadBlob(blob, `${sanitizeFilename(filename)}.${ext}`);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim() || 'part-tracks';
}

function extFromUrl(url: string): string {
  const m = /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(url);
  return m ? m[1].toLowerCase() : 'audio';
}
