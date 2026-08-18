// SoundCloud embed helpers. The w.soundcloud.com widget needs no API key —
// it takes any public track/playlist/artist URL and renders a full player,
// which is why both the public block and the floating command-center player
// route through here instead of the OAuth'd soundcloud-* edge functions.

export interface SoundCloudTrack {
  url: string;
  title?: string;
}

export function isSoundCloudUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return (
      /(^|\.)soundcloud\.com$/.test(u.hostname) ||
      u.hostname === 'on.soundcloud.com' ||
      u.hostname === 'snd.sc'
    );
  } catch {
    return false;
  }
}

/** Playlists ("sets") need a taller frame than single tracks. */
export function isSoundCloudSet(url: string): boolean {
  return url.includes('/sets/');
}

export interface SoundCloudEmbedOptions {
  /** Hex accent for the play button, with or without leading '#'. */
  color?: string;
  autoPlay?: boolean;
  /** Big artwork layout; compact row player when false. */
  visual?: boolean;
}

// The widget's own permalink resolver is unreliable (public playlists load
// as the sad-face error page), but SoundCloud's oEmbed endpoint is
// CORS-open and returns the canonical api.soundcloud.com resource URL,
// which the widget always accepts. Resolve through it, cache per
// permalink, and fall back to the raw permalink if oEmbed is unreachable.
const resolveCache = new Map<string, Promise<string | null>>();

export function resolveSoundCloudResourceUrl(permalink: string): Promise<string | null> {
  const key = permalink.trim();
  let pending = resolveCache.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(
          `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(key)}`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        const src = /src="([^"]+)"/.exec(String(data.html ?? ''))?.[1]?.replace(/&amp;/g, '&');
        if (!src) return null;
        return new URL(src).searchParams.get('url');
      } catch {
        return null;
      }
    })();
    resolveCache.set(key, pending);
  }
  return pending;
}

export async function buildResolvedSoundCloudEmbedUrl(
  url: string,
  opts: SoundCloudEmbedOptions = {},
): Promise<string> {
  const resolved = await resolveSoundCloudResourceUrl(url);
  return buildSoundCloudEmbedUrl(resolved ?? url, opts);
}

export function buildSoundCloudEmbedUrl(
  url: string,
  opts: SoundCloudEmbedOptions = {},
): string {
  const params = new URLSearchParams({
    url: url.trim(),
    color: (opts.color ?? '#9333ea').replace(/^#/, ''),
    auto_play: String(!!opts.autoPlay),
    visual: String(!!opts.visual),
    hide_related: 'true',
    show_comments: 'false',
    show_teaser: 'false',
    show_user: 'true',
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}
