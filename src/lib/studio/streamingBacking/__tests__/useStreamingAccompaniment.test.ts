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

  it('YouTube start posts a play command through the iframe ref', async () => {
    const { result } = renderHook(() =>
      useStreamingAccompaniment({
        kind: 'youtube',
        title: null,
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }),
    );
    const post = vi.fn();
    result.current.ytIframeRef.current = { contentWindow: { postMessage: post } } as unknown as HTMLIFrameElement;
    await act(async () => {
      await result.current.start(4);
    });
    expect(post).toHaveBeenCalled();
  });

  it('Apple Music start on iOS routes through the native plugin', async () => {
    const nmk = await import('@/plugins/nativeMusicKit');
    (nmk.isNativeMusicKitAvailable as any).mockReturnValue(true);
    (nmk.nmkRequestAuthorization as any).mockResolvedValue({ authorized: true });
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
  });
});
