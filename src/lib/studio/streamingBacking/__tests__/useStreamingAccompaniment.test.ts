// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStreamingAccompaniment } from '../useStreamingAccompaniment';

vi.mock('@/plugins/nativeMusicKit', () => ({
  isNativeMusicKitAvailable: vi.fn(() => false),
  nmkRequestAuthorization: vi.fn(),
  nmkSetQueueSong: vi.fn(),
  nmkSetQueueAlbum: vi.fn(),
  nmkPlay: vi.fn(),
  nmkPause: vi.fn(),
  nmkStop: vi.fn(),
  nmkSeek: vi.fn(),
  nmkWaitForPlaying: vi.fn(async () => true),
}));

vi.mock('@/lib/musicKit', () => ({
  getMusicKit: vi.fn(),
  authorizeAppleMusic: vi.fn(),
  isAppleMusicAuthorized: vi.fn(async () => true),
}));

describe('useStreamingAccompaniment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('start() is a no-op when accompaniment is null', async () => {
    const { result } = renderHook(() => useStreamingAccompaniment(null));
    await act(async () => {
      const r = await result.current.start(0);
      expect(r.backingAudibleWallMs).toBeGreaterThan(0);
    });
    // No plugin calls
    const nmk = await import('@/plugins/nativeMusicKit');
    expect(nmk.nmkPlay).not.toHaveBeenCalled();
  });

  describe('YouTube', () => {
    it('start() posts listening, seekTo, and playVideo through the iframe ref', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() =>
        useStreamingAccompaniment({
          kind: 'youtube',
          title: null,
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      );
      const post = vi.fn();
      result.current.ytIframeRef.current = { contentWindow: { postMessage: post } } as unknown as HTMLIFrameElement;

      let startPromise: Promise<any>;
      act(() => {
        startPromise = result.current.start(4);
        vi.runAllTimers();
      });
      await act(async () => { await startPromise; });

      // Three postMessage calls: listening, seekTo, playVideo
      expect(post).toHaveBeenCalledTimes(3);
      const calls = post.mock.calls.map((c) => JSON.parse(c[0] as string));
      expect(calls.find((c: any) => c.event === 'listening')).toBeTruthy();
      const seekCall = calls.find((c: any) => c.func === 'seekTo');
      expect(seekCall).toBeTruthy();
      expect(seekCall.args).toEqual([4, true]);
      expect(calls.find((c: any) => c.func === 'playVideo')).toBeTruthy();
      vi.useRealTimers();
    });

    it('stop() posts pauseVideo then seekTo 0', () => {
      const { result } = renderHook(() =>
        useStreamingAccompaniment({
          kind: 'youtube',
          title: null,
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      );
      const post = vi.fn();
      result.current.ytIframeRef.current = { contentWindow: { postMessage: post } } as unknown as HTMLIFrameElement;

      act(() => { result.current.stop(); });

      const calls = post.mock.calls.map((c) => JSON.parse(c[0] as string));
      const pauseIdx = calls.findIndex((c: any) => c.func === 'pauseVideo');
      const seekIdx = calls.findIndex((c: any) => c.func === 'seekTo');
      expect(pauseIdx).toBeGreaterThanOrEqual(0);
      expect(seekIdx).toBeGreaterThan(pauseIdx);
      const seekCall = calls[seekIdx];
      expect(seekCall.args).toEqual([0, true]);
    });
  });

  describe('Apple Music — iOS native path', () => {
    it('start() routes through the native plugin and waits for playing', async () => {
      const nmk = await import('@/plugins/nativeMusicKit');
      (nmk.isNativeMusicKitAvailable as any).mockReturnValue(true);
      (nmk.nmkRequestAuthorization as any).mockResolvedValue({ authorized: true });
      (nmk.nmkPlay as any).mockResolvedValue(undefined);
      (nmk.nmkWaitForPlaying as any).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useStreamingAccompaniment({
          kind: 'apple_music',
          title: null,
          appleMusicId: 'abc',
          appleMusicStorefront: 'us',
          appleMusicArtist: null,
          appleMusicArtworkUrl: null,
        }),
      );
      await act(async () => {
        await result.current.start(0);
      });
      expect(nmk.nmkSetQueueSong).toHaveBeenCalledWith('abc');
      expect(nmk.nmkPlay).toHaveBeenCalled();
      expect(nmk.nmkWaitForPlaying).toHaveBeenCalled();
    });

    it('stop() calls nmkStop then nmkSeek(0) on native path', async () => {
      const nmk = await import('@/plugins/nativeMusicKit');
      (nmk.isNativeMusicKitAvailable as any).mockReturnValue(true);
      (nmk.nmkPause as any).mockResolvedValue(undefined);
      (nmk.nmkStop as any).mockResolvedValue(undefined);
      (nmk.nmkSeek as any).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useStreamingAccompaniment({
          kind: 'apple_music',
          title: null,
          appleMusicId: 'abc',
          appleMusicStorefront: 'us',
          appleMusicArtist: null,
          appleMusicArtworkUrl: null,
        }),
      );
      act(() => { result.current.stop(); });

      expect(nmk.nmkStop).toHaveBeenCalled();
      // nmkSeek(0) must be called AFTER nmkStop
      const stopOrder = (nmk.nmkStop as any).mock.invocationCallOrder[0];
      const seekOrder = (nmk.nmkSeek as any).mock.invocationCallOrder[0];
      expect(seekOrder).toBeGreaterThan(stopOrder);
      expect(nmk.nmkSeek).toHaveBeenCalledWith(0);
    });
  });

  describe('stop() is unconditional (accompaniment-null guard removed)', () => {
    it('still tears down when accompaniment has been set to null mid-play', async () => {
      const nmk = await import('@/plugins/nativeMusicKit');
      (nmk.isNativeMusicKitAvailable as any).mockReturnValue(true);
      (nmk.nmkRequestAuthorization as any).mockResolvedValue({ authorized: true });
      (nmk.nmkSetQueueSong as any).mockResolvedValue(undefined);
      (nmk.nmkPlay as any).mockResolvedValue(undefined);
      (nmk.nmkWaitForPlaying as any).mockResolvedValue(true);
      (nmk.nmkPause as any).mockResolvedValue(undefined);
      (nmk.nmkStop as any).mockResolvedValue(undefined);
      (nmk.nmkSeek as any).mockResolvedValue(undefined);

      // Render with an accompaniment, start playback, capture the stop handle,
      // then rerender with null (simulating the parent detaching the backing mid-play).
      const { result, rerender } = renderHook(
        (acc: any) => useStreamingAccompaniment(acc),
        {
          initialProps: {
            kind: 'apple_music',
            title: null,
            appleMusicId: 'xyz',
            appleMusicStorefront: 'us',
            appleMusicArtist: null,
            appleMusicArtworkUrl: null,
          },
        },
      );

      // Start playback first
      await act(async () => {
        await result.current.start(0);
      });

      const stopFn = result.current.stop;

      // Detach the accompaniment
      rerender(null);

      act(() => { stopFn(); });

      // Native stop path must still have fired (nmkStop + nmkSeek)
      expect(nmk.nmkStop).toHaveBeenCalled();
      expect(nmk.nmkSeek).toHaveBeenCalledWith(0);
    });
  });

  describe('waitForPlaying()', () => {
    it('returns true immediately without calling nmkWaitForPlaying again', async () => {
      const nmk = await import('@/plugins/nativeMusicKit');
      (nmk.isNativeMusicKitAvailable as any).mockReturnValue(true);

      const { result } = renderHook(() =>
        useStreamingAccompaniment({
          kind: 'apple_music',
          title: null,
          appleMusicId: 'abc',
          appleMusicStorefront: 'us',
          appleMusicArtist: null,
          appleMusicArtworkUrl: null,
        }),
      );
      let val: boolean = false;
      await act(async () => {
        val = await result.current.waitForPlaying();
      });
      expect(val).toBe(true);
      // waitForPlaying() must NOT call nmkWaitForPlaying — start() already did.
      expect(nmk.nmkWaitForPlaying).not.toHaveBeenCalled();
    });
  });
});
