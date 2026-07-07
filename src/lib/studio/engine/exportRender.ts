// Export presets + chunked offline rendering — Studio Mixer & Mastering
// B1 Task 7.
//
// Three user-facing presets (wired from the MixerView MasterStrip /
// StudioEditor Export sheet):
//   - MP3 320  -> renderMaster() -> encodeMp3()
//   - WAV (CD) -> renderMaster() -> audioBufferToWavBlob()
//   - Stems    -> renderStems()  -> audioBufferToWavBlob() per track
//
// Rendering reuses mixdown.ts's Tone.Offline scheduling pattern (accepted
// by the B1 spec rather than rewriting the graph-builder to be context-
// parameterized): each render is a fresh `Tone.Offline` call that rebuilds
// the session's Tone graph against a brand-new OfflineAudioContext.
//
// Mastering handoff (Task 5 -> Task 7, see masterChain.ts's
// BuildMasterChainOptions doc): Tone.Offline's callback receives the
// OfflineContext's `rawContext`. Unlike the LIVE engine — whose
// `Tone.getContext().rawContext` is a standardized-audio-context wrapper
// that rejects the bare `new AudioWorkletNode(ctx, …)` constructor —
// Tone.Offline's rawContext behaves like a native OfflineAudioContext for
// worklet-node construction, so `buildMasterChain` is called WITHOUT the
// `createWorkletNode` escape hatch here. If `rawContext.audioWorklet` is
// unavailable (a Safari quirk), `buildMasterChain` degrades to the
// HPF/shelf/comp-only chain and reports `degraded: true` — that is
// correct, expected behavior; callers surface it via `onDegraded()`
// rather than treating it as a render failure.
//
// Memory (docs/research/2026-07-06-web-audio-mastering-brief.md
// "Offline rendering"): stereo f32 44.1k ~= 21.2MB/min; a full-session
// single-pass render of an 8-track 5-minute session projects well past
// the ~150-200MB danger zone the research brief calls out (iOS Safari
// OOM observed ~100-200MB, and OOM is a SILENT kill — no error, no
// warning). Above that projection, `renderMaster` switches to chunked
// rendering: 45s bodies, a 3s discarded lead-in per chunk (lets
// filters/comp/limiter state settle before the kept audio starts) plus a
// 50ms overlap carried from the tail of that lead-in into the next
// chunk, joined via `spliceChunks`'s equal-power crossfade. Each chunk is
// rendered by its own fresh OfflineAudioContext (via a fresh Tone.Offline
// call) and every node this module builds is explicitly disposed once
// that chunk's samples are extracted, so no chunk's graph survives into
// the next iteration.

import * as Tone from 'tone';
import type { Session, Track } from '../session';
import { withMasteringDefaults, DEFAULT_MASTERING, type MasteringParams } from '../session';
import { buildFxChain } from './fx';
import { buildTrack } from './tracks';
import { dbToGain } from './engine';
import { buildMasterChain } from './masterChain';
import { audioBufferToWavBlob } from './mixdown';
import { encodeMp3 } from '@/lib/audio/encodeMp3';

const TAIL_SECONDS = 1.5; // matches mixdown.ts — captures reverb/delay decay past the declared session length
export const EXPORT_SAMPLE_RATE = 44100; // CD quality — fixed for all three presets
export const CHUNK_THRESHOLD_BYTES = 150 * 1024 * 1024; // spec: single-pass below ~150-200MB projected
export const CHUNK_SECONDS = 45;
export const LEAD_IN_SECONDS = 3;
export const CROSSFADE_SECONDS = 0.05; // 50ms

// ═══════════════════════════════════════════════════════════════════
// Pure math — projected size, chunk plan, crossfade splice. No
// AudioContext involved; these are exhaustively unit tested (jsdom/node
// have no real Web Audio implementation, so anything touching
// Tone.Offline/AudioBuffer/AudioWorklet is exercised via the manual smoke
// path documented in the task report instead — same precedent as
// masterChain.test.ts).
// ═══════════════════════════════════════════════════════════════════

