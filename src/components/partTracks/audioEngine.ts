// Audio engine for the Part Tracks Studio.
//
// One shared AudioContext drives playback of every loaded track. Each
// track gets its own gain + panner so the mixer can mute / solo / pan in
// real time. Playback intentionally avoids a heavy library (Tone.js,
// WaveSurfer) so the studio loads fast and runs on iPad WKWebView without
// quirks.
//
// Recording is the one exception: capture goes through the shared web
// recording engine (src/lib/audio/sharedRecorder.ts) so Part Tracks gets
// the same hardened mic-capture + latency-trim pipeline Studio uses (see
// docs/superpowers/plans/2026-07-05-part-tracks-shared-engine.md, Task 2).
// That module runs on its own Tone.js AudioContext, entirely separate
// from the raw `audioCtx` below — the mic graph and the playback graph
// are independent audio pipelines that both happen to render to the
// system's default output, which browsers handle fine running
// concurrently.

import {
  openMicRecorder, startTake as sharedStartTake, stopTake as sharedStopTake,
  closeMicRecorder, getActiveWaveform,
  trimHeadLatency, getConfiguredInputLatencyMs, getOutputLatencyMs,
} from '@/lib/audio/sharedRecorder';

interface LoadedTrack {
  id: string;
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  /** Fallback playback path used when decodeAudioData rejects the codec
   *  (e.g. opus/webm on iOS Safari). When set, playback uses the audio
   *  element directly instead of a scheduled AudioBufferSourceNode. */
  audioElement: HTMLAudioElement | null;
  mediaElementSource: MediaElementAudioSourceNode | null;
  fallbackTimer: ReturnType<typeof setTimeout> | null;
  /** blob: URL minted via URL.createObjectURL for the fallback path.
   *  Must be revoked in unloadTrack — otherwise re-recording the same
   *  track leaks an in-memory blob copy on every save. */
  objectUrl: string | null;
  gain: GainNode;
  panner: StereoPannerNode;
  durationSec: number;
  /** Timeline position when MediaRecorder was started for this take.
   *  On playback the track's source.start() is offset by this amount so
   *  the vocal lines up with the master mix exactly as it did during the
   *  original take. 0 for the accompaniment + first-take recordings. */
  recordOffsetSec: number;
}

let audioCtx: AudioContext | null = null;
const tracks = new Map<string, LoadedTrack>();
let masterGain: GainNode | null = null;
let outputDestination: MediaStreamAudioDestinationNode | null = null;
let outputAudio: HTMLAudioElement | null = null;
let currentOutputDeviceId: string = 'default';

function ensureCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.9;
    // Default route: straight to ctx.destination. We *used* to route
    // every session through MediaStreamAudioDestinationNode → <audio
    // srcObject> so setSinkId() could pick a custom output device, but
    // that path glitches with periodic underruns on long playback
    // (audible cracks around the one-minute mark in both Chrome and
    // WebKit). The MediaStream route is now opt-in: setOutputDevice()
    // installs it only when the user actually selects a non-default
    // device.
    masterGain.connect(audioCtx.destination);
  }
  return audioCtx;
}

/** Lazily switch the master output to a specific device. The MediaStream
 *  → <audio srcObject> route required for setSinkId is installed on
 *  demand because keeping it always-on caused ~1 min playback glitches.
 *  Passing 'default' (or a falsy id) reverts to the direct-to-destination
 *  route. Returns false when the browser doesn't expose setSinkId. */
