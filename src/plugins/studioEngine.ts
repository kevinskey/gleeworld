// TypeScript bridge for the iOS StudioEnginePlugin (AVAudioEngine).
// Mirror image of the web-side StudioEngine (src/lib/studio/engine/engine.ts).
//
// Outside Capacitor iOS the bridge is unavailable — the web editor
// uses the Tone.js engine instead. The platform switch lives in
// src/hooks/useStudio.ts.

import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { Session, AudioAsset } from '@/lib/studio/session';

export interface NativeEngineState {
  isReady: boolean;
  isPlaying: boolean;
  positionSeconds: number;
  tempoBpm: number;
  metronomeOn: boolean;
}

interface StudioEnginePluginShape {
  start(): Promise<void>;
  stopEngine(): Promise<void>;
  loadSession(args: { session: Session; assetUrls: Record<string, string> }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seek(args: { seconds: number }): Promise<void>;
  updateStrip(args: { trackId: string; volumeDb?: number; pan?: number; mute?: boolean; solo?: boolean }): Promise<void>;
  // Live FX-parameter update — apply a changed effect's params without a
  // full engine rebuild. Omit trackId to target the master bus. `fx` is the
  // full updated FxNode.
  setFxParam(args: { trackId?: string; fx: unknown }): Promise<void>;
  // Pre-arm the .playAndRecord audio session before the count-in so
  // recordStart doesn't pay the category-flip latency mid-groove.
  prepareRecordSession(): Promise<void>;
  updateTempo(args: { bpm: number }): Promise<void>;
  setMetronome(args: { on?: boolean; volumeDb?: number }): Promise<void>;
  // One immediate click — drives the JS count-in pre-roll on iOS.
  clickOnce(args: { accent: boolean }): Promise<void>;
  // Persist a finalized (latency-trimmed) take to the app tmp dir and
  // return a file:// URL the native engine can open with AVAudioFile.
  saveFinalizedTake(args: { base64: string; filename?: string }): Promise<{ localUrl: string }>;
  recordStart(): Promise<void>;
  // Count-in clicks + recorder start + transport start on one native
  // clock. Resolves at grid start (recorder rolling, transport playing).
  recordWithCountIn(args: { countInBeats: number; secondsPerBeat: number; beatsPerBar: number }): Promise<{ gridStartedAtMs: number }>;
  recordStop(): Promise<{ localUrl: string; filename: string }>;
  // --- External-source coexistence record mode (Part Tracks, iOS) ---
  // Capture the mic OVER an external backing source (Apple Music / YouTube
  // / uploaded file) that keeps playing. Runs on a DEDICATED AVAudioEngine,
  // so Studio's record path + exclusive-focus session are never touched.
  //
  // prepareExternalRecordSession: configure the AVAudioSession for
  // coexistence — UNLESS MusicKit owns it (musicKitOwnsSession), in which
  // case the session is left completely untouched (any category change
  // interrupts MPMusicPlayerController playback). Resolves `sessionConfigured`
  // = false in the MusicKit case, true when we reconfigured the session.
  //
  // MUSICKIT CAVEAT: when sessionConfigured is false, nothing has made the
  // session record-capable. The mic tap only delivers audio if a
  // record-capable session (.playAndRecord) was already in place BEFORE
  // MusicKit playback started; otherwise externalRecordStart's watchdog
  // rejects with "no input buffers delivered" after ~1.5s. Callers on the
  // Apple Music path must either establish the record session up front
  // (before starting MusicKit playback) or fall back to web capture when
  // sessionConfigured is false and externalRecordStart rejects.
  prepareExternalRecordSession(args: {
    mixWithOthers?: boolean;
    musicKitOwnsSession: boolean;
  }): Promise<{ sessionConfigured: boolean }>;
  // externalRecordStart: native count-in clicks then start capture on the
  // dedicated engine. Resolves AFTER count-in completes and the FIRST input
  // buffer has arrived (capture demonstrably rolling — a dead input rejects
  // via a 1.5s watchdog instead of resolving). `startedAtEpochMs` = epoch of
  // the first captured sample, back-computed from that buffer's host time;
  // `hardwareLatencyMs` = input+output+ioBuffer.
  externalRecordStart(args: {
    countInBeats: number;
    secondsPerBeat: number;
    clickVolume?: number;
  }): Promise<{ startedAtEpochMs: number; hardwareLatencyMs: number }>;
  // externalRecordStop: stop the dedicated capture, close the WAV, and
  // return a file:// URI (readable via Capacitor Filesystem) + duration.
  // NOTE (Task 4): the WAV is written in the input node's native channel
  // count — usually mono, but multi-channel interfaces (USB, some BT) can
  // yield N-channel WAVs. Decode-side code must not assume 1 channel.
  externalRecordStop(): Promise<{ fileUri: string; durationSec: number }>;
  // Env-gated debug self-test — also directly invokable for on-device
  // verification (Debug builds only; rejects in release). Runs the
  // external-record cycle then Studio's own prepareRecordSession flip and
  // asserts the resulting category/mode to prove no cross-contamination.
  externalRecordSelfTest(): Promise<{
    ok: boolean;
    note: string;
    hardwareLatencyMs: number;
    studioPrepareRecordSessionOk: boolean;
    studioCategoryAfterFlip: string;
    studioModeAfterFlip: string;
  }>;
  // --- Task 5: Headphone/bleed guard ---
  // Read the current AVAudioSession output route so the record flow (both
  // Studio and Part Tracks) can decide whether to warn that a backing
  // track will bleed into an open mic. `outputs` are the raw
  // AVAudioSession.Port rawValues for every port in
  // `currentRoute.outputs` (e.g. "Headphones", "Speaker",
  // "BluetoothA2DPOutput") — see `classifyRouteOutputs` below for how
  // they're interpreted into `isHeadphones`.
  getAudioRoute(): Promise<{ outputs: string[]; isHeadphones: boolean }>;
  mixdown(): Promise<{ localUrl: string; filename: string }>;
  // Splice a single clip onto a live track — pairs with useStudio's diff
  // path so a fresh recording doesn't trigger a full engine teardown.
  // `localUrl` may be capacitor:// (post-convertFileSrc) or a file:// path;
  // the plugin normalizes either to an AVAudioFile-readable path.
  addClipToTrack(args: { trackId: string; clip: unknown; localUrl: string }): Promise<void>;
  removeClipFromTrack(args: { trackId: string; clipId: string }): Promise<void>;
  // Hardware round-trip latency (input + output + ioBuffer) in ms. Used
  // by the recording layer to align captured audio with scheduled clicks.
  getHardwareLatencyMs(): Promise<{ ms: number }>;
  // Pull-renderer A/B toggle. When on, the iOS engine routes new
  // clips through an AVAudioSourceNode render block (lock-free mix).
  // Default off — push-path (AVAudioPlayerNode) remains active.
  setPullRendererEnabled(args: { on: boolean }): Promise<{ on: boolean }>;
  isPullRendererEnabled(): Promise<{ on: boolean }>;
  // Eagerly decode every asset on the supplied list into Float32 PCM
  // in the LRU cache. Matches Logic Pro's session-open warmup so the
  // first Play after load has zero disk I/O on the audio thread.
  // Resolves immediately with the queued count — decodes finish in
  // the background (up to 4 in parallel).
  prewarmAssets(args: { assets: Array<{ assetId: string; localPath: string }> }): Promise<{ queued: number }>;
  // API-shape aliases — flatter params and a separate latencyMs return
  // key for clients that prefer the linear-volume / flat-clip surface.
  // Backed by the same engine internals as the canonical methods.
  updateTrackVolume(args: { trackId: string; volume: number }): Promise<void>;
  injectNewClip(args: {
    trackId: string;
    clipId: string;
    localPath: string;
    startSeconds: number;
    offsetSeconds?: number;
  }): Promise<void>;
  getHardwareLatency(): Promise<{ latencyMs: number }>;
  addListener(eventName: 'state', listener: (s: NativeEngineState) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'recordPeak', listener: (e: { db: number }) => void): Promise<PluginListenerHandle>;
  // Live mic peaks (~30Hz, dBFS) from the external-source coexistence
  // recorder — a SEPARATE event from 'recordPeak' so Part Tracks can draw
  // its waveform without colliding with Studio's peak listener.
  addListener(eventName: 'externalRecordPeak', listener: (e: { db: number }) => void): Promise<PluginListenerHandle>;
}

const Native = registerPlugin<StudioEnginePluginShape>('StudioEngine');

export function isNativeStudioAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/** Convenience wrapper: open the engine + load the session + pre-warm
 *  asset signed URLs. Returns an unsubscribe function for the state
 *  listener. The caller passes a Map of asset_id → signed URL produced
 *  via supabase.storage.createSignedUrl(); the native side downloads
 *  each one on demand. */
export async function openNativeStudio(args: {
  session: Session;
  assets: AudioAsset[];
  resolveUrl: (asset: AudioAsset) => Promise<string>;
  onState: (s: NativeEngineState) => void;
}): Promise<() => Promise<void>> {
  await Native.start();
  // Pre-resolve all signed URLs concurrently. The native side asks for
  // them by asset_id when it needs to decode a clip.
  const urlEntries = await Promise.all(
    args.assets.map(async (a) => [a.id, await args.resolveUrl(a)] as const),
  );
  const assetUrls: Record<string, string> = {};
  for (const [k, v] of urlEntries) assetUrls[k] = v;

  await Native.loadSession({ session: args.session, assetUrls });
  const handle = await Native.addListener('state', args.onState);

  return async () => {
    await handle.remove();
    await Native.stopEngine();
  };
}

export const NativeStudio = Native;

// ── Task 5: Headphone/bleed guard (native route classification) ───────

/** AVAudioSession.Port raw values that count as "private listening" for
 * the headphone/bleed guard — wired headphones/earbuds, a Bluetooth
 * headset/earbuds/speaker-in-hand, a USB audio interface (assumed to be
 * feeding headphones, matching Studio's existing latency-calibration
 * assumption), or CarPlay/car audio (cabin listening, not a room mic
 * picking up a loudspeaker). `builtInSpeaker`/`builtInReceiver` and
 * anything unrecognized are NOT included, so they read as "not
 * headphones" — the conservative choice for a bleed warning.
 *
 * Exported + pure so the mapping is unit-testable without a device —
 * the actual route read (`StudioEnginePlugin.swift`'s `getAudioRoute`)
 * isn't covered by this repo's vitest suite. `getNativeAudioRoute` below
 * ORs this against the native `isHeadphones` field, so a naming drift
 * between the two implementations still resolves to "show the warning"
 * rather than silently suppressing it. */
const HEADPHONE_ISH_PORT_TYPES = new Set<string>([
  'Headphones',
  'BluetoothA2DPOutput',
  'BluetoothHFP',
  'BluetoothLE',
  'USBAudio',
  'CarAudio',
]);

/** Pure classification: does this list of AVAudioSession port-type raw
 * values (as returned by `getAudioRoute`'s `outputs`) indicate private
 * (headphone-ish) listening? */
export function classifyRouteOutputs(outputs: string[]): boolean {
  return outputs.some((o) => HEADPHONE_ISH_PORT_TYPES.has(o));
}

/** Read the current AVAudioSession output route on iOS. Returns `null`
 * off iOS — callers fall back to the web heuristic,
 * `getLikelyAudioRoute` in `src/lib/audio/sharedRecorder.ts`. */
export async function getNativeAudioRoute(): Promise<{ outputs: string[]; isHeadphones: boolean } | null> {
  if (!isNativeStudioAvailable()) return null;
  const route = await Native.getAudioRoute();
  return {
    outputs: route.outputs,
    isHeadphones: route.isHeadphones || classifyRouteOutputs(route.outputs),
  };
}