/** Rough worst-case memory projection for a full-session render: f32
 * stereo per track (its own graph + fx tail) plus a stereo master bus,
 * across the declared length plus the render tail. 8 bytes/frame =
 * 2 channels * 4 bytes (f32). Intentionally conservative (over-counts —
 * tracks don't all stay resident simultaneously in practice) so the
 * chunking decision errs toward the safe side on memory-constrained
 * devices (spec formula, see task-7 brief). */
export function projectedRenderBytes(session: Session, sampleRate: number): number {
  const lengthWithTail = Math.max(session.length_seconds, 0) + TAIL_SECONDS;
  const trackFactor = session.tracks.length + 2; // per-track stereo buffers + master stereo buffer
  return 8 * sampleRate * lengthWithTail * trackFactor;
}

export interface ChunkPlan {
  /** Session-time the KEPT audio for this chunk starts at (ties exactly
   * to the previous chunk's `end` — chunks tile [0, lengthSeconds) with
   * no gaps or overlaps in [start, end)). */
  start: number;
  /** Session-time the actual OfflineAudioContext render begins at — a
   * `leadInSeconds` lookback (clamped to 0) so filter/comp/limiter state
   * has settled by the time playback reaches `start`. Equal to `start`
   * for the first chunk (nothing to look back into). */
  renderStart: number;
  /** Session-time this chunk's kept audio ends at (exclusive). */
  end: number;
}

/** Splits [0, lengthSeconds) into `chunkSeconds`-wide bodies (the last
 * one shorter if lengthSeconds doesn't divide evenly), each with a
 * `leadInSeconds` render lookback so DSP state has settled before the
 * kept audio begins. `start`/`end` tile the full duration with no gaps
 * or overlaps; `renderStart` is only ever used to decide how much extra
 * lead-in material a chunk render should include. */
export function planChunks(
  lengthSeconds: number,
  chunkSeconds = CHUNK_SECONDS,
  leadInSeconds = LEAD_IN_SECONDS,
): ChunkPlan[] {
  const chunks: ChunkPlan[] = [];
  if (lengthSeconds <= 0) return [{ start: 0, renderStart: 0, end: Math.max(lengthSeconds, 0) }];

  let start = 0;
  while (start < lengthSeconds) {
    const end = Math.min(start + chunkSeconds, lengthSeconds);
    const renderStart = start === 0 ? 0 : Math.max(0, start - leadInSeconds);
    chunks.push({ start, renderStart, end });
    start = end;
  }
  return chunks;
}

/** Joins per-chunk channel buffers with a `crossfadeSamples`-wide
 * equal-power crossfade at each seam. Each `chunks[i]` (except the
 * first) is expected to carry `crossfadeSamples` of material at its
 * HEAD that overlaps the TAIL of `chunks[i-1]` (renderMaster arranges
 * this by keeping the last `crossfadeSamples` of each chunk's discarded
 * lead-in rather than trimming it away entirely) — this function blends
 * that shared region rather than concatenating a hard cut, so a chunk
 * boundary never produces an audible click. Equal-power (cos/sin, not
 * linear) gains: outgoing = cos(t*pi/2), incoming = sin(t*pi/2), t in
 * [0,1] across the overlap — smooth (gain 1/0 -> 0/1) at both edges. */
export function spliceChunks(chunks: Float32Array[][], crossfadeSamples: number): Float32Array[] {
  if (chunks.length === 0) return [];
  const channelCount = chunks[0].length;
  if (chunks.length === 1) return chunks[0].map((c) => new Float32Array(c));

  const n = chunks.length;
  const lens = chunks.map((c) => c[0]?.length ?? 0);
  const fades = lens.map((len, i) => (i === 0 ? 0 : Math.max(0, Math.min(crossfadeSamples, len, lens[i - 1]))));

  // offsets[i] = output index where chunks[i]'s first sample lands.
  const offsets: number[] = [0];
  for (let i = 1; i < n; i++) offsets.push(offsets[i - 1] + lens[i - 1] - fades[i]);

  const totalLength = offsets[n - 1] + lens[n - 1];
  const out: Float32Array[] = Array.from({ length: channelCount }, () => new Float32Array(totalLength));

  for (let ch = 0; ch < channelCount; ch++) {
    const outCh = out[ch];

    // Chunk 0: write everything except the tail that will be blended
    // into chunk 1's crossfade (left as zeros here, filled below).
    outCh.set(chunks[0][ch].subarray(0, lens[0] - fades[1]), 0);

    for (let i = 1; i < n; i++) {
      const fade = fades[i];
      const prev = chunks[i - 1][ch];
      const cur = chunks[i][ch];
      const off = offsets[i];

      for (let p = 0; p < fade; p++) {
        const t = fade > 1 ? p / (fade - 1) : 1;
        const outGain = Math.cos((t * Math.PI) / 2);
        const inGain = Math.sin((t * Math.PI) / 2);
        const prevSample = prev[lens[i - 1] - fade + p];
        const curSample = cur[p];
        outCh[off + p] = prevSample * outGain + curSample * inGain;
      }

      const bodyStart = fade;
      const bodyEnd = i < n - 1 ? lens[i] - fades[i + 1] : lens[i];
      if (bodyEnd > bodyStart) outCh.set(cur.subarray(bodyStart, bodyEnd), off + bodyStart);
    }
  }

  return out;
}