export async function setOutputDevice(deviceId: string): Promise<boolean> {
  const ctx = ensureCtx();
  currentOutputDeviceId = deviceId || 'default';
  const wantsCustom = !!deviceId && deviceId !== 'default';
  const hasSinkId = typeof HTMLMediaElement !== 'undefined'
    && 'setSinkId' in HTMLMediaElement.prototype;
  if (!hasSinkId) return false;

  // Revert to direct destination if user picked default.
  if (!wantsCustom) {
    if (outputAudio) {
      try { outputAudio.pause(); } catch {}
      try { outputAudio.srcObject = null; } catch {}
      outputAudio.remove();
      outputAudio = null;
    }
    if (outputDestination) {
      try { masterGain!.disconnect(outputDestination); } catch {}
      outputDestination = null;
    }
    try { masterGain!.disconnect(ctx.destination); } catch {}
    masterGain!.connect(ctx.destination);
    return true;
  }

  // Install MediaStream route the first time a real device is picked.
  if (!outputDestination || !outputAudio) {
    try { masterGain!.disconnect(ctx.destination); } catch {}
    outputDestination = ctx.createMediaStreamDestination();
    masterGain!.connect(outputDestination);
    outputAudio = document.createElement('audio');
    outputAudio.autoplay = true;
    outputAudio.srcObject = outputDestination.stream;
    outputAudio.volume = 1;
    outputAudio.style.display = 'none';
    document.body.appendChild(outputAudio);
  }
  try {
    await (outputAudio as any).setSinkId(deviceId);
    return true;
  } catch (err) {
    console.warn('[audioEngine] setSinkId failed', err);
    return false;
  }
}

export function getCurrentOutputDevice(): string { return currentOutputDeviceId; }

export async function unlockAudio(): Promise<void> {
  const ctx = ensureCtx();
  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }
}

/** Waits (ms) BEFORE each fetch attempt when loading a track's audio.
 *  Two regimes on purpose:
 *   - the first four attempts land within ~2.7s, catching ordinary CDN
 *     propagation blips right after an upload;
 *   - the tail keeps trying past 60s because the self-hosted storage
 *     backend only exposes new objects after a once-a-minute "flatten"
 *     cron on the droplet (Storage writes stub/<bucket>/… paths; the
 *     public proxy reads flat paths; /opt/supabase/scripts/
 *     flatten-storage.sh reconciles every 60s). Until that job has run,
 *     the public URL returns 403 AccessDenied.
 *  Exported for unit tests: the load-bearing property is that the total
 *  window comfortably covers the 60s flatten interval. */
export const TRACK_FETCH_RETRY_DELAYS_MS: readonly number[] = [
  0, 400, 800, 1500, 3000, 5000, 8000, 12000, 15000, 15000, 15000, 15000,
];

// One in-flight URL load per track id. With retries spanning ~90s, a
// pending loadTrack could otherwise resolve long after the track was
// unloaded (deleted, project closed) or superseded by a blob load, and
// re-insert a ghost entry into `tracks` that plays on the next transport
// start. unloadTrack/loadTrackFromBlob abort the pending load instead.
const loadAborts = new Map<string, AbortController>();

function abortPendingLoad(id: string) {
  loadAborts.get(id)?.abort();
  loadAborts.delete(id);
}

