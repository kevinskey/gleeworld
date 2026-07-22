// Parse a pasted URL into a normalized video source so the /youtube page
// (and anywhere else that renders user-supplied media) can accept the
// major streaming services and raw video files, not just YouTube.
//
// Providers we handle today:
//   - youtube (delegates to getYouTubeId — every YT surface + Shorts + Music)
//   - vimeo (vimeo.com/<id>, player.vimeo.com/video/<id>)
//   - dailymotion (dailymotion.com/video/<id>, dai.ly/<id>)
//   - twitch (VOD: twitch.tv/videos/<id>, clips: clips.twitch.tv/<slug>)
//   - facebook (facebook.com/<page>/videos/<id>, fb.watch/<code>)
//   - instagram (reels + video posts)
//   - tiktok (tiktok.com/@user/video/<id>, vm.tiktok.com/<code>)
//   - loom (loom.com/share/<id>)
//   - wistia (wistia.com/medias/<id>, fast.wistia.com/embed/iframe/<id>)
//   - soundcloud (audio, but users think of it as "the video I made")
//   - direct (any URL ending in a common video extension or an HLS manifest)
//
// Return shape includes an `embedUrl` when we can render the source in
// an <iframe> or <video>. Callers that only need the canonical URL can
// use `canonicalUrl` and ignore `embedUrl`.
//
// New providers: add a matcher below and, if it needs a special player,
// extend the switch in <VideoEmbed />.

import { getYouTubeId } from './youtubeId';

export type VideoProvider =
  | 'youtube'
  | 'vimeo'
  | 'dailymotion'
  | 'twitch'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'loom'
  | 'wistia'
  | 'soundcloud'
  | 'direct';

export interface ParsedVideoSource {
  provider: VideoProvider;
  /** Provider-native identifier when we can extract one (YT id, Vimeo id, etc.). Falls back to the URL itself for direct/soundcloud/etc. */
  videoId: string;
  /** URL suitable for an <iframe src> or <video src>. Null when we can render but don't have an embed URL (rare). */
  embedUrl: string | null;
  /** Canonical, shareable URL. Always safe to store even if we can't embed. */
  canonicalUrl: string;
  /** Public thumbnail URL if the provider exposes one deterministically (YouTube does; most don't). */
  thumbnailUrl: string | null;
}

// Extensions we're confident a <video src> can play in modern browsers.
// .mkv/.avi/.wmv are listed for URL-parsing so we can accept them, but
// most browsers cannot decode them without a media source shim. Callers
// should render them behind a "download" fallback.
const VIDEO_EXT_RE = /\.(mp4|m4v|mov|webm|ogv|ogg|mkv|avi|wmv|flv|3gp|m3u8|mpd)(?:\?.*)?$/i;
const NATIVE_PLAYABLE_EXT_RE = /\.(mp4|m4v|mov|webm|ogv|ogg|m3u8)(?:\?.*)?$/i;

function hostMatches(host: string, needle: string): boolean {
  const h = host.toLowerCase();
  return h === needle || h.endsWith(`.${needle}`);
}

function parseVimeo(u: URL): ParsedVideoSource | null {
  if (!hostMatches(u.hostname, 'vimeo.com')) return null;
  // player.vimeo.com/video/<id>  →  <id>
  // vimeo.com/<id>               →  <id>
  // vimeo.com/channels/foo/<id>  →  <id>
  // vimeo.com/showcase/xyz/video/<id> → <id>
  const parts = u.pathname.split('/').filter(Boolean);
  const id = [...parts].reverse().find((p) => /^\d+$/.test(p));
  if (!id) return null;
  return {
    provider: 'vimeo',
    videoId: id,
    embedUrl: `https://player.vimeo.com/video/${id}`,
    canonicalUrl: `https://vimeo.com/${id}`,
    thumbnailUrl: null,
  };
}

