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
  recordStop(): Promise<{ localUrl: string; filename: string }>;
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
