// Region export — render a selected time range [startSec, endSec] of a
// chosen subset of tracks, as either a single stereo/mono MIX or as
// per-track STEMS. Reuses the offline-render pattern from exportRender.ts
// (Tone.Offline over a fresh OfflineAudioContext, buildTrack per track),
// but scoped to a window + a track subset, which the full-session
// renderMaster/renderStems don't support.
//
// Delivery (packaging into files / zip) is caller-side; this module only
// produces AudioBuffers → WAV blobs.

import * as Tone from 'tone';
import { zipSync, type Zippable } from 'fflate';
import type { Session, Track } from '../session';
import { buildTrack } from './tracks';
import { audioBufferToWavBlob } from './mixdown';
import { EXPORT_SAMPLE_RATE } from './exportRender';
import { preloadGwSession } from './layeredSampler';

export interface RegionExportOpts {
  trackIds: string[];
  startSec: number;
  endSec: number;
  /** Downmix to a single mono channel (average of L+R). */
  mono: boolean;
  onProgress?: (fraction: number) => void;
}

/** Render [startSec, endSec] of the given tracks (summed) to one buffer.
 *  Starts the offline transport at `startSec` (its `offset` arg) so clips
 *  play from the region's left edge, and renders exactly the region
 *  length. No mastering chain — this is a clean sum of the selected
 *  tracks, which is what a partial-selection bounce should be.
 *  Exported for the per-clip MP3 path: a MIDI clip has no source asset
 *  to slice, so it bounces its own time window through this instead. */
export async function renderRegionBuffer(
  session: Session, trackIds: string[], startSec: number, endSec: number,
): Promise<AudioBuffer> {
  // gw: instruments need their manifests cached before Tone.Offline —
  // see the same call in mixdown.renderSessionToWav.
  await preloadGwSession(session);
  const durationSec = Math.max(0.01, endSec - startSec);
  const chosen = session.tracks.filter((t) => trackIds.includes(t.id));
  const toneBuffer = await Tone.Offline(({ transport }) => {
    transport.bpm.value = session.tempo_bpm;
    transport.timeSignature = [session.time_signature.numerator, session.time_signature.denominator];
    const disposers: Array<() => void> = [];
    for (const track of chosen) {
      const eng = buildTrack(track, session.assets);
      eng.output.toDestination();
      disposers.push(() => eng.dispose());
    }
    // start(when=0, offset=startSec): render window is [startSec, +dur).
    transport.start(0, startSec);
    // Dispose after the offline render resolves — Tone keeps the graph
    // alive for the render duration, so scheduling disposal isn't needed;
    // the fresh OfflineAudioContext is discarded whole.
    void disposers;
  }, durationSec, 2, EXPORT_SAMPLE_RATE);
  return toneBuffer.get() as AudioBuffer;
}

/** Average all channels of a buffer into one mono Float32Array. */
function toMono(buf: AudioBuffer): Float32Array {
  const n = buf.length;
  const out = new Float32Array(n);
  const chs = buf.numberOfChannels;
  for (let c = 0; c < chs; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += data[i] / chs;
  }
  return out;
}

/** Wrap a mono Float32Array as a 1-channel AudioBuffer for WAV encoding. */
function monoBuffer(samples: Float32Array, sampleRate: number): AudioBuffer {
  const ctx = new OfflineAudioContext(1, samples.length, sampleRate);
  const buf = ctx.createBuffer(1, samples.length, sampleRate);
  buf.getChannelData(0).set(samples);
  return buf;
}

function wavFor(buf: AudioBuffer, mono: boolean): Blob {
  return audioBufferToWavBlob(mono ? monoBuffer(toMono(buf), buf.sampleRate) : buf);
}

/** One combined MIX of the selected tracks over the region. */
export async function renderRegionMix(session: Session, opts: RegionExportOpts): Promise<Blob> {
  const buf = await renderRegionBuffer(session, opts.trackIds, opts.startSec, opts.endSec);
  opts.onProgress?.(1);
  return wavFor(buf, opts.mono);
}

/** Per-track STEMS over the region — each selected track rendered alone. */
export async function renderRegionStems(
  session: Session, opts: RegionExportOpts,
): Promise<Array<{ track: Track; blob: Blob }>> {
  const chosen = session.tracks.filter((t) => opts.trackIds.includes(t.id));
  const out: Array<{ track: Track; blob: Blob }> = [];
  for (let i = 0; i < chosen.length; i++) {
    const track = chosen[i];
    const buf = await renderRegionBuffer(session, [track.id], opts.startSec, opts.endSec);
    out.push({ track, blob: wavFor(buf, opts.mono) });
    opts.onProgress?.((i + 1) / chosen.length);
  }
  return out;
}

/** Sanitize a track/session name into a safe filename fragment. */
export function safeName(s: string): string {
  return (s || 'untitled').replace(/[^\p{L}\p{N}\s_-]+/gu, '').trim().replace(/\s+/g, '_') || 'untitled';
}

/** Bundle named WAV blobs into one zip (store-only — WAV is already raw
 *  PCM, so deflating buys almost nothing and costs CPU). */
export async function zipBlobs(files: Array<{ name: string; blob: Blob }>): Promise<Blob> {
  const entries: Zippable = {};
  for (const f of files) {
    const buf = new Uint8Array(await f.blob.arrayBuffer());
    // level 0 = store; WAV doesn't compress meaningfully.
    entries[f.name] = [buf, { level: 0 }];
  }
  const zipped = zipSync(entries);
  return new Blob([zipped], { type: 'application/zip' });
}
