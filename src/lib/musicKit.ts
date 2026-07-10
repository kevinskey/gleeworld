// MusicKit JS bootstrap.
//
// Lazy-loads Apple's MusicKit JS (v3) the first time something asks for
// it, configures it with our developer token from /apple-music/developer-token,
// and hands back the singleton MusicKit instance. Search + playback both
// dispatch through this singleton.
//
// Subscription model: the developer token authenticates *us* (GleeWorld)
// to Apple's catalog. To stream full tracks the listener must additionally
// sign in with their Apple ID — that produces a separate "music-user-token"
// which MusicKit stores. Free / no-subscription users can search and see
// metadata but get a "subscription required" surface when they press play.

const MUSICKIT_SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';

declare global {
  interface Window {
    MusicKit?: any;
  }
}

let kitPromise: Promise<any> | null = null;

async function fetchDeveloperToken(): Promise<string> {
  // Resolved via the same helper as the search path so the URL is
  // absolute when running inside Capacitor's capacitor://localhost.
  const url = (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol))
    ? '/apple-music/developer-token'
    : 'https://demo.gleeworld.org/apple-music/developer-token';
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`token-fetch failed: ${res.status}`);
  const { token } = await res.json();
  if (!token) throw new Error('token missing in response');
  return token;
}

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already-loaded fast path.
    if (window.MusicKit) return resolve();

    const TIMEOUT_MS = 20000;
    const start = Date.now();
    let settled = false;
    let pollHandle: number | undefined;

    const cleanup = () => {
      settled = true;
      if (pollHandle !== undefined) window.clearTimeout(pollHandle);
      document.removeEventListener('musickitloaded', onLoaded);
    };
    const onLoaded = () => { if (!settled) { cleanup(); resolve(); } };
    document.addEventListener('musickitloaded', onLoaded, { once: true });

    const pollForGlobal = () => {
      if (settled) return;
      if (window.MusicKit) { cleanup(); return resolve(); }
      if (Date.now() - start > TIMEOUT_MS) {
        cleanup();
        return reject(new Error('musickit timeout — script may be blocked by CSP or network is offline'));
      }
      pollHandle = window.setTimeout(pollForGlobal, 100);
    };

    if (document.querySelector('script[data-musickit-loader]')) {
      // Another caller already injected the script — just wait.
      pollForGlobal();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.setAttribute('data-musickit-loader', '1');
    s.onload = () => pollForGlobal();
    s.onerror = () => { cleanup(); reject(new Error('musickit script failed to load')); };
    document.head.appendChild(s);
    pollForGlobal();
  });
}

export async function getMusicKit(): Promise<any> {
  if (kitPromise) return kitPromise;
  kitPromise = (async () => {
    await loadScriptOnce(MUSICKIT_SRC);
    if (!window.MusicKit) throw new Error('MusicKit global never appeared');
    const developerToken = await fetchDeveloperToken();
    // MusicKit v3 uses an event listener for "musickitloaded" but the
    // script tag finishes loading after the global is set, so we just
    // configure() directly.
    await window.MusicKit.configure({
      developerToken,
      app: {
        name: 'GleeWorld',
        build: '1.0.1',
      },
    });
    return window.MusicKit.getInstance();
  })().catch((err) => {
    // Allow callers to retry after a failure (e.g. token rotated mid-session).
    kitPromise = null;
    throw err;
  });
  return kitPromise;
}

export interface AppleMusicSongHit {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  storefront: string;
}

export interface AppleMusicAlbumHit {
  id: string;
  title: string;       // album name
  artist: string;
  artworkUrl: string | null;
  trackCount: number;
  storefront: string;
}

export type AppleMusicSearchResults = {
  songs: AppleMusicSongHit[];
  albums: AppleMusicAlbumHit[];
};

// Search the Apple Music catalog.
//
// We bypass MusicKit JS for the search call and hit Apple's REST API
// directly with our developer token. MusicKit v3's `kit.api.music()`
// has a habit of throwing "Failed to fetch" inside an alert popup when
// any of its internal storefront-detection requests trips (region
// mismatch, CSP, etc.), and a direct fetch is far simpler to debug.
// The MusicKit instance is still required for setQueue + play, so we
// only short-circuit the search path.
// On web, the page is served from a real tenant subdomain so the
// relative URL hits nginx. On Capacitor native, the WebView origin is
// `capacitor://localhost` and a relative path 404s into the bundle.
// Fall back to a known public host that serves the dev token.
function getDeveloperTokenUrl(): string {
  if (typeof window === 'undefined') return '/apple-music/developer-token';
  const proto = window.location.protocol;
  if (proto === 'http:' || proto === 'https:') {
    return '/apple-music/developer-token';
  }
  // capacitor:// or any non-http origin — use the production tenant
  // bridge. The token is the same JWT across tenants.
  return 'https://demo.gleeworld.org/apple-music/developer-token';
}
let cachedToken: { token: string; fetchedAt: number } | null = null;

