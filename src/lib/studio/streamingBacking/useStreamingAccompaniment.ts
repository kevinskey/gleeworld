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
  waitForPlaying(): Promise<boolean>;
  /** Present only for YouTube; parent sets on the <iframe> ref. */
  ytIframeRef: React.MutableRefObject<HTMLIFrameElement | null>;
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
      if (isNativeMusicKitAvailable()) {
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
        if (!reached) toast.warning('Apple Music did not start playing in time.');
        return { backingAudibleWallMs: audibleAt() };
      }
      // Web MusicKit JS fallback
      const { getMusicKit, authorizeAppleMusic, isAppleMusicAuthorized } = await import('@/lib/musicKit');
      const kit = await getMusicKit();
      appleMusicRef.current = kit;
      if (!(await isAppleMusicAuthorized())) await authorizeAppleMusic();
      await kit.setQueue(isAlbum ? { album: id } : { song: id });
      if (positionSec > 0.05) {
        try { await (kit.seekToTime?.(positionSec) ?? kit.player?.seekToTime?.(positionSec)); } catch { /* ignore */ }
      }
      await kit.play();
      return { backingAudibleWallMs: audibleAt() };
    }

    if (accompaniment.kind === 'youtube') {
      const id = extractYouTubeVideoId(accompaniment.youtubeUrl);
      const win = ytIframeRef.current?.contentWindow;
      if (!id || !win) return { backingAudibleWallMs: audibleAt() };
      win.postMessage(JSON.stringify({ event: 'listening' }), 'https://www.youtube.com');
      if (positionSec > 0.05) {
        win.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [positionSec, true] }), 'https://www.youtube.com');
      }
      win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), 'https://www.youtube.com');
      return { backingAudibleWallMs: audibleAt() };
    }

    return { backingAudibleWallMs: audibleAt() };
  }, [accompaniment]);

  const stop = useCallback(() => {
    if (!accompaniment) return;
    if (accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album') {
      if (isNativeMusicKitAvailable()) {
        void nmkPause().catch(() => { /* ignore */ });
        void nmkStop().catch(() => { /* ignore */ });
        return;
      }
      try { appleMusicRef.current?.pause?.(); } catch { /* ignore */ }
      try { appleMusicRef.current?.stop?.(); } catch { /* ignore */ }
      appleMusicRef.current = null;
      return;
    }
    if (accompaniment.kind === 'youtube') {
      const win = ytIframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), 'https://www.youtube.com');
      }
    }
  }, [accompaniment]);

  const setVolume = useCallback((_volume: number, _muted: boolean) => {
    // Streaming sources own their own volume; the mixer strip for the
    // Accompaniment lane is a passive display when kind is streaming.
    // Left as a no-op for now — extend if the mixer wires it up.
  }, []);

  const waitForPlaying = useCallback(async () => {
    if (!accompaniment) return true;
    if (accompaniment.kind === 'apple_music' || accompaniment.kind === 'apple_music_album') {
      if (isNativeMusicKitAvailable()) return nmkWaitForPlaying();
    }
    return true;
  }, [accompaniment]);

  return { start, stop, setVolume, waitForPlaying, ytIframeRef };
}