export async function loadTrack(
  id: string,
  url: string,
  recordOffsetSec: number = 0,
): Promise<{ duration: number; peaks: number[] }> {
  const ctx = ensureCtx();
  await unlockAudio();

  const existing = tracks.get(id);
  if (existing) {
    try { existing.source?.stop(); } catch {}
  }

  // Supersede any load already in flight for this id and register our own
  // controller so unloadTrack / a newer load can cancel us mid-retry.
  abortPendingLoad(id);
  const aborter = new AbortController();
  loadAborts.set(id, aborter);
  const signal = aborter.signal;

  // Retry on 403 / 404 / 5xx with backoff. Supabase Storage's public URL
  // can reject a fresh upload for a while: the self-hosted storage
  // service writes new objects to a stub path and a droplet cron
  // flattens them to the public path every 60s — until then the URL
  // returns 403 AccessDenied (see TRACK_FETCH_RETRY_DELAYS_MS). Without
  // a retry window that spans the flatten interval, a just-uploaded
  // backing track (or a take opened from another device right after
  // recording) looks permanently broken: no waveform, silent playback.
  const fetchWithRetry = async (): Promise<ArrayBuffer> => {
    const delays = TRACK_FETCH_RETRY_DELAYS_MS;
    let lastStatus = 0;
    for (let i = 0; i < delays.length; i++) {
      const ms = delays[i];
      if (ms > 0) await new Promise((r) => setTimeout(r, ms));
      if (signal.aborted) throw new DOMException('Track load superseded', 'AbortError');
      let resp: Response;
      try {
        resp = await fetch(url, { cache: 'no-store', signal });
      } catch (err) {
        if ((err as any)?.name === 'AbortError' || i === delays.length - 1) throw err;
        continue;
      }
      lastStatus = resp.status;
      if (!resp.ok) continue;
      const ab = await resp.arrayBuffer();
      if (ab.byteLength === 0) continue;
      return ab;
    }
    throw new Error(lastStatus
      ? `Could not fetch audio (HTTP ${lastStatus}) — the upload may still be propagating.`
      : 'Could not fetch audio.');
  };
  let ab: ArrayBuffer;
  try {
    ab = await fetchWithRetry();
  } finally {
    if (loadAborts.get(id) === aborter) loadAborts.delete(id);
  }
  if (signal.aborted) throw new DOMException('Track load superseded', 'AbortError');

  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  gain.connect(panner);
  panner.connect(masterGain!);

  let buffer: AudioBuffer | null = null;
  try {
    buffer = await ctx.decodeAudioData(ab.slice(0));
  } catch (e) {
    console.warn('[audioEngine] decodeAudioData failed, falling back to HTMLAudioElement', e);
  }

  if (buffer) {
    tracks.set(id, {
      id, buffer, source: null,
      audioElement: null, mediaElementSource: null, fallbackTimer: null,
      objectUrl: null,
      gain, panner, durationSec: buffer.duration, recordOffsetSec,
    });
    return { duration: buffer.duration, peaks: computePeaks(buffer, 800) };
  }

  // Fallback path: HTMLAudioElement uses the browser's full media stack,
  // which handles codecs that decodeAudioData refuses (most importantly
  // opus/webm on iOS Safari). We lose sample-accurate scheduling but the
  // track still plays — and is still gain/panned via the shared graph.
  const el = document.createElement('audio');
  el.src = url;
  el.crossOrigin = 'anonymous';
  el.preload = 'auto';
  await new Promise<void>((resolve, reject) => {
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => {
      cleanup();
      reject(new Error('Unable to load audio in this browser — the file format is not supported.'));
    };
    const cleanup = () => {
      el.removeEventListener('loadedmetadata', onReady);
      el.removeEventListener('canplay', onReady);
      el.removeEventListener('error', onError);
    };
    el.addEventListener('loadedmetadata', onReady, { once: true });
    el.addEventListener('canplay', onReady, { once: true });
    el.addEventListener('error', onError, { once: true });
    el.load();
  });
  const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
  let mediaSrc: MediaElementAudioSourceNode | null = null;
  try {
    mediaSrc = ctx.createMediaElementSource(el);
    mediaSrc.connect(gain);
  } catch (e) {
    // Some browsers throw if the element is already connected; bypass
    // the graph and let the element play through default output.
    console.warn('[audioEngine] createMediaElementSource failed', e);
  }
  tracks.set(id, {
    id, buffer: null, source: null,
    audioElement: el, mediaElementSource: mediaSrc, fallbackTimer: null,
    objectUrl: null, // remote URL, not a blob: URL — nothing to revoke
    gain, panner, durationSec: duration, recordOffsetSec,
  });
  // No PCM available for peaks — return an empty array, the Waveform
  // component will render its empty-track centerline.
  return { duration, peaks: [] };
}

/** Load a track from an in-memory Blob (the take we just recorded) so
 *  immediate post-save preview doesn't depend on the public URL being
 *  reachable yet. Used right after stopRecording; the regular loadTrack
 *  takes over on subsequent page loads when the file is served from
 *  storage. */
