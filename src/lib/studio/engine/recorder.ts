// Mic recorder: captures the user's microphone to a WAV blob via
// Tone.UserMedia → gain → Tone.Recorder + analyser/meter, then hands the
// blob to the storage layer to upload as an AudioAsset.
//
// The capture implementation itself now lives in the shared web
// recording engine (src/lib/audio/sharedRecorder.ts). This file
// re-exports it unchanged — Studio's call sites, defaults, and
// wiring (mic → inputGain → recorder/meter/waveAnalyser, monitor at unity
// gain through the master bus) are identical to before the extraction.

import * as Tone from 'tone';
import { uploadAudioAsset } from '../storage';
import type { AudioAsset } from '../session';
import { openMicRecorder, type MicRecorder, type MicRecorderOptions } from '@/lib/audio/sharedRecorder';

export { openMicRecorder };
export type { MicRecorder, MicRecorderOptions };

/** Convenience: full record-and-upload flow. Returns the AudioAsset
 * metadata ready to push onto session.assets, plus the duration the
 * caller can use to size the new clip. */
export async function recordAndUpload(args: {
  tenantId: string;
  sessionId: string;
  durationSeconds: number;          // how long to record before auto-stop
  filename?: string;
  monitorTo?: Tone.ToneAudioNode;
}): Promise<AudioAsset> {
  const rec = await openMicRecorder({ monitorTo: args.monitorTo });
  await rec.start();
  await new Promise((r) => setTimeout(r, args.durationSeconds * 1000));
  const blob = await rec.stop();
  rec.dispose();

  // Decode to learn duration / sample rate / channels.
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();

  const asset = await uploadAudioAsset({
    tenantId: args.tenantId,
    sessionId: args.sessionId,
    file: blob,
    filename: args.filename ?? `take-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`,
    duration_seconds: buf.duration,
    sample_rate: buf.sampleRate,
    channels: buf.numberOfChannels,
  });
  return asset;
}