/** Scans all channels for the absolute peak sample; if it exceeds 1.0
 * (digital overload), scales every sample by 1/peak so the export never
 * clips. Applied to NON-mastered exports only — the mastering chain's
 * look-ahead limiter already enforces its own ceiling, and re-scaling on
 * top of that would silently undo the user's loudness target. Mutates
 * `channels` in place. */
export function applyOverloadProtection(channels: Float32Array[]): void {
  let peak = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const abs = Math.abs(ch[i]);
      if (abs > peak) peak = abs;
    }
  }
  if (peak > 1) {
    const scale = 1 / peak;
    for (const ch of channels) {
      for (let i = 0; i < ch.length; i++) ch[i] *= scale;
    }
  }
}

function channelsToAudioBuffer(channels: Float32Array[], sampleRate: number): AudioBuffer {
  const length = Math.max(channels[0]?.length ?? 0, 1);
  const buffer = new AudioBuffer({ numberOfChannels: Math.max(channels.length, 1), length, sampleRate });
  channels.forEach((ch, i) => buffer.copyToChannel(ch, i));
  return buffer;
}

function audioBufferToChannels(buf: AudioBuffer): Float32Array[] {
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < buf.numberOfChannels; ch++) channels.push(new Float32Array(buf.getChannelData(ch)));
  return channels;
}

// ═══════════════════════════════════════════════════════════════════
// Impure rendering — needs Tone.Offline / a real (Offline)AudioContext.
// Not exercised by vitest (see masterChain.test.ts's precedent); verified
// via the manual smoke path in the task report.
// ═══════════════════════════════════════════════════════════════════

/** Renders session-time window [renderStart, end) and returns only the
 * samples from `keepFromSeconds` onward (>= renderStart) — the portion
 * before that is the discarded DSP-settling lead-in. `onDegraded` fires
 * (at most once per chunk) if mastering was requested but the chain had
 * to degrade (AudioWorklet unavailable). Every Tone node this function
 * builds is disposed before returning, so nothing from this chunk's
 * graph survives into the next render. */
