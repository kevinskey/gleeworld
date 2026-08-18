import { Capacitor } from '@capacitor/core';

/**
 * Where to point a YouTube <iframe>.
 *
 * On the web, the direct youtube-nocookie embed. In the native app the
 * WKWebView's origin is capacitor://localhost, which sends no valid HTTP
 * Referer — YouTube rejects the embed with error 153 ("embedder identity:
 * missing referrer"). So native routes through /yt-embed.html hosted on
 * gleeworld.org: YouTube then sees a real https referer. The wrapper is a
 * static page in public/, identical on every tenant host.
 */
export function youtubeEmbedSrc(videoId: string, opts: { autoplay?: boolean } = {}): string {
  const autoplay = opts.autoplay === false ? 0 : 1;
  if (Capacitor.isNativePlatform()) {
    return `https://gleeworld.org/yt-embed.html?v=${encodeURIComponent(videoId)}&autoplay=${autoplay}`;
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=${autoplay}&rel=0`;
}
