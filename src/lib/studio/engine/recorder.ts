// Mic recorder: captures the user's microphone to a WAV blob via
// Tone.UserMedia + Tone.Recorder, then hands the blob to the storage
// layer to upload as an AudioAsset.
//
// The output is monitored at unity gain through the master bus so the
// user hears themselves while recording. (Set monitorGain to 0 if you
// want to avoid feedback on speakers.)

import * as Tone from 'tone';
import { uploadAudioAsset } from '../storage';
import type { AudioAsset } from '../session';

export interface MicRecorder {
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  isRecording: () => boolean;
  setMonitor: (gain01: number) => void;
  /** Adjust the recording / metering / monitor input gain in dB. The
   * value is applied to one shared Gain node sitting between the mic
   * and everything downstream, so the recorded blob, the live meter,
   * and the monitor all hear the same level. */
  setInputGain: (db: number) => void;
  /** Read current time-domain samples (Float32Array, -1..1) for live waveform UI. */
  getWaveform: () => Float32Array;
  /** Read current RMS in dB for VU during arming. */
  getPeakDb: () => number;
  dispose: () => void;
}

/** Open the mic, attach a time-domain analyser, and prepare a recorder.
 * The analyser feeds the live waveform UI during recording; the recorder
 * blob is what we upload as the asset on stop. */
export async function openMicRecorder(args: {
  monitorTo?: Tone.ToneAudioNode;
  monitorGain?: number;
  inputDeviceId?: string;
  /** Input gain in dB. Applied to a Gain node between the mic and
   * everything downstream (recorder + meter + waveform + monitor). */
  inputGainDb?: number;
} = {}): Promise<MicRecorder> {
  // Audio context must be resumed before opening UserMedia.
  if (Tone.getContext().state !== 'running') await Tone.start();

  const mic = new Tone.UserMedia();
  try {
    // Tone.UserMedia accepts a device id directly. Pass null/empty
    // for browser default.
    await mic.open(args.inputDeviceId || undefined);
  } catch (e) {
    throw new Error(`Mic open failed (permission denied or no input device?): ${e instanceof Error ? e.message : String(e)}`);
  }

  // Shared input gain — sits between the mic and everything downstream
  // so a single slider boosts/cuts the recorded signal AND the meter.
  const inputDb = args.inputGainDb ?? 0;
  const inputGain = new Tone.Gain(Math.pow(10, inputDb / 20));
  const monitor = new Tone.Gain(args.monitorGain ?? 0); // default off to avoid feedback
  // Let MediaRecorder pick the best supported type. Safari + iOS don't
  // support audio/webm so forcing it makes recordings fail silently or
  // produce unplayable files. The caller reads blob.type later to know
  // the actual format.
  const recorder = new Tone.Recorder();

  // Time-domain analyser for waveform rendering.
  const waveAnalyser = new Tone.Analyser('waveform', 512);
  const meter = new Tone.Meter({ smoothing: 0.5 });

  mic.connect(inputGain);
  inputGain.connect(monitor);
  if (args.monitorTo) monitor.connect(args.monitorTo);
  inputGain.connect(recorder);
  inputGain.connect(waveAnalyser);
  inputGain.connect(meter);

  let recording = false;

  return {
    start: async () => {
      if (recording) return;
      await recorder.start();
      recording = true;
    },
    stop: async () => {
      if (!recording) throw new Error('not recording');
      const blob = await recorder.stop();
      recording = false;
      return blob;
    },
    isRecording: () => recording,
    setMonitor: (g) => { monitor.gain.value = g; },
    setInputGain: (db) => { inputGain.gain.value = Math.pow(10, db / 20); },
    getWaveform: () => waveAnalyser.getValue() as Float32Array,
    getPeakDb: () => meter.getValue() as number,
    dispose: () => {
      try { mic.close(); } catch { /* ignore */ }
      mic.dispose(); inputGain.dispose(); monitor.dispose(); recorder.dispose();
      waveAnalyser.dispose(); meter.dispose();
    },
  };
}

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
