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