export async function loadTrackFromBlob(
  id: string,
  blob: Blob,
  recordOffsetSec: number = 0,
): Promise<{ duration: number; peaks: number[] }> {
  const ctx = ensureCtx();
  await unlockAudio();

  // The in-memory blob supersedes any URL load still retrying for this
  // id (e.g. the load effect racing a just-uploaded backing track).
  abortPendingLoad(id);

  const existing = tracks.get(id);
  if (existing) {
    try { existing.source?.stop(); } catch {}
    try { existing.gain.disconnect(); } catch {}
    try { existing.panner.disconnect(); } catch {}
    if (existing.audioElement) {
      try { existing.audioElement.pause(); } catch {}
      try { existing.mediaElementSource?.disconnect(); } catch {}
      existing.audioElement.src = '';
    }
    if (existing.objectUrl) {
      try { URL.revokeObjectURL(existing.objectUrl); } catch {}
    }
  }

  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  gain.connect(panner);
  panner.connect(masterGain!);

  // Try decodeAudioData on the in-memory bytes first (fastest path).
  let buffer: AudioBuffer | null = null;
  try {
    const ab = await blob.arrayBuffer();
    buffer = await ctx.decodeAudioData(ab.slice(0));
  } catch (e) {
    console.warn('[audioEngine] decodeAudioData on blob failed, falling back to HTMLAudioElement', e);
  }

  if (buffer) {
    tracks.set(id, {
      id, buffer, source: null,
      audioElement: null, mediaElementSource: null, fallbackTimer: null,
      objectUrl: null,
      gain, panner, durationSec: buffer.duration, recordOffsetSec,
    });
    return { duration: buffer.duration, peaks: computePeaks(buffer, 800) };
  }

  // Fallback path — same as loadTrack, but using a blob: URL so we never
  // hit the network for the just-recorded take.
  const blobUrl = URL.createObjectURL(blob);
  const el = document.createElement('audio');
  el.src = blobUrl;
  el.preload = 'auto';
  try {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Unable to load just-recorded audio in this browser.')); };
      const cleanup = () => {
        el.removeEventListener('loadedmetadata', onReady);
        el.removeEventListener('canplay', onReady);
        el.removeEventListener('error', onError);
      };
      el.addEventListener('loadedmetadata', onReady, { once: true });
      el.addEventListener('canplay', onReady, { once: true });
      el.addEventListener('error', onError, { once: true });
      el.load();
    });
  } catch (err) {
    URL.revokeObjectURL(blobUrl);
    throw err;
  }
  const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
  let mediaSrc: MediaElementAudioSourceNode | null = null;
  try {
    mediaSrc = ctx.createMediaElementSource(el);
    mediaSrc.connect(gain);
  } catch (e) {
    console.warn('[audioEngine] createMediaElementSource (blob) failed', e);
  }
  tracks.set(id, {
    id, buffer: null, source: null,
    audioElement: el, mediaElementSource: mediaSrc, fallbackTimer: null,
    objectUrl: blobUrl, // revoke in unloadTrack so re-records don't leak
    gain, panner, durationSec: duration, recordOffsetSec,
  });
  return { duration, peaks: [] };
}

/** Expose the decoded buffer for a loaded track so the audio-tools layer
 *  (trim / normalize / denoise) can read PCM without re-fetching. Returns
 *  null when the track is using the HTMLAudioElement fallback (no PCM). */
export function getTrackBuffer(id: string): AudioBuffer | null {
  return tracks.get(id)?.buffer ?? null;
}

/** Play a metronome-style count-in: `beats` quick clicks at `bpm`. Returns
 *  the duration in seconds so the caller can chain the recorder start. */
export function playCountIn(beats: number, bpm: number): number {
  const ctx = ensureCtx();
  const interval = 60 / Math.max(20, Math.min(300, bpm));
  const startAt = ctx.currentTime + 0.05;
  for (let i = 0; i < beats; i++) {
    const t = startAt + i * interval;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    // First beat a bit higher so the singer can hear "1, 2, 3, 4".
    osc.frequency.value = i === 0 ? 1500 : 1000;
    osc.connect(env);
    env.connect(masterGain!);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.4, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.1);
  }
  return beats * interval;
}

