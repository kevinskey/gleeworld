// TypeScript bridge for the iOS NativeMusicKitPlugin.
//
// On iOS Capacitor, this routes Apple Music playback through
// MPMusicPlayerController.applicationMusicPlayer (no auth popup
// races, no DRM webview hiccups, no 6-second playbackState wait).
// On web it stays unavailable so the caller falls back to MusicKit JS.

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export type NativeMusicState =
  | 'stopped' | 'playing' | 'paused' | 'interrupted'
  | 'seekingForward' | 'seekingBackward' | 'unknown';

export interface NativeMusicAuthorization {
  authorized: boolean;
  status: 'authorized' | 'denied' | 'restricted' | 'notDetermined' | 'unknown';
}

export interface NativeMusicState_ {
  state: NativeMusicState;
  currentTime: number;
  duration: number;
  nowPlayingTitle: string;
  nowPlayingArtist: string;
}

interface NativeMusicKitPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(): Promise<NativeMusicAuthorization>;
  setQueueWithSongId(opts: { id: string }): Promise<void>;
  setQueueWithAlbumId(opts: { id: string }): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  seekTo(opts: { seconds: number }): Promise<void>;
  setVolume(opts: { volume: number }): Promise<{ supported: boolean }>;
  getState(): Promise<NativeMusicState_>;
  addListener(
    event: 'playbackStateChanged' | 'playbackTimeChanged' | 'nowPlayingItemChanged',
    callback: (data: any) => void,
  ): Promise<PluginListenerHandle>;
}

const Native = registerPlugin<NativeMusicKitPlugin>('NativeMusicKit');

export function isNativeMusicKitAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

export async function nmkRequestAuthorization(): Promise<NativeMusicAuthorization> {
  if (!isNativeMusicKitAvailable()) {
    return { authorized: false, status: 'unknown' };
  }
  return Native.requestAuthorization();
}

export async function nmkSetQueueSong(id: string): Promise<void> {
  if (!isNativeMusicKitAvailable()) return;
  await Native.setQueueWithSongId({ id });
}

export async function nmkSetQueueAlbum(id: string): Promise<void> {
  if (!isNativeMusicKitAvailable()) return;
  await Native.setQueueWithAlbumId({ id });
}

export async function nmkPlay(): Promise<void> {
  if (!isNativeMusicKitAvailable()) return;
  await Native.play();
}

export async function nmkPause(): Promise<void> {
  if (!isNativeMusicKitAvailable()) return;
  await Native.pause();
}

export async function nmkStop(): Promise<void> {
  if (!isNativeMusicKitAvailable()) return;
  await Native.stop();
}

export async function nmkSeek(seconds: number): Promise<void> {
  if (!isNativeMusicKitAvailable()) return;
  await Native.seekTo({ seconds });
}

export async function nmkGetState(): Promise<NativeMusicState_ | null> {
  if (!isNativeMusicKitAvailable()) return null;
  return Native.getState();
}

/** Resolves true once the player reports `state === 'playing'`, or after
 *  `timeoutMs` regardless. Mirrors the JS MusicKit JS waitForPlaying we
 *  use to anchor the recorder. */
export async function nmkWaitForPlaying(timeoutMs = 6000): Promise<boolean> {
  if (!isNativeMusicKitAvailable()) return false;
  const state = await Native.getState();
  if (state.state === 'playing') return true;
  return new Promise<boolean>((resolve) => {
    let done = false;
    let handle: PluginListenerHandle | null = null;
    Native.addListener('playbackStateChanged', (data: { state: NativeMusicState }) => {
      if (done) return;
      if (data?.state === 'playing') {
        done = true;
        try { handle?.remove(); } catch { /* ignore */ }
        resolve(true);
      }
    }).then((h) => { handle = h; if (done) try { h.remove(); } catch {} });
    setTimeout(() => {
      if (done) return;
      done = true;
      try { handle?.remove(); } catch { /* ignore */ }
      resolve(false);
    }, timeoutMs);
  });
}
