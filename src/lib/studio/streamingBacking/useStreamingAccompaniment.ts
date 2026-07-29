import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  isNativeMusicKitAvailable, nmkRequestAuthorization, nmkSetQueueSong,
  nmkSetQueueAlbum, nmkPlay, nmkPause, nmkStop, nmkSeek, nmkWaitForPlaying,
} from '@/plugins/nativeMusicKit';
import { extractYouTubeVideoId } from '@/utils/youtubeUtils';
import type { Accompaniment } from '@/lib/studio/session';

export interface StreamingAccompanimentHandle {
  start(positionSec: number): Promise<{ backingAudibleWallMs: number }>;
  stop(): void;
  setVolume(volume: number, muted: boolean): void;
  /**
   * Returns true immediately for all streaming sources. start() already
   * awaits internal readiness (native: nmkWaitForPlaying; web: waitForAppleMusicPlaying),
   * so callers doing `await start(); await waitForPlaying()` never double-wait.
   * Kept in the interface as a compatibility surface.
   */
  waitForPlaying(): Promise<boolean>;
  /** Present only for YouTube; parent sets on the <iframe> ref. */
  ytIframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
}

/**
 * Port of waitForAppleMusicPlaying from the retired PartTracksStudio (deleted 2026-07-29).
 * Polls kit.player?.playbackState ?? kit.playbackState for === 2 (Playing),
 * listening on 'playbackStateDidChange'. Resolves false if timeoutMs elapses.
 */
function waitForAppleMusicPlaying(kit: any, timeoutMs = 6000): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const state = () => kit.player?.playbackState ?? kit.playbackState;
    if (state() === 2) return resolve(true);
    let done = false;
    const handler = () => {
      if (done) return;
      if (state() === 2) {
        done = true;
        try { kit.removeEventListener?.('playbackStateDidChange', handler); } catch {}
        resolve(true);
      }
    };
    try { kit.addEventListener?.('playbackStateDidChange', handler); } catch {}
    // Safety timeout — never block the recorder forever.
    setTimeout(() => {
      if (done) return;
      done = true;
      try { kit.removeEventListener?.('playbackStateDidChange', handler); } catch {}
      resolve(false);
    }, timeoutMs);
  });
}