/** Update the offset for an already-loaded track without re-decoding. */
export function setTrackRecordOffset(id: string, recordOffsetSec: number) {
  const t = tracks.get(id);
  if (t) t.recordOffsetSec = recordOffsetSec;
}

export function unloadTrack(id: string) {
  // Cancel any URL load still retrying for this id — otherwise it could
  // resolve after the unload and re-insert the track as a ghost entry.
  abortPendingLoad(id);
  const t = tracks.get(id);
  if (!t) return;
  try { t.source?.stop(); } catch {}
  try { t.gain.disconnect(); } catch {}
  try { t.panner.disconnect(); } catch {}
  if (t.fallbackTimer) clearTimeout(t.fallbackTimer);
  if (t.audioElement) {
    try { t.audioElement.pause(); } catch {}
    try { t.mediaElementSource?.disconnect(); } catch {}
    t.audioElement.src = '';
    try { t.audioElement.load(); } catch {}
  }
  if (t.objectUrl) {
    try { URL.revokeObjectURL(t.objectUrl); } catch {}
  }
  tracks.delete(id);
}

export function setTrackVolume(id: string, volume: number, muted: boolean) {
  const t = tracks.get(id);
  if (!t) return;
  const v = muted ? 0 : Math.max(0, Math.min(1, volume));
  t.gain.gain.value = v;
  // Mirror onto the element too — necessary when createMediaElementSource
  // bailed and the element is playing through the default output.
  if (t.audioElement) t.audioElement.volume = v;
}

export function setTrackPan(id: string, pan: number) {
  const t = tracks.get(id);
  if (!t) return;
  t.panner.pan.value = Math.max(-1, Math.min(1, pan));
}

let playStartTime = 0;
let playStartOffset = 0;
let isPlaying = false;

export function startPlayback(offsetSec = 0) {
  const ctx = ensureCtx();
  stopPlayback();
  playStartTime = ctx.currentTime;
  playStartOffset = offsetSec;
  // All sources are scheduled relative to a single anchor on the audio
  // context clock, so they fire at the same moment regardless of how
  // long the loop body takes to run.
  const anchor = ctx.currentTime + 0.05; // 50ms grace so the schedule isn't in the past
  tracks.forEach((t) => {
    const timelinePos = t.recordOffsetSec;
    const localOffsetInBuffer = Math.max(0, offsetSec - timelinePos);
    if (localOffsetInBuffer >= t.durationSec) return;

    if (t.buffer) {
      const src = ctx.createBufferSource();
      src.buffer = t.buffer;
      src.connect(t.gain);
      const startAt = anchor + Math.max(0, timelinePos - offsetSec);
      src.start(startAt, localOffsetInBuffer);
      t.source = src;
      return;
    }

    // Fallback path — schedule the HTMLAudioElement with setTimeout to
    // approximate the same offset. Not sample-accurate but close enough
    // for vocal-with-backing alignment, and this is the ONLY way to
    // play codecs decodeAudioData refuses (e.g. opus on iOS Safari).
    if (t.audioElement) {
      const el = t.audioElement;
      try { el.currentTime = localOffsetInBuffer; } catch {}
      const delayMs = Math.max(0, (timelinePos - offsetSec) * 1000);
      const fire = () => { void el.play().catch(() => { /* user-gesture race */ }); };
      if (delayMs < 5) fire();
      else t.fallbackTimer = setTimeout(fire, delayMs);
    }
  });
  isPlaying = true;
}

export function stopPlayback() {
  tracks.forEach((t) => {
    if (t.source) {
      try { t.source.stop(); } catch {}
      try { t.source.disconnect(); } catch {}
      t.source = null;
    }
    if (t.fallbackTimer) { clearTimeout(t.fallbackTimer); t.fallbackTimer = null; }
    if (t.audioElement) { try { t.audioElement.pause(); } catch {} }
  });
  isPlaying = false;
}

export function getCurrentTime(): number {
  if (!isPlaying || !audioCtx) return playStartOffset;
  return playStartOffset + (audioCtx.currentTime - playStartTime);
}

