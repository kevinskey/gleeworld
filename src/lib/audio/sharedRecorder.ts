// Shared web recording engine — mic capture + sample-accurate head-trim.
//
// This module was extracted from Studio's `engine/recorder.ts` and
// `StudioEditor.tsx`'s `finalizeRecordingBlob` so Studio's hardened
// capture + latency-compensation pipeline could be shared. Studio
// re-exports from here — its call sites and behavior are unchanged;
// the engine tests under src/lib/studio/engine/__tests__ prove it.
//
// Two layers live here:
//  1. A handle-based mic recorder (`openMicRecorder` → `MicRecorder`) that
//     mirrors Studio's existing object shape exactly (monitorTo/monitorGain/
//     inputDeviceId/inputGainDb in, start/stop/getWaveform/getPeakDb/dispose
//     out) so Studio's refactor is a pure re-export.
//  2. A thin module-level singleton (`closeMicRecorder`/`startTake`/
//     `stopTake`/live-level getters) for simpler callers — e.g. Part Tracks
//     (Task 2) — that don't want to manage a handle themselves. Both layers
//     drive the same underlying Tone graph; `openMicRecorder` always updates
//     the singleton pointer, so mixing styles on the same recorder "just
//     works."
//
// `constraints` (Task 2): Tone.UserMedia's `open()` hardcodes its own
// getUserMedia constraints (echoCancellation/noiseSuppression off,
// sampleRate = context sample rate) and doesn't accept arbitrary
// MediaTrackConstraints, so when a caller passes `constraints` we bypass
// Tone.UserMedia entirely — open the stream ourselves via
// `navigator.mediaDevices.getUserMedia`, wrap it in a
// `MediaStreamAudioSourceNode` (via `Tone.getContext().createMediaStreamSource`,
// the same call Tone.UserMedia itself makes internally — see
// node_modules/tone's UserMedia.open()), and `Tone.connect()` it into the
// same Gain/Recorder/Analyser graph built below. Studio never passes
// `constraints`, so its path is untouched (still Tone.UserMedia) — bit-
// identical per the plan's Global Constraints.

import * as Tone from 'tone';

/** Structural (duck-typed) subset of the DOM `AudioBuffer` interface.
 * Real `AudioBuffer` instances satisfy this automatically. Using this
 * instead of `AudioBuffer` directly lets the trim/encode core run (and be
 * unit-tested) in environments without Web Audio globals — e.g. this
 * repo's hermetic vitest suite, which intentionally has no AudioContext
 * (see src/lib/studio/engine/__tests__/engine.test.ts's header comment). */
export interface AudioBufferLike {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly sampleRate: number;
  getChannelData(channel: number): Float32Array;
}

export interface MicRecorderOptions {
  monitorTo?: Tone.ToneAudioNode;
  monitorGain?: number;
  inputDeviceId?: string;
  /** Input gain in dB. Applied to a Gain node between the mic and
   * everything downstream (recorder + meter + waveform + monitor). */
  inputGainDb?: number;
  /** Forwarded to a manual `getUserMedia` call for callers (Part Tracks,
   * Task 2) that need constraints Tone.UserMedia doesn't expose
   * (mono channel count, explicit sample rate, disabling AGC, etc.) — see
   * module header for how this bypasses Tone.UserMedia. Omit (Studio's
   * path) to keep using Tone.UserMedia.open() exactly as before. When
   * both `constraints` and `inputDeviceId` are given, `inputDeviceId` is
   * merged in as an exact `deviceId` constraint. */
  constraints?: MediaTrackConstraints;
  /** Forwarded to `Tone.Recorder`'s `mimeType` option. Lets callers
   * (Part Tracks, Task 2) probe `MediaRecorder.isTypeSupported` first
   * (e.g. to pick a format Safari/iOS can actually play back) instead of
   * accepting Tone.Recorder's unmanaged browser default. Omit (Studio's
   * path) for identical behavior to before. */
  mimeType?: string;
  /** Capture the take as 16-bit PCM WAV via a ScriptProcessor tap
   * instead of MediaRecorder. iOS WebKit's MediaRecorder emits a
   * fragmented mp4 that `decodeAudioData` CANNOT read ("decoding failed"
   * — Studio takes never became clips, 2026-07-07); a self-encoded WAV
   * always decodes AND plays. Recommended on Apple web engines. The
   * returned blob is `audio/wav`. */
  captureWav?: boolean;
  /** Zero-based index of the interface input to record from (0 = Input 1,
   * 1 = Input 2, ... 7 = Input 8). Chrome on macOS honors `channelCount`
   * on multi-channel interfaces like UA Apollo; we ask for the full N
   * channels, then a ChannelSplitterNode routes only `channelIndex` into
   * the rest of the graph. Passing this forces the manual getUserMedia
   * path (Tone.UserMedia can't express channelCount). Ignored / defaults
   * to 0 on Safari or single-channel devices — the splitter safely
   * upmixes so channel 0 is always valid. */
  channelIndex?: number;
  /** Total channels to request from the device (`channelCount` in the
   * getUserMedia constraint). Defaults to 8 when `channelIndex` is set,
   * which covers Apollo 8 / Apollo x8 / MOTU 8pre and downgrades on
   * anything smaller. Ignored when `channelIndex` is omitted. */
  desiredChannelCount?: number;
}