async function getDeveloperToken(): Promise<string> {
  // 50-min cache (the JWTs we mint last 5 months, so this is just to
  // avoid re-hitting nginx on every keystroke).
  if (cachedToken && Date.now() - cachedToken.fetchedAt < 50 * 60 * 1000) {
    return cachedToken.token;
  }
  const res = await fetch(getDeveloperTokenUrl(), { cache: 'no-store' });
  if (!res.ok) throw new Error(`developer token unavailable (${res.status})`);
  // A vhost missing the nginx apple-music snippet answers this route with
  // the SPA's index.html and a 200 — catch it here so the user sees what's
  // wrong instead of "Unexpected token '<' … is not valid JSON".
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    throw new Error('Apple Music is not enabled on this domain yet (token endpoint returned HTML).');
  }
  const { token } = await res.json();
  if (!token) throw new Error('developer token endpoint returned empty body');
  cachedToken = { token, fetchedAt: Date.now() };
  return token;
}

/** Search both songs AND albums in one call. Apple's search endpoint
 *  takes a comma-separated `types` param and returns separate result
 *  buckets — so a single fetch covers both. */
export async function searchAppleMusic(term: string, storefront = 'us'): Promise<AppleMusicSearchResults> {
  if (!term.trim()) return { songs: [], albums: [] };
  const token = await getDeveloperToken();
  const url = `https://api.music.apple.com/v1/catalog/${storefront}/search?term=${encodeURIComponent(term)}&types=songs,albums&limit=20`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(`apple music search failed (${res.status})${detail ? ` — ${detail.slice(0, 200)}` : ''}`);
  }
  const json = await res.json();
  const songsRaw = json?.results?.songs?.data ?? [];
  const albumsRaw = json?.results?.albums?.data ?? [];
  const songs: AppleMusicSongHit[] = songsRaw.map((s: any) => ({
    id: s.id,
    title: s.attributes?.name ?? '(untitled)',
    artist: s.attributes?.artistName ?? '',
    album: s.attributes?.albumName ?? '',
    artworkUrl: s.attributes?.artwork?.url
      ? s.attributes.artwork.url.replace('{w}', '120').replace('{h}', '120')
      : null,
    storefront,
  }));
  const albums: AppleMusicAlbumHit[] = albumsRaw.map((a: any) => ({
    id: a.id,
    title: a.attributes?.name ?? '(untitled)',
    artist: a.attributes?.artistName ?? '',
    artworkUrl: a.attributes?.artwork?.url
      ? a.attributes.artwork.url.replace('{w}', '120').replace('{h}', '120')
      : null,
    trackCount: a.attributes?.trackCount ?? 0,
    storefront,
  }));
  return { songs, albums };
}

export interface AuthorizeResult {
  ok: boolean;
  /** Specific failure category so the UI can surface a useful message
   *  instead of a generic "sign-in failed". */
  reason?: 'popup_blocked' | 'cancelled' | 'no_subscription' | 'timeout' | 'unknown';
  message?: string;
}

/** Trigger the Apple-ID sign-in flow so MusicKit can mint a music-user-token.
 *  Required before full-length playback (previews work without it).
 *
 *  IMPORTANT: must be called *synchronously inside the user's click* so the
 *  popup that authorize() opens isn't blocked. If you await network work
 *  before calling this, Safari/WKWebView will deny `window.open` and the
 *  flow silently fails. Pre-load MusicKit via `getMusicKit()` ahead of
 *  time (e.g. when the audio companion opens) so this call is cheap. */
export async function authorizeAppleMusic(): Promise<AuthorizeResult> {
  let kit;
  try {
    kit = await getMusicKit();
  } catch (err: any) {
    return { ok: false, reason: 'unknown', message: err?.message ?? 'MusicKit failed to load' };
  }
  try {
    // 30s timeout — if the user dismisses the popup or the OS swallows it,
    // we want a clear failure rather than a hung promise.
    const result = await Promise.race([
      kit.authorize(),
      new Promise((_, rej) => window.setTimeout(() => rej(new Error('timeout')), 30000)),
    ]);
    if (!kit.musicUserToken) {
      // Signed in but no token → most commonly means no active Apple Music
      // subscription on this Apple ID.
      return { ok: false, reason: 'no_subscription', message: 'No Apple Music subscription found on this Apple ID.' };
    }
    return { ok: true };
  } catch (err: any) {
    const msg = String(err?.message ?? err ?? '').toLowerCase();
    if (msg.includes('cancel')) return { ok: false, reason: 'cancelled', message: 'Sign-in cancelled.' };
    if (msg.includes('timeout')) return { ok: false, reason: 'timeout', message: 'Sign-in took too long — try again.' };
    if (msg.includes('popup') || msg.includes('window')) return { ok: false, reason: 'popup_blocked', message: 'The sign-in popup was blocked. Tap "Sign in to Apple Music" directly.' };
    return { ok: false, reason: 'unknown', message: err?.message ?? 'Apple sign-in failed.' };
  }
}

export async function isAppleMusicAuthorized(): Promise<boolean> {
  try {
    const kit = await getMusicKit();
    return !!kit.musicUserToken;
  } catch {
    return false;
  }
}