export function getMaxDuration(): number {
  let max = 0;
  tracks.forEach((t) => { if (t.durationSec > max) max = t.durationSec; });
  return max;
}

export function isPlaybackActive(): boolean { return isPlaying; }

// Compute peaks for waveform drawing. Buckets the channel data into N
// peaks (typical 800 for a wide track row), returning normalized [-1, 1].
function computePeaks(buffer: AudioBuffer, bucketCount: number): number[] {
  const channel = buffer.getChannelData(0);
  const bucketSize = Math.max(1, Math.floor(channel.length / bucketCount));
  const peaks: number[] = new Array(bucketCount).fill(0);
  for (let i = 0; i < bucketCount; i++) {
    let max = 0;
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, channel.length);
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  return peaks;
}

// Recording — capture via the shared web recorder (Task 2 of
// docs/superpowers/plans/2026-07-05-part-tracks-shared-engine.md). Part
// Tracks used to run its own getUserMedia + MediaRecorder here directly;
// it now opens the same Tone.js-backed mic graph Studio uses
// (src/lib/audio/sharedRecorder.ts), passing Part Tracks' own
// constraints (mono, 48k best-effort, sampleSize 16, music-mode AEC/NS/AGC
// toggle) through `openMicRecorder`'s `constraints` option, and its own
// mime-type probe through the `mimeType` option. Every finished take is
// head-trimmed for input + output latency (`trimHeadLatency`) before the
// caller (PartTracksStudio.tsx) uploads it — latency compensation Part
// Tracks never had with the old MediaRecorder path.
let recordingActive = false;
let recordingMimeType: string = 'audio/webm';
let levelRaf: number | null = null;

// iOS Safari only supports audio/mp4; Chrome/Firefox prefer webm/opus.
// Probe so the resulting blob is actually playable on the originating
// device and the upload path/contentType match the container. Fed to
// sharedRecorder's `mimeType` option (→ `new Tone.Recorder({ mimeType })`)
// since Tone.Recorder otherwise falls back to the browser's unmanaged
// default, which isn't always the one Safari/iOS can play back.
function pickRecorderMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
  ];
  const MR = (window as any).MediaRecorder;
  if (!MR || typeof MR.isTypeSupported !== 'function') return '';
  for (const t of candidates) {
    try { if (MR.isTypeSupported(t)) return t; } catch { /* ignore */ }
  }
  return '';
}

/** Pure mapping from a take's actual MIME type to a file extension for
 *  the upload path + contentType. `trimHeadLatency` re-encodes
 *  successfully-trimmed takes to WAV, so the extension has to follow the
 *  FINAL blob's type, not the pre-recording probe — this is what makes
 *  that swap safe. No DOM/Web Audio dependency, so it's directly unit
 *  tested (see docs/.../part-tracks-shared-engine.md, Task 2). */
export function extensionForMimeType(mimeType: string): string {
  const type = (mimeType || '').toLowerCase();
  if (type.startsWith('audio/wav') || type.startsWith('audio/wave') || type.startsWith('audio/x-wav')) return 'wav';
  if (type.startsWith('audio/mp4') || type.startsWith('audio/aac')) return 'm4a';
  return 'webm';
}

export function getRecordingExtension(): string {
  return extensionForMimeType(recordingMimeType);
}

export function getRecordingMimeType(): string {
  return recordingMimeType;
}

// sharedRecorder's manual-getUserMedia path (used whenever we pass
// `constraints`, which Part Tracks always does) stashes the original
// DOMException on `.cause` of the Error it throws so callers can still
// give a specific reason instead of parsing its generic wrapper message.
// Mirrors the granular messages Part Tracks has always shown.
function mapMicError(e: any): Error {
  const original = e?.cause ?? e;
  const name = original?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return new Error('Microphone permission was denied. Allow mic access for this site and try again.');
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return new Error('No microphone was found. Connect one and try again.');
  }
  if (name === 'NotReadableError') {
    return new Error('Microphone is in use by another app. Close it and try again.');
  }
  return new Error(original?.message ?? e?.message ?? 'Could not access the microphone.');
}