export interface MicRecorder {
  start: () => Promise<void>;
  stop: () => Promise<Blob>;
  /** Alias of `start`, named to match the shared module's take-oriented
   * vocabulary (see module header). */
  startTake: () => Promise<void>;
  /** Alias of `stop`. */
  stopTake: () => Promise<Blob>;
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
  /** Alias of `dispose`. */
  close: () => void;
}

let activeHandle: MicRecorder | null = null;

/** Open the mic, attach a time-domain analyser, and prepare a recorder.
 * The analyser feeds the live waveform UI during recording; the recorder
 * blob is what the caller uploads (or trims via `trimHeadLatency`) on
 * stop.
 *
 * Callers that need getUserMedia constraints Tone.UserMedia doesn't
 * expose (Part Tracks, Task 2) pass them under the `constraints` key of
 * the options object, e.g. `openMicRecorder({ constraints: { channelCount:
 * 1 } })` — see the module header for how this bypasses Tone.UserMedia.
 * Omitting `constraints` (Studio's path) keeps using Tone.UserMedia
 * exactly as before. */
export async function openMicRecorder(
  args: MicRecorderOptions = {},
): Promise<MicRecorder> {
  // Audio context must be resumed before opening UserMedia.
  if (Tone.getContext().state !== 'running') await Tone.start();

  // Two ways to get the mic into the graph: Tone.UserMedia (Studio's
  // original, untouched path) or a manual getUserMedia when the caller
  // supplied `constraints` Tone.UserMedia can't express (Part Tracks,
  // Task 2 — see module header). Both end up as a native audio node
  // connected into `inputGain`, created afterward exactly like Studio's
  // original ordering (mic acquired, then the gain node).
  let mic: Tone.UserMedia | null = null;
  let manualStream: MediaStream | null = null;
  let manualSourceNode: MediaStreamAudioSourceNode | null = null;
  let channelSplitter: ChannelSplitterNode | null = null;

  // channelIndex forces the manual path too — Tone.UserMedia doesn't
  // request multi-channel input, so we'd only ever see channels 0-1.
  const wantChannelIndex = typeof args.channelIndex === 'number' && args.channelIndex > 0;
  const useManualPath = !!args.constraints || !!args.captureWav || wantChannelIndex;

  if (useManualPath) {
    const constraints: MediaTrackConstraints = { ...(args.constraints ?? {}) };
    if (args.inputDeviceId && args.inputDeviceId !== 'default') {
      (constraints as { deviceId?: ConstrainDOMString }).deviceId = { exact: args.inputDeviceId };
    }
    // Ask for the full channel count when the caller wants a specific
    // channel — Chrome on macOS honors this against Apollo-class
    // interfaces and hands back one N-channel MediaStreamTrack.
    if (wantChannelIndex && !constraints.channelCount) {
      constraints.channelCount = args.desiredChannelCount ?? 8;
    }
    try {
      manualStream = await navigator.mediaDevices.getUserMedia({ audio: constraints, video: false });
    } catch (e) {
      const err = new Error(`Mic open failed (permission denied or no input device?): ${e instanceof Error ? e.message : String(e)}`);
      // Preserve the original DOMException (NotAllowedError,
      // NotFoundError, NotReadableError, OverconstrainedError, ...) so
      // callers that want granular, per-reason UX (Part Tracks) can
      // still get at it instead of parsing this message string.
      (err as Error & { cause?: unknown }).cause = e;
      throw err;
    }
    // Same call Tone.UserMedia.open() makes internally to wrap a raw
    // MediaStream for the Web Audio graph.
    manualSourceNode = Tone.getContext().createMediaStreamSource(manualStream);
  } else {
    mic = new Tone.UserMedia();
    try {
      // Tone.UserMedia accepts a device id directly. Pass null/empty
      // for browser default.
      await mic.open(args.inputDeviceId || undefined);
    } catch (e) {
      mic.dispose();
      throw new Error(`Mic open failed (permission denied or no input device?): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Shared input gain — sits between the mic and everything downstream
  // so a single slider boosts/cuts the recorded signal AND the meter.
  const inputDb = args.inputGainDb ?? 0;
  const inputGain = new Tone.Gain(Math.pow(10, inputDb / 20));
  if (mic) {
    mic.connect(inputGain);
  } else if (wantChannelIndex && manualSourceNode) {
    // Split the incoming multi-channel stream and route ONLY the
    // requested channel into inputGain — everything downstream (recorder,
    // meter, waveform, monitor) sees a mono stream from Apollo Input N+1.
    // If the device gave us fewer channels than requested (Safari caps at
    // 2, or a mono device silently downgraded the constraint), clamp so
    // we never point the splitter at a channel that doesn't exist.
    const trackChannels = manualStream?.getAudioTracks()[0]?.getSettings().channelCount
      ?? args.desiredChannelCount
      ?? 8;
    const splitterSize = Math.max(2, trackChannels);
    const idx = Math.min(args.channelIndex!, splitterSize - 1);
    const rawCtx = Tone.getContext().rawContext;
    channelSplitter = rawCtx.createChannelSplitter(splitterSize);
    Tone.connect(manualSourceNode, channelSplitter);
    Tone.connect(channelSplitter, inputGain, idx, 0);
  } else {
    Tone.connect(manualSourceNode!, inputGain);
  }
  const monitor = new Tone.Gain(args.monitorGain ?? 0); // default off to avoid feedback

  // CAPTURE path splits by how the mic was opened:
  //
  //  - manual-stream callers (Part Tracks) record with a raw MediaRecorder
  //    on the getUserMedia stream itself — NO Web Audio hop. Routing the
  //    take through the Tone graph (MediaStreamSource → Tone.Recorder's
  //    MediaStreamDestination → MediaRecorder) silently captures nothing
  //    on iOS WebKit when the mic's sample rate differs from the
  //    context's (e.g. AirPods mic at 24k vs a 48k context) — the source
  //    node produces silence and the take comes out as a husk. This is
  //    the pre-refactor Part Tracks capture path, restored (2026-07-07,
  //    iPhone Chrome+Safari takes never reached upload). The Tone graph
  //    below still gets the stream for metering/waveform/monitoring —
  //    losing the live meter on a broken graph is cosmetic; losing the
  //    take is not.
  //
  //  - Tone.UserMedia callers (Studio — no `constraints`) keep recording
  //    through Tone.Recorder exactly as before. Let MediaRecorder pick
  //    the best supported type by default there. Callers that already
  //    probed a supported type pass it via `mimeType`; the caller reads
  //    blob.type after stop() either way to know the actual format.
  // WAV PCM capture path (captureWav) — bypasses MediaRecorder entirely.
  // A ScriptProcessor taps inputGain, we copy each render block's PCM,
  // and encode a 16-bit WAV on stop. Always decodable/playable, unlike
  // WebKit's fragmented-mp4 MediaRecorder output. Mono is plenty for a
  // single vocal take and halves the data.
  // captureWav runs on its OWN genuine-native AudioContext — Tone v15's
  // context wrapper does not expose createScriptProcessor (it threw
  // "createScriptProcessor is not a function" on iOS, 2026-07-07). The
  // native context (webkit-prefixed on older iOS) always has it. The mic
  // MediaStream (opened manually above) feeds a native
  // MediaStreamSource → ScriptProcessor → muted destination; we copy each
  // block's PCM and encode WAV on stop.
  let pcmCtx: AudioContext | null = null;
  let pcmProcessor: ScriptProcessorNode | null = null;
  let pcmSourceNode: MediaStreamAudioSourceNode | null = null;
  let pcmChunks: Float32Array[] = [];
  let pcmSampleRate = 48000;
  const wantWav = !!args.captureWav;
  if (wantWav) {
    if (!manualStream) throw new Error('captureWav requires a mic stream');
    const NativeAC: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    pcmCtx = new NativeAC();
    if (pcmCtx.state !== 'running') { try { await pcmCtx.resume(); } catch { /* ignore */ } }
    pcmSampleRate = pcmCtx.sampleRate;
    pcmSourceNode = pcmCtx.createMediaStreamSource(manualStream);
    // When a specific interface channel is requested we need our OWN
    // splitter on the PCM context (audio nodes can't cross AudioContext
    // boundaries — the graph splitter above lives on Tone's context).
    // Then read block channel `idx` on every render tick.
    const trackChannels = manualStream.getAudioTracks()[0]?.getSettings().channelCount
      ?? args.desiredChannelCount
      ?? 8;
    const pcmSplitterSize = wantChannelIndex ? Math.max(2, trackChannels) : 1;
    const pcmChannelIdx = wantChannelIndex ? Math.min(args.channelIndex!, pcmSplitterSize - 1) : 0;
    let pcmSplitter: ChannelSplitterNode | null = null;
    // ScriptProcessor's input channel count matches the splitter output —
    // a per-channel splitter output is always 1 channel wide.
    pcmProcessor = pcmCtx.createScriptProcessor(4096, 1, 1);
    if (wantChannelIndex) {
      pcmSplitter = pcmCtx.createChannelSplitter(pcmSplitterSize);
      pcmSourceNode.connect(pcmSplitter);
      pcmSplitter.connect(pcmProcessor, pcmChannelIdx, 0);
    } else {
      pcmSourceNode.connect(pcmProcessor);
    }
    const gainMul = Math.pow(10, (args.inputGainDb ?? 0) / 20);
    pcmProcessor.onaudioprocess = (ev: AudioProcessingEvent) => {
      if (!recording) return;          // capture only while armed
      // Splitter output is always channel 0 here regardless of which
      // interface input we picked — the routing happened above.
      const src = ev.inputBuffer.getChannelData(0);
      const block = new Float32Array(src.length);
      for (let i = 0; i < src.length; i++) block[i] = src[i] * gainMul;
      pcmChunks.push(block);
    };
    const mute = pcmCtx.createGain();
    mute.gain.value = 0;
    pcmProcessor.connect(mute);
    mute.connect(pcmCtx.destination);
  }

  let rawRecorder: MediaRecorder | null = null;
  let rawChunks: Blob[] = [];
  let toneRecorder: Tone.Recorder | null = null;
  if (wantWav) {
    // PCM path owns capture; no MediaRecorder/Tone.Recorder needed.
  } else if (manualStream && typeof MediaRecorder !== 'undefined') {
    try {
      rawRecorder = args.mimeType
        ? new MediaRecorder(manualStream, { mimeType: args.mimeType })
        : new MediaRecorder(manualStream);
    } catch {
      // Requested mimeType rejected at construction — retry unconstrained
      // before falling back to the Tone path.
      try { rawRecorder = new MediaRecorder(manualStream); } catch { rawRecorder = null; }
    }
    if (rawRecorder) {
      rawRecorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) rawChunks.push(e.data);
      };
    }
  }
  if (!wantWav && !rawRecorder) {
    toneRecorder = args.mimeType ? new Tone.Recorder({ mimeType: args.mimeType }) : new Tone.Recorder();
  }

  // Time-domain analyser for waveform rendering.
  const waveAnalyser = new Tone.Analyser('waveform', 512);
  const meter = new Tone.Meter({ smoothing: 0.5 });

  inputGain.connect(monitor);
  if (args.monitorTo) monitor.connect(args.monitorTo);
  if (toneRecorder) inputGain.connect(toneRecorder);
  inputGain.connect(waveAnalyser);
  inputGain.connect(meter);

  let recording = false;

  const start = async () => {
    if (recording) return;
    if (wantWav) {
      pcmChunks = [];
    } else if (rawRecorder) {
      rawChunks = [];
      rawRecorder.start();
    } else {
      await toneRecorder!.start();
    }
    recording = true;
  };
  const stop = async () => {
    if (!recording) throw new Error('not recording');
    let blob: Blob;
    if (wantWav) {
      recording = false; // stop the onaudioprocess accumulation first
      let total = 0;
      for (const c of pcmChunks) total += c.length;
      const merged = new Float32Array(total);
      let off = 0;
      for (const c of pcmChunks) { merged.set(c, off); off += c.length; }
      pcmChunks = [];
      blob = encodeWavFromBufferLike({
        numberOfChannels: 1,
        length: merged.length,
        sampleRate: pcmSampleRate,
        getChannelData: () => merged,
      });
      return blob;
    }
    if (rawRecorder) {
      blob = await new Promise<Blob>((resolve, reject) => {
        const rec = rawRecorder!;
        rec.onstop = () => resolve(new Blob(rawChunks, {
          type: rec.mimeType || args.mimeType || 'audio/webm',
        }));
        rec.onerror = (e: any) => reject(e?.error ?? new Error('MediaRecorder error'));
        try { rec.stop(); } catch (e) { reject(e); }
      });
    } else {
      blob = await toneRecorder!.stop();
    }
    recording = false;
    return blob;
  };

  const handle: MicRecorder = {
    start,
    stop,
    startTake: start,
    stopTake: stop,
    isRecording: () => recording,
    setMonitor: (g) => { monitor.gain.value = g; },
    setInputGain: (db) => { inputGain.gain.value = Math.pow(10, db / 20); },
    getWaveform: () => waveAnalyser.getValue() as Float32Array,
    getPeakDb: () => meter.getValue() as number,
    dispose: () => {
      if (activeHandle === handle) activeHandle = null;
      if (rawRecorder && rawRecorder.state !== 'inactive') {
        try { rawRecorder.stop(); } catch { /* ignore */ }
      }
      rawRecorder = null;
      rawChunks = [];
      if (mic) {
        try { mic.close(); } catch { /* ignore */ }
        mic.dispose();
      }
      if (manualStream) {
        try { manualStream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      }
      try { manualSourceNode?.disconnect(); } catch { /* ignore */ }
      try { channelSplitter?.disconnect(); } catch { /* ignore */ }
      channelSplitter = null;
      if (pcmProcessor) {
        try { pcmProcessor.disconnect(); } catch { /* ignore */ }
        pcmProcessor.onaudioprocess = null;
        pcmProcessor = null;
      }
      try { pcmSourceNode?.disconnect(); } catch { /* ignore */ }
      pcmSourceNode = null;
      if (pcmCtx) { try { void pcmCtx.close(); } catch { /* ignore */ } pcmCtx = null; }
      pcmChunks = [];
      inputGain.dispose(); monitor.dispose(); toneRecorder?.dispose();
      waveAnalyser.dispose(); meter.dispose();
    },
    close: () => handle.dispose(),
  };

  activeHandle = handle;
  return handle;
}

/** Dispose whichever recorder `openMicRecorder` most recently returned
 * (if any). Convenience for callers using the singleton-style API
 * instead of holding onto the handle themselves. */
export function closeMicRecorder(): void {
  activeHandle?.dispose();
  activeHandle = null;
}

/** Start recording on the active singleton recorder (the most recent
 * `openMicRecorder()` result). Throws if no recorder is open. */
export async function startTake(): Promise<void> {
  if (!activeHandle) throw new Error('sharedRecorder: no active mic recorder — call openMicRecorder() first');
  await activeHandle.start();
}

/** Stop recording on the active singleton recorder and return the take's
 * blob. Throws if no recorder is open. */
export async function stopTake(): Promise<Blob> {
  if (!activeHandle) throw new Error('sharedRecorder: no active mic recorder — call openMicRecorder() first');
  return activeHandle.stop();
}

/** Live waveform samples from the active singleton recorder, or an empty
 * array when nothing is open. */
export function getActiveWaveform(): Float32Array {
  return activeHandle?.getWaveform() ?? new Float32Array(0);
}

/** Live peak dB from the active singleton recorder, or -Infinity when
 * nothing is open. */
export function getActivePeakDb(): number {
  return activeHandle?.getPeakDb() ?? -Infinity;
}

// ── Latency configuration ──────────────────────────────────────────────

const INPUT_LATENCY_STORAGE_KEY = 'studio.inputLatencyMs';
/** Studio's long-standing default head-trim when no
 * `studio.inputLatencyMs` override is stored. Exported so other callers
 * (Part Tracks, Task 2) reference this constant instead of minting
 * another literal 700. */
export const DEFAULT_INPUT_LATENCY_MS = 700;

/** Residual HARDWARE latency for the web recording path (mic ADC +
 * output DAC + Bluetooth). Startup delay (getUserMedia, transport
 * start) is measured per take since 2026-07-06 — see
 * src/lib/audio/takeAlignment.ts — so this dial no longer needs to
 * cover it; hence the much smaller default than the legacy 700ms. */
export const DEFAULT_DEVICE_LATENCY_MS = 150;
const DEVICE_LATENCY_STORAGE_KEY = 'studio.deviceLatencyMs';

export function getConfiguredDeviceLatencyMs(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_DEVICE_LATENCY_MS;
  const raw = localStorage.getItem(DEVICE_LATENCY_STORAGE_KEY);
  return raw !== null ? Number(raw) : DEFAULT_DEVICE_LATENCY_MS;
}

/** Configured input latency in ms, read from `localStorage`
 * (`studio.inputLatencyMs`). Defaults to 700ms — the same default Studio
 * has always used. */
export function getConfiguredInputLatencyMs(
  storageKey: string = INPUT_LATENCY_STORAGE_KEY,
): number {
  if (typeof localStorage === 'undefined') return DEFAULT_INPUT_LATENCY_MS;
  // Consumer-specific keys (e.g. Part Tracks) fall back to the studio
  // key's value, then the default — so an ear-calibrated Studio setup
  // seeds other surfaces until they're tuned independently.
  const raw = localStorage.getItem(storageKey) ?? localStorage.getItem(INPUT_LATENCY_STORAGE_KEY);
  return raw !== null ? Number(raw) : DEFAULT_INPUT_LATENCY_MS;
}

/** Output latency in ms, read from a throwaway `AudioContext`'s
 * `outputLatency` (0 when unsupported/unavailable).
 *
 * Note: this intentionally does not close the AudioContext it creates —
 * that matches Studio's prior behavior (`finalizeRecordingBlob` created a
 * throwaway context solely to read this value and never closed it).
 * Preserved verbatim per the "bit-identical" constraint; revisit if it
 * becomes a measurable resource concern. */
export function getOutputLatencyMs(liveCtx?: AudioContext): number {
  // Prefer a LIVE (running) context when the caller has one — players
  // time themselves to what they HEAR, and only a running context
  // reports a meaningful outputLatency. A freshly constructed context
  // is not running yet and reports 0, which silently disabled the
  // "auto" MIDI compensation ("auto 0" in the settings panel) and made
  // takes land late by the real output latency.
  if (liveCtx) {
    const ms = ((liveCtx.outputLatency || liveCtx.baseLatency) ?? 0) * 1000;
    if (ms > 0) return ms;
  }
  // Fallback: throwaway context, best-effort. No try/catch on the
  // construction on purpose: the original inline version in
  // StudioEditor's finalizeRecordingBlob didn't guard it either, so a
  // construction failure propagated as an uncaught rejection (surfaced
  // to the user as the existing "Could not finalize recording" toast).
  if (typeof AudioContext === 'undefined') return 0;
  const ctx = new AudioContext();
  const ms = ((ctx.outputLatency || ctx.baseLatency) ?? 0) * 1000;
  void ctx.close().catch(() => { /* best effort — previously leaked */ });
  return ms;
}

// ── Sample-accurate head trim ──────────────────────────────────────────

/** Convert a millisecond duration to a whole sample count at the given
 * sample rate. Pure — no Web Audio APIs. */
export function msToSamples(ms: number, sampleRate: number): number {
  return Math.floor((ms / 1000) * sampleRate);
}

/** Cut `skipSamples` off the head of every channel of an
 * `AudioBufferLike`. Pure function — no Web Audio APIs — so it runs (and
 * is directly unit-testable) in any JS environment.
 *
 * Returns null when there's nothing to trim: `skipSamples <= 0`, or the
 * buffer is shorter than the requested trim (the original recording is
 * shorter than the configured latency — callers should fall back to the
 * untouched input, same as Studio always has). */
export function trimBufferHeadSamples(
  buf: AudioBufferLike,
  skipSamples: number,
): AudioBufferLike | null {
  if (!(skipSamples > 0)) return null;
  const newLen = buf.length - skipSamples;
  if (newLen <= 0) return null;

  const channels: Float32Array[] = [];
  for (let c = 0; c < buf.numberOfChannels; c++) {
    channels.push(buf.getChannelData(c).subarray(skipSamples));
  }
  return {
    numberOfChannels: buf.numberOfChannels,
    length: newLen,
    sampleRate: buf.sampleRate,
    getChannelData: (c: number) => channels[c],
  };
}

/** Encode an `AudioBufferLike` as a 16-bit PCM WAV blob. Pure — no Web
 * Audio APIs beyond `Blob`/`ArrayBuffer`/`DataView`, all available in
 * plain Node, so this (and `trimBufferHeadSamples` above) are directly
 * unit-testable without a browser/jsdom/happy-dom environment. */
export function encodeWavFromBufferLike(buf: AudioBufferLike): Blob {
  const numCh = buf.numberOfChannels;
  const sampleRate = buf.sampleRate;
  const length = buf.length;
  const bytesPerSample = 2; // 16-bit
  const dataSize = length * numCh * bytesPerSample;
  const headerSize = 44;
  const out = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(out);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);             // PCM chunk size
  view.setUint16(20, 1, true);              // format = PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * bytesPerSample, true); // byte rate
  view.setUint16(32, numCh * bytesPerSample, true);              // block align
  view.setUint16(34, 16, true);             // bits per sample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave + clamp to 16-bit.
  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buf.getChannelData(c));

  let offset = headerSize;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// ── Task 5: Headphone/bleed guard (web route heuristic) ───────────────

/** Output-device label substrings that suggest private listening
 * (wired/Bluetooth headphones, earbuds, or a headset) rather than open
 * room speakers. Case-insensitive. Pure — operates on an already-fetched
 * label string — so it's directly unit-testable without
 * `navigator.mediaDevices`. */
const HEADPHONE_LABEL_RE = /headphone|airpod|earbud|headset|bluetooth/i;

/** Pure classification: does this `MediaDeviceInfo.label` look like a
 * headphone-ish output? Exported so `getLikelyAudioRoute` below and its
 * unit tests share one definition. */
export function isLikelyHeadphoneLabel(label: string): boolean {
  return HEADPHONE_LABEL_RE.test(label);
}

/** Best-effort guess at whether the browser is currently routing audio to
 * headphones. Unlike native iOS (`getAudioRoute` in
 * `src/plugins/studioEngine.ts`), the Web Audio / MediaDevices APIs have
 * no direct "what's the active output route" query — this is a
 * heuristic over `navigator.mediaDevices.enumerateDevices()`: does any
 * `audiooutput` device that's actually in the route (deviceId `default`
 * or `communications` — Chrome's markers for the device the system is
 * currently using, as opposed to merely present in the device list) have
 * a label matching {@link isLikelyHeadphoneLabel}? Falls back to
 * checking all `audiooutput` devices when neither marker is present
 * (Firefox/Safari don't expose them).
 *
 * Returns `{ isHeadphones: null }` — unknown, deliberately NOT "false" —
 * when there's nothing to classify: `enumerateDevices` is unavailable,
 * the call throws, there are no `audiooutput` devices, or every label is
 * blank (labels stay empty until a mic/speaker permission has been
 * granted at least once). Callers should treat `null` the same as
 * "don't warn" — this is a best-effort heuristic, not a confirmed
 * not-headphones reading. */
export async function getLikelyAudioRoute(): Promise<{ isHeadphones: boolean | null }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return { isHeadphones: null };
  }
  let devices: MediaDeviceInfo[];
  try {
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch {
    return { isHeadphones: null };
  }
  const outputs = devices.filter((d) => d.kind === 'audiooutput');
  if (outputs.length === 0 || outputs.every((d) => !d.label)) {
    return { isHeadphones: null };
  }
  const routeCandidates = outputs.filter(
    (d) => d.deviceId === 'default' || d.deviceId === 'communications',
  );
  const pool = routeCandidates.length > 0 ? routeCandidates : outputs;
  return { isHeadphones: pool.some((d) => isLikelyHeadphoneLabel(d.label)) };
}

/** Trim an already-decoded buffer's head by `ms` milliseconds. Pure
 * (modulo the caller having decoded the blob already) — used internally
 * by `trimHeadLatency` below, and directly by Studio's
 * `finalizeRecordingBlob` so it can decode the raw take exactly once
 * (matching its prior behavior) while still delegating the actual trim
 * math to this shared module. */
export function trimDecodedBufferHead(
  buf: AudioBufferLike,
  ms: number,
): { buffer: AudioBufferLike; trimmed: boolean } {
  const skipSamples = ms > 0 ? msToSamples(ms, buf.sampleRate) : 0;
  const trimmed = skipSamples > 0 ? trimBufferHeadSamples(buf, skipSamples) : null;
  return trimmed ? { buffer: trimmed, trimmed: true } : { buffer: buf, trimmed: false };
}

/** Decode step signature for `trimHeadLatency`. The default
 * implementation decodes via a throwaway `AudioContext`; tests (and any
 * caller that already has decoded PCM) can inject their own to exercise
 * the full trim→encode composition without Web Audio globals. */
export type BlobDecoder = (blob: Blob) => Promise<AudioBufferLike>;

/** Default decoder: `AudioContext.decodeAudioData` on a throwaway
 * context. Throws when `AudioContext` is unavailable or the blob can't
 * be decoded — `trimHeadLatency` turns any decode failure into a
 * return-the-original-blob fallback. */
const decodeWithAudioContext: BlobDecoder = async (blob) => {
  if (typeof AudioContext === 'undefined') {
    throw new Error('AudioContext unavailable — cannot decode');
  }
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    ctx.close().catch(() => { /* ignore */ });
  }
};

/** Sample-accurate head-trim of a recorded blob by `ms` milliseconds.
 * Decodes the blob, cuts `ms` off the head, and re-encodes as WAV —
 * preserving channel count and sample rate. Returns the *original* blob
 * unchanged when `ms <= 0`, decoding fails (unsupported format,
 * corrupted data, no AudioContext), or the recording is shorter than the
 * requested trim.
 *
 * `decode` defaults to the AudioContext path; inject a custom decoder to
 * run the full decode→trim→encode composition in environments without
 * Web Audio (unit tests), or to reuse an existing decode result. */
export async function trimHeadLatency(
  blob: Blob,
  ms: number,
  decode: BlobDecoder = decodeWithAudioContext,
): Promise<Blob> {
  if (!(ms > 0)) return blob;
  try {
    const rawBuf = await decode(blob);
    const { buffer, trimmed } = trimDecodedBufferHead(rawBuf, ms);
    if (!trimmed) return blob;
    return encodeWavFromBufferLike(buffer);
  } catch {
    return blob;
  }
}
