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
// which the widget always accepts — plus title, author, and artwork,
// which the player UI shows so users never type metadata by hand.
// Cached per permalink; embed building falls back to the raw permalink
// if oEmbed is unreachable.
export interface SoundCloudMeta {
  /** api.soundcloud.com URL the widget accepts. */
  resourceUrl: string | null;
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
}

const metaCache = new Map<string, Promise<SoundCloudMeta | null>>();

export function fetchSoundCloudMeta(permalink: string): Promise<SoundCloudMeta | null> {
  const key = permalink.trim();
  let pending = metaCache.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(
          `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(key)}`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        const src = /src="([^"]+)"/.exec(String(data.html ?? ''))?.[1]?.replace(/&amp;/g, '&');
        return {
          resourceUrl: src ? new URL(src).searchParams.get('url') : null,
          title: typeof data.title === 'string' ? data.title : null,
          authorName: typeof data.author_name === 'string' ? data.author_name : null,
          thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
        };
      } catch {
        return null;
      }
    })();
    metaCache.set(key, pending);
  }
  return pending;
}

export async function resolveSoundCloudResourceUrl(permalink: string): Promise<string | null> {
  return (await fetchSoundCloudMeta(permalink))?.resourceUrl ?? null;
}

/** 'playlist' | 'artist' | 'track' from URL shape: /user/sets/x = playlist,
 *  bare /user = artist page, anything else = track. */
export function soundCloudKind(url: string): 'playlist' | 'artist' | 'track' {
  if (isSoundCloudSet(url)) return 'playlist';
  try {
    const segs = new URL(url).pathname.split('/').filter(Boolean);
    if (segs.length <= 1) return 'artist';
  } catch { /* fall through */ }
  return 'track';
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