function parseDailymotion(u: URL): ParsedVideoSource | null {
  // dai.ly/<id>  or  dailymotion.com/video/<id>  or  dailymotion.com/embed/video/<id>
  if (hostMatches(u.hostname, 'dai.ly')) {
    const id = u.pathname.split('/').filter(Boolean)[0];
    if (!id) return null;
    return {
      provider: 'dailymotion',
      videoId: id,
      embedUrl: `https://www.dailymotion.com/embed/video/${id}`,
      canonicalUrl: `https://www.dailymotion.com/video/${id}`,
      thumbnailUrl: null,
    };
  }
  if (!hostMatches(u.hostname, 'dailymotion.com')) return null;
  const m = u.pathname.match(/\/(?:embed\/)?video\/([^/?]+)/);
  if (!m) return null;
  return {
    provider: 'dailymotion',
    videoId: m[1],
    embedUrl: `https://www.dailymotion.com/embed/video/${m[1]}`,
    canonicalUrl: `https://www.dailymotion.com/video/${m[1]}`,
    thumbnailUrl: null,
  };
}

function parseTwitch(u: URL): ParsedVideoSource | null {
  const host = u.hostname.toLowerCase();
  // Twitch iframe requires a &parent=<host> param at runtime — the player
  // sets that when it renders. We store the base embed URL here.
  if (host === 'clips.twitch.tv' || host === 'www.clips.twitch.tv') {
    const slug = u.pathname.split('/').filter(Boolean)[0];
    if (!slug) return null;
    return {
      provider: 'twitch',
      videoId: `clip:${slug}`,
      embedUrl: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}`,
      canonicalUrl: `https://clips.twitch.tv/${slug}`,
      thumbnailUrl: null,
    };
  }
  if (!hostMatches(u.hostname, 'twitch.tv')) return null;
  // /videos/<id> = VOD.  /<channel>/clip/<slug> = clip.
  const vod = u.pathname.match(/^\/videos\/(\d+)/);
  if (vod) {
    return {
      provider: 'twitch',
      videoId: `video:${vod[1]}`,
      embedUrl: `https://player.twitch.tv/?video=${vod[1]}`,
      canonicalUrl: `https://www.twitch.tv/videos/${vod[1]}`,
      thumbnailUrl: null,
    };
  }
  const clip = u.pathname.match(/^\/[^/]+\/clip\/([^/?]+)/);
  if (clip) {
    return {
      provider: 'twitch',
      videoId: `clip:${clip[1]}`,
      embedUrl: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip[1])}`,
      canonicalUrl: u.toString(),
      thumbnailUrl: null,
    };
  }
  return null;
}

function parseFacebook(u: URL): ParsedVideoSource | null {
  const host = u.hostname.toLowerCase();
  if (host === 'fb.watch') {
    // Short-link — we cannot resolve the video id without a network call.
    // Store the canonical URL and let FB's oEmbed iframe do the resolution.
    return {
      provider: 'facebook',
      videoId: u.pathname.replace(/^\//, ''),
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.toString())}`,
      canonicalUrl: u.toString(),
      thumbnailUrl: null,
    };
  }
  if (!hostMatches(u.hostname, 'facebook.com')) return null;
  // Any /videos/<id> or /watch/?v=<id> shape works via the plugin embed.
  const looksLikeVideo =
    /\/videos?\/\d+/.test(u.pathname) ||
    /\/reel\/\d+/.test(u.pathname) ||
    (u.pathname === '/watch' && u.searchParams.has('v'));
  if (!looksLikeVideo) return null;
  return {
    provider: 'facebook',
    videoId: u.searchParams.get('v') || u.pathname,
    embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.toString())}`,
    canonicalUrl: u.toString(),
    thumbnailUrl: null,
  };
}

function parseInstagram(u: URL): ParsedVideoSource | null {
  if (!hostMatches(u.hostname, 'instagram.com')) return null;
  const m = u.pathname.match(/^\/(?:reel|p|tv)\/([^/?]+)/);
  if (!m) return null;
  return {
    provider: 'instagram',
    videoId: m[1],
    embedUrl: `https://www.instagram.com/p/${m[1]}/embed`,
    canonicalUrl: `https://www.instagram.com/${u.pathname.split('/')[1]}/${m[1]}/`,
    thumbnailUrl: null,
  };
}