async function renderWindow(
  session: Session,
  mastering: MasteringParams,
  renderStart: number,
  keepFromSeconds: number,
  end: number,
  sampleRate: number,
  onDegraded: () => void,
  preGainDb?: number,
): Promise<Float32Array[]> {
  const renderSeconds = Math.max(end - renderStart, 1 / sampleRate);
  const disposers: Array<() => void> = [];

  const toneBuffer = await Tone.Offline(async ({ transport, rawContext }) => {
    transport.bpm.value = session.tempo_bpm;
    transport.timeSignature = [session.time_signature.numerator, session.time_signature.denominator];

    const masterIn = new Tone.Gain(dbToGain(session.master.volume_db));
    const masterFx = buildFxChain(session.master.fx);
    masterIn.connect(masterFx.input);
    disposers.push(() => masterIn.dispose(), () => masterFx.dispose());

    if (mastering.enabled) {
      // See module header: Tone.Offline's rawContext takes the native
      // AudioWorkletNode constructor directly — no createWorkletNode
      // override (that's only needed for the LIVE standardized-audio-
      // context wrapper, see engine.ts's chainSync.build).
      const chain = await buildMasterChain(rawContext, mastering);
      if (chain.degraded) onDegraded();
      // Spec §3: "Export applies the settled gain" — thread the live
      // loudness servo's converged pre-limiter makeup gain into this
      // offline chain. setPreGainDb is a safe no-op when there's no
      // pregain stage (degraded chain — see chainTopology), so this is
      // unconditional rather than gated on `chain.degraded`.
      if (preGainDb !== undefined) chain.setPreGainDb(preGainDb);
      masterFx.output.connect(chain.input);
      chain.output.connect(rawContext.destination);
      disposers.push(() => chain.dispose());
    } else {
      masterFx.output.toDestination();
    }

    for (const tr of session.tracks) {
      const eng = buildTrack(tr, session.assets);
      eng.output.connect(masterIn);
      disposers.push(() => eng.dispose());
    }

    // transport.start(when, offset): start the offline clock immediately
    // (when=0, i.e. this render's sample 0) positioned at transport-time
    // `renderStart` — every clip/note scheduled at an absolute session
    // time >= renderStart lands at real-time (sessionTime - renderStart)
    // in the rendered buffer, which is exactly the window we asked for.
    transport.start(0, renderStart);
  }, renderSeconds, 2, sampleRate);

  const raw = toneBuffer.get() as AudioBuffer;
  const trimSamples = Math.max(0, Math.round((keepFromSeconds - renderStart) * sampleRate));
  const channels = audioBufferToChannels(raw).map((ch) => ch.slice(trimSamples));

  for (const d of disposers) {
    try { d(); } catch { /* best-effort — a chunk's graph is one-shot anyway */ }
  }

  return channels;
}

export interface RenderMasterOptions {
  mastering: boolean;
  onProgress: (f: number) => void;
  /** The loudness servo's settled pre-limiter makeup gain (dB), read
   * from the live master chain at export start (spec §3, "Export
   * applies the settled gain"). Defaults to 0 (unity) — a session that
   * never engaged the servo, or wasn't mastered live, exports flat. */
  preGainDb?: number;
  /** Fires (at most once) if mastering was requested but the chain had
   * to run in degraded (HPF/shelf/comp-only) mode. */
  onDegraded?: () => void;
  /** Which IndexedDB resume slot to use — defaults to 'wav'. mp3/wav
   * share the identical render (only the final encode step differs), so
   * callers exporting both from the same master render should pass a
   * consistent preset per invocation. */
  preset?: 'mp3' | 'wav';
  /** Attempt to resume a matching in-progress chunked render from
   * IndexedDB before rendering. Defaults to false (fresh render) — the
   * Export sheet decides whether to resume after checking
   * `hasResumableExport` and asking the user. */
  resume?: boolean;
}

/** Renders the full session (master bus, optionally through the
 * mastering chain) to a single AudioBuffer. Single-pass below the
 * ~150MB projected-memory threshold; chunked (45s bodies, 3s discarded
 * lead-in, 50ms equal-power splice) above it. Non-mastered output gets
 * Overload-Protection-Only normalization (scan peak, scale by 1/peak
 * only if >1) — mastered output relies on the limiter's own ceiling. */
