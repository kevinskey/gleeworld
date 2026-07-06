// Extract a YouTube video ID from the URL shapes people actually paste:
// watch?v=, youtu.be/<id>, shorts/<id>, embed/<id> (incl. youtube-nocookie),
// and music.youtube.com/watch?v=. Returns null for anything else so callers
// can fall back to opening the raw URL instead of rendering a broken embed.
const YT_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be',
]);
const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!YT_HOSTS.has(u.hostname.toLowerCase())) return null;

  let candidate: string | null = null;
  if (u.hostname.toLowerCase() === 'youtu.be') {
    candidate = u.pathname.split('/')[1] ?? null;
  } else if (u.searchParams.has('v')) {
    candidate = u.searchParams.get('v');
  } else {
    const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/);
    candidate = m?.[1] ?? null;
  }
  return candidate && ID_RE.test(candidate) ? candidate : null;
}