function parseTikTok(u: URL): ParsedVideoSource | null {
  const host = u.hostname.toLowerCase();
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
    // Short link — TikTok's own embed can resolve it.
    const code = u.pathname.replace(/^\//, '').split('/')[0];
    if (!code) return null;
    return {
      provider: 'tiktok',
      videoId: `short:${code}`,
      embedUrl: null, // TikTok requires their JS SDK; caller renders a link fallback.
      canonicalUrl: u.toString(),
      thumbnailUrl: null,
    };
  }
  if (!hostMatches(u.hostname, 'tiktok.com')) return null;
  const m = u.pathname.match(/\/video\/(\d+)/);
  if (!m) return null;
  return {
    provider: 'tiktok',
    videoId: m[1],
    embedUrl: `https://www.tiktok.com/embed/v2/${m[1]}`,
    canonicalUrl: u.toString(),
    thumbnailUrl: null,
  };
}

function parseLoom(u: URL): ParsedVideoSource | null {
  if (!hostMatches(u.hostname, 'loom.com')) return null;
  const m = u.pathname.match(/\/(?:share|embed)\/([^/?]+)/);
  if (!m) return null;
  return {
    provider: 'loom',
    videoId: m[1],
    embedUrl: `https://www.loom.com/embed/${m[1]}`,
    canonicalUrl: `https://www.loom.com/share/${m[1]}`,
    thumbnailUrl: null,
  };
}

function parseWistia(u: URL): ParsedVideoSource | null {
  const host = u.hostname.toLowerCase();
  if (!(hostMatches(u.hostname, 'wistia.com') || host === 'fast.wistia.net' || host === 'fast.wistia.com')) return null;
  const m = u.pathname.match(/(?:medias|embed\/iframe|embed\/medias)\/([^/?]+)/);
  if (!m) return null;
  return {
    provider: 'wistia',
    videoId: m[1],
    embedUrl: `https://fast.wistia.net/embed/iframe/${m[1]}`,
    canonicalUrl: `https://home.wistia.com/medias/${m[1]}`,
    thumbnailUrl: null,
  };
}

function parseSoundCloud(u: URL): ParsedVideoSource | null {
  if (!hostMatches(u.hostname, 'soundcloud.com')) return null;
  // SoundCloud embeds work off the canonical /user/track URL — the widget
  // iframe takes the full URL as an escaped param.
  return {
    provider: 'soundcloud',
    videoId: u.pathname,
    embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.toString())}`,
    canonicalUrl: u.toString(),
    thumbnailUrl: null,
  };
}

function parseDirect(u: URL): ParsedVideoSource | null {
  if (!VIDEO_EXT_RE.test(u.pathname)) return null;
  return {
    provider: 'direct',
    videoId: u.toString(),
    embedUrl: NATIVE_PLAYABLE_EXT_RE.test(u.pathname) ? u.toString() : null,
    canonicalUrl: u.toString(),
    thumbnailUrl: null,
  };
}

export function parseVideoSource(input: string): ParsedVideoSource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // YouTube first — most common, and getYouTubeId already handles the many
  // variants including bare 11-char IDs (via parseYouTubeInput upstream).
  const ytId = getYouTubeId(trimmed);
  if (ytId) {
    return {
      provider: 'youtube',
      videoId: ytId,
      embedUrl: `https://www.youtube.com/embed/${ytId}`,
      canonicalUrl: `https://www.youtube.com/watch?v=${ytId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  return (
    parseVimeo(u) ||
    parseDailymotion(u) ||
    parseTwitch(u) ||
    parseFacebook(u) ||
    parseInstagram(u) ||
    parseTikTok(u) ||
    parseLoom(u) ||
    parseWistia(u) ||
    parseSoundCloud(u) ||
    parseDirect(u)
  );
}

export function providerLabel(p: VideoProvider): string {
  switch (p) {
    case 'youtube': return 'YouTube';
    case 'vimeo': return 'Vimeo';
    case 'dailymotion': return 'Dailymotion';
    case 'twitch': return 'Twitch';
    case 'facebook': return 'Facebook';
    case 'instagram': return 'Instagram';
    case 'tiktok': return 'TikTok';
    case 'loom': return 'Loom';
    case 'wistia': return 'Wistia';
    case 'soundcloud': return 'SoundCloud';
    case 'direct': return 'Video file';
  }
}