export async function renderMaster(session: Session, opts: RenderMasterOptions): Promise<AudioBuffer> {
  const sampleRate = EXPORT_SAMPLE_RATE;
  const totalSeconds = Math.max(session.length_seconds + TAIL_SECONDS, 1);
  const mastering = opts.mastering
    ? withMasteringDefaults(session).master.mastering!
    : { ...DEFAULT_MASTERING, enabled: false };
  const preset = opts.preset ?? 'wav';

  let degradedFired = false;
  const onDegraded = () => {
    if (degradedFired) return;
    degradedFired = true;
    opts.onDegraded?.();
  };

  const projected = projectedRenderBytes(session, sampleRate);
  let resultChannels: Float32Array[];

  if (projected <= CHUNK_THRESHOLD_BYTES) {
    resultChannels = await renderWindow(session, mastering, 0, 0, totalSeconds, sampleRate, onDegraded, opts.preGainDb);
    opts.onProgress(1);
  } else {
    const plan = planChunks(totalSeconds, CHUNK_SECONDS, LEAD_IN_SECONDS);
    const crossfadeSamples = Math.round(CROSSFADE_SECONDS * sampleRate);

    let pieces: Float32Array[][] = [];
    let startIdx = 0;
    if (opts.resume) {
      const existing = await loadExportProgress(session.id, preset);
      if (existing && existing.totalChunks === plan.length && existing.sampleRate === sampleRate) {
        pieces = existing.pieces;
        startIdx = existing.chunkIdx;
      }
    }

    for (let i = startIdx; i < plan.length; i++) {
      const { start, renderStart, end } = plan[i];
      const keepFromSeconds = i === 0 ? start : start - crossfadeSamples / sampleRate;
      const piece = await renderWindow(session, mastering, renderStart, keepFromSeconds, end, sampleRate, onDegraded, opts.preGainDb);
      pieces.push(piece);
      await saveExportProgress({
        sessionId: session.id, preset, chunkIdx: i + 1, totalChunks: plan.length, sampleRate, pieces,
      });
      opts.onProgress((i + 1) / plan.length);
    }

    resultChannels = spliceChunks(pieces, crossfadeSamples);
    await clearExportProgress(session.id, preset);
  }

  if (!mastering.enabled) applyOverloadProtection(resultChannels);
  return channelsToAudioBuffer(resultChannels, sampleRate);
}

/** Renders each track in isolation (its own volume/pan/fx/eq — NO master
 * bus, NO mastering chain) to its own AudioBuffer, sequentially (one
 * OfflineAudioContext at a time, never in parallel — keeps peak memory to
 * a single track's graph). Always Overload-Protection-Only normalized,
 * since stems never pass through a limiter. */