export function useStreamingAccompaniment(
  accompaniment: Accompaniment | null | undefined,
): StreamingAccompanimentHandle {
  const appleMusicRef = useRef<any>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

  const start = useCallback(async (positionSec: number) => {
    const audibleAt = () => performance.now();
    if (!accompaniment) return { backingAudibleWallMs: audibleAt() };

    if (accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album') {
      const isAlbum = accompaniment.kind === 'apple_music_album';
      const id = accompaniment.appleMusicId;

      // On iOS, prefer the native MusicKit plugin. It uses
      // MPMusicPlayerController.applicationMusicPlayer instead of MusicKit JS
      // in WKWebView — no more script-load races, no auth popup blocked by the
      // OS, and a synchronously-pausable player.
      if (isNativeMusicKitAvailable()) {
        try {
          const auth = await nmkRequestAuthorization();
          if (!auth.authorized) {
            toast.error('Apple Music access denied. Enable Music access in Settings → GleeWorld.');
            return { backingAudibleWallMs: audibleAt() };
          }
          if (isAlbum) await nmkSetQueueAlbum(id);
          else await nmkSetQueueSong(id);
          if (positionSec > 0.05) await nmkSeek(positionSec);
          await nmkPlay();
          const reached = await nmkWaitForPlaying();
          if (!reached) {
            toast.warning('Apple Music did not start playing in time. Your take may record over silence.');
          }
        } catch (e: any) {
          console.error('[StreamingAccompaniment] Native MusicKit start failed', e);
          toast.error(e?.message ?? 'Apple Music playback failed.');
          return { backingAudibleWallMs: audibleAt() };
        }
        return { backingAudibleWallMs: audibleAt() };
      }

      // Web fallback — MusicKit JS shim.
      try {
        const { getMusicKit, authorizeAppleMusic, isAppleMusicAuthorized } = await import('@/lib/musicKit');
        const kit = await getMusicKit();
        appleMusicRef.current = kit;
        if (!(await isAppleMusicAuthorized())) await authorizeAppleMusic();
        await kit.setQueue(isAlbum ? { album: id } : { song: id });
        if (positionSec > 0.05) {
          try { await (kit.seekToTime?.(positionSec) ?? kit.player?.seekToTime?.(positionSec)); } catch {}
        }
        await kit.play();
        const reached = await waitForAppleMusicPlaying(kit);
        if (!reached) {
          toast.warning('Apple Music did not start playing in time. Your take may record over silence — check your Apple Music sign-in.');
        }
      } catch (e: any) {
        toast.error('Apple Music playback failed — sign in required.');
      }
      return { backingAudibleWallMs: audibleAt() };
    }

    if (accompaniment.kind === 'youtube') {
      const id = extractYouTubeVideoId(accompaniment.youtubeUrl);
      const win = ytIframeRef.current?.contentWindow;
      if (!id || !win) return { backingAudibleWallMs: audibleAt() };
      try {
        win.postMessage(JSON.stringify({ event: 'listening' }), 'https://www.youtube.com');
        if (positionSec > 0.05) {
          win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [positionSec, true] }), 'https://www.youtube.com');
        }
        win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), 'https://www.youtube.com');
      } catch {}
      // YouTube's iframe is best-effort — no reliable "playing now" event from
      // a hidden iframe, so we eat ~500ms to let buffering settle before the
      // mic rolls. backingAudibleWallMs is captured AFTER the sleep so it
      // corresponds to actual audible output rather than the moment we posted.
      await new Promise((r) => setTimeout(r, 500));
      return { backingAudibleWallMs: performance.now() };
    }

    return { backingAudibleWallMs: audibleAt() };
  }, [accompaniment]);

  const stop = useCallback(() => {
    // Runs every teardown branch unconditionally — matches stopExternalAccompaniment
    // pattern from the retired PartTracksStudio (deleted 2026-07-29). Intentionally NOT gated on `accompaniment`; if the
    // parent sets accompaniment to null mid-play (e.g., detached the backing),
    // the still-playing streaming source must still be torn down. Cheap and
    // idempotent: each branch is a small set of guarded plugin calls with
    // individual try/catches, so firing them for a source that wasn't playing is a no-op.

    // Native MusicKit path — synchronously-pausable on iOS, no race with the
    // JS shim. Seek-to-zero so the next start() begins at 0.
    if (isNativeMusicKitAvailable()) {
      void nmkPause();
      void nmkStop();
      void nmkSeek(0);
    }

    // Web MusicKit fallback. MusicKit v3 splits controls between kit.player
    // and the older kit surface. Try both, then stop + seek-to-0 so the next
    // Play starts fresh instead of resuming mid-song.
    const kit = appleMusicRef.current;
    if (kit) {
      try { kit.player?.pause?.(); } catch {}
      try { kit.pause?.(); } catch {}
      try { kit.player?.stop?.(); } catch {}
      try { kit.stop?.(); } catch {}
      try { kit.player?.seekToTime?.(0); } catch {}
      try { kit.seekToTime?.(0); } catch {}
    }

    // YouTube: pause then seek to zero so next play starts fresh.
    const win = ytIframeRef.current?.contentWindow;
    if (win) {
      try {
        win.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), 'https://www.youtube.com');
        win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }), 'https://www.youtube.com');
      } catch {}
    }
  }, []);

  const setVolume = useCallback((_volume: number, _muted: boolean) => {
    // Streaming sources own their own volume; the mixer strip for the
    // Accompaniment lane is a passive display when kind is streaming.
    // Left as a no-op for now — extend if the mixer wires it up.
  }, []);

  // start() already awaits internal readiness for all streaming source types
  // (native: nmkWaitForPlaying; web Apple Music: waitForAppleMusicPlaying;
  // YouTube: 500ms settle). This method is a no-op returning true immediately,
  // kept in the interface as a compatibility surface for callers that sequence
  // `await start(); await waitForPlaying()`.
  const waitForPlaying = useCallback(async () => true, []);

  return { start, stop, setVolume, waitForPlaying, ytIframeRef };
}
