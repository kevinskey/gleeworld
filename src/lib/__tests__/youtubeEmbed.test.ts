import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * YouTube error 153 on iOS: the capacitor://localhost origin sends no valid
 * Referer, so YouTube rejects direct embeds in the app. Native must route
 * through the https-hosted wrapper page; the web keeps the direct embed.
 */

const loadWith = async (native: boolean) => {
  vi.resetModules();
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native } }));
  return await import('../youtubeEmbed');
};

afterEach(() => vi.doUnmock('@capacitor/core'));

describe('youtubeEmbedSrc', () => {
  it('web: direct no-cookie embed', async () => {
    const { youtubeEmbedSrc } = await loadWith(false);
    expect(youtubeEmbedSrc('gDKCK_6WLTg')).toBe(
      'https://www.youtube-nocookie.com/embed/gDKCK_6WLTg?autoplay=1&rel=0',
    );
  });

  it('native: https wrapper so YouTube gets a real referer (error 153)', async () => {
    const { youtubeEmbedSrc } = await loadWith(true);
    expect(youtubeEmbedSrc('gDKCK_6WLTg')).toBe(
      'https://gleeworld.org/yt-embed.html?v=gDKCK_6WLTg&autoplay=1',
    );
  });

  it('honors autoplay=false on both paths', async () => {
    const web = await loadWith(false);
    expect(web.youtubeEmbedSrc('abc12345678', { autoplay: false })).toContain('autoplay=0');
    const native = await loadWith(true);
    expect(native.youtubeEmbedSrc('abc12345678', { autoplay: false })).toContain('autoplay=0');
  });
});