export async function renderStems(
  session: Session,
  onProgress: (f: number) => void,
): Promise<Array<{ track: Track; buffer: AudioBuffer }>> {
  const sampleRate = EXPORT_SAMPLE_RATE;
  const totalSeconds = Math.max(session.length_seconds + TAIL_SECONDS, 1);
  const results: Array<{ track: Track; buffer: AudioBuffer }> = [];

  for (let i = 0; i < session.tracks.length; i++) {
    const track = session.tracks[i];
    const disposers: Array<() => void> = [];

    const toneBuffer = await Tone.Offline(({ transport }) => {
      transport.bpm.value = session.tempo_bpm;
      transport.timeSignature = [session.time_signature.numerator, session.time_signature.denominator];
      const eng = buildTrack(track, session.assets);
      eng.output.toDestination();
      disposers.push(() => eng.dispose());
      transport.start(0);
    }, totalSeconds, 2, sampleRate);

    const raw = toneBuffer.get() as AudioBuffer;
    const channels = audioBufferToChannels(raw);
    applyOverloadProtection(channels);
    results.push({ track, buffer: channelsToAudioBuffer(channels, sampleRate) });

    for (const d of disposers) {
      try { d(); } catch { /* one-shot graph */ }
    }
    onProgress((i + 1) / session.tracks.length);
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════
// IndexedDB resume — raw indexedDB API, no dependency. One record per
// (sessionId, preset): the completed chunk pieces + how far along the
// plan we got. Chunked renders only (single-pass finishes fast enough
// that persisting mid-render isn't worth the IndexedDB round-trips).
// ═══════════════════════════════════════════════════════════════════

const RESUME_DB_NAME = 'gw-export-progress';
const RESUME_STORE_NAME = 'gw-export-progress';
const RESUME_DB_VERSION = 1;

export interface ExportProgressRecord {
  sessionId: string;
  preset: 'mp3' | 'wav';
  chunkIdx: number;
  totalChunks: number;
  sampleRate: number;
  pieces: Float32Array[][];
}

function resumeKey(sessionId: string, preset: 'mp3' | 'wav'): string {
  return `${sessionId}:${preset}`;
}

function openResumeDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RESUME_DB_NAME, RESUME_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(RESUME_STORE_NAME)) {
        db.createObjectStore(RESUME_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveExportProgress(record: ExportProgressRecord): Promise<void> {
  const db = await openResumeDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RESUME_STORE_NAME, 'readwrite');
      tx.objectStore(RESUME_STORE_NAME).put({ id: resumeKey(record.sessionId, record.preset), ...record });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadExportProgress(sessionId: string, preset: 'mp3' | 'wav'): Promise<ExportProgressRecord | null> {
  const db = await openResumeDb();
  try {
    return await new Promise<ExportProgressRecord | null>((resolve, reject) => {
      const tx = db.transaction(RESUME_STORE_NAME, 'readonly');
      const req = tx.objectStore(RESUME_STORE_NAME).get(resumeKey(sessionId, preset));
      req.onsuccess = () => resolve((req.result as ExportProgressRecord | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function clearExportProgress(sessionId: string, preset: 'mp3' | 'wav'): Promise<void> {
  const db = await openResumeDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(RESUME_STORE_NAME, 'readwrite');
      tx.objectStore(RESUME_STORE_NAME).delete(resumeKey(sessionId, preset));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** UI helper: does a resumable record exist for this session+preset? The
 * Export sheet calls this to decide whether to offer a "Resume" action
 * before starting a fresh render. `preset` here follows the same
 * mp3/wav resume-slot convention as RenderMasterOptions — stems never
 * persist progress (they're not chunked). */
export async function hasResumableExport(sessionId: string, preset: 'mp3' | 'wav'): Promise<boolean> {
  if (typeof indexedDB === 'undefined') return false;
  try {
    return (await loadExportProgress(sessionId, preset)) !== null;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Preset orchestration — the single entry point the Export sheet calls.
// ═══════════════════════════════════════════════════════════════════

export type ExportPreset = 'mp3' | 'wav' | 'stems';

export interface ExportFile {
  filename: string;
  blob: Blob;
}

/** `01 — Soprano.wav` — index (1-based, zero-padded) + em-dash + track
 * name + extension. Track names are free text (unicode, emoji, stray
 * punctuation from a singer's own naming) so this strips to letters/
 * numbers/space/dash/underscore/em-dash the same way the take-export
 * filename sanitizer in StudioEditor.tsx does, falling back to "Track"
 * if a name sanitizes away to nothing. */
export function stemFilename(index: number, trackName: string, ext: string): string {
  const idx = String(index + 1).padStart(2, '0');
  const safeName = trackName.replace(/[^\p{L}\p{N}\s—_-]+/gu, '').trim();
  return `${idx} — ${safeName || 'Track'}.${ext}`;
}

function sanitizeSessionTitle(title: string): string {
  const safe = title.replace(/[^\p{L}\p{N}\s—_-]+/gu, '').trim();
  return safe || 'session';
}

export interface ExportSessionOptions {
  mastering: boolean;
  onProgress: (f: number) => void;
  onDegraded?: () => void;
  resume?: boolean;
  /** See RenderMasterOptions.preGainDb — ignored for `stems` (stems never
   * run through the master chain). */
  preGainDb?: number;
}

/** Renders `preset` and returns the file(s) ready to download. `stems`
 * ignores `mastering`/`resume`/`preGainDb` (stems never run through the
 * master chain and are never chunked). */
export async function exportSession(
  session: Session,
  preset: ExportPreset,
  opts: ExportSessionOptions,
): Promise<ExportFile[]> {
  if (preset === 'stems') {
    const stems = await renderStems(session, opts.onProgress);
    return stems.map(({ track, buffer }, i) => ({
      filename: stemFilename(i, track.name, 'wav'),
      blob: audioBufferToWavBlob(buffer),
    }));
  }

  const buffer = await renderMaster(session, {
    mastering: opts.mastering,
    onProgress: opts.onProgress,
    onDegraded: opts.onDegraded,
    preset,
    resume: opts.resume,
    preGainDb: opts.preGainDb,
  });

  const title = sanitizeSessionTitle(session.title);
  if (preset === 'mp3') {
    const channels = [buffer.getChannelData(0), buffer.getChannelData(buffer.numberOfChannels > 1 ? 1 : 0)];
    const blob = await encodeMp3(channels, buffer.sampleRate, 320);
    return [{ filename: `${title}.mp3`, blob }];
  }

  return [{ filename: `${title}.wav`, blob: audioBufferToWavBlob(buffer) }];
}