export async function startRecording(opts?: {
  inputDeviceId?: string;
  /** Fires ~every 60ms with a normalized peak (0..1) sampled from the
   *  live mic stream. Used by the studio to draw the live waveform as
   *  the take is recorded. */
  onLevel?: (peak: number) => void;
  /** When true, requests a clean signal-chain suitable for music:
   *  no echo cancellation / noise suppression / auto-gain (these are
   *  voice-call DSPs that smear vocals) and a 48kHz sample rate. When
   *  false / unset we keep echo cancellation on to suppress speaker
   *  bleed for users monitoring without headphones. */
  musicMode?: boolean;
}): Promise<void> {
  await unlockAudio();
  if (recordingActive) return;
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    throw new Error('Microphone access is not available in this browser.');
  }
  const musicMode = !!opts?.musicMode;
  const constraints: MediaTrackConstraints = {
    echoCancellation: !musicMode, // music mode: off (clean vocal capture)
    noiseSuppression: false,
    autoGainControl: false,
    // Browsers ignore constraints they don't honor, so these are a
    // best-effort upgrade — most desktop browsers will give 48k.
    sampleRate: 48000,
    sampleSize: 16,
    channelCount: 1, // mono — better SNR for a single vocal mic
  } as MediaTrackConstraints;

  const preferredMimeType = pickRecorderMimeType();

  try {
    await openMicRecorder({
      inputDeviceId: opts?.inputDeviceId,
      constraints,
      mimeType: preferredMimeType || undefined,
    });
  } catch (e: any) {
    throw mapMicError(e);
  }

  try {
    await sharedStartTake();
  } catch (e) {
    // Mic opened but the recorder itself failed to start — close the
    // stream/handle instead of leaking it (mirrors the old path's
    // `recordingStream.getTracks().forEach(t => t.stop())` cleanup on a
    // MediaRecorder-construction failure).
    closeMicRecorder();
    throw e;
  }
  recordingActive = true;

  // Wire a live-level tap off the shared recorder's own analyser so the
  // studio can render the waveform as the take rolls in. Throttled to
  // ~60ms via rAF skip-counting, same cadence as before.
  if (opts?.onLevel) {
    let lastEmit = 0;
    const tick = () => {
      if (!recordingActive) return;
      const now = performance.now();
      if (now - lastEmit >= 60) {
        const samples = getActiveWaveform();
        let peak = 0;
        for (let i = 0; i < samples.length; i++) {
          const v = Math.abs(samples[i]);
          if (v > peak) peak = v;
        }
        opts.onLevel!(peak);
        lastEmit = now;
      }
      levelRaf = requestAnimationFrame(tick);
    };
    levelRaf = requestAnimationFrame(tick);
  }
}

export async function stopRecording(): Promise<Blob | null> {
  if (!recordingActive) return null;
  recordingActive = false;
  if (levelRaf !== null) { cancelAnimationFrame(levelRaf); levelRaf = null; }

  const rawBlob = await sharedStopTake();
  closeMicRecorder();
  if (!rawBlob || rawBlob.size === 0) return rawBlob ?? null;

  // Latency compensation Part Tracks never had with the old MediaRecorder
  // path: trim the configured input + measured output latency off the
  // head of every take before the caller uploads it. Falls back to the
  // raw blob untouched when decode fails or the take is shorter than the
  // trim (trimHeadLatency's own contract).
  // Part Tracks has its own tunable key ('partTracks.inputLatencyMs');
  // falls back to Studio's calibration, then the shared default. The
  // right value for THIS pipeline is settled by the on-device clap test
  // (plan Task 6) — the trim technique is proven, the constant is not.
  const trimMs = getConfiguredInputLatencyMs('partTracks.inputLatencyMs') + getOutputLatencyMs();
  const finalBlob = await trimHeadLatency(rawBlob, trimMs);
  recordingMimeType = finalBlob.type || rawBlob.type || recordingMimeType;
  return finalBlob;
}
