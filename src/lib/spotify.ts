// Spotify for the assistant: PKCE auth + Web Playback SDK + search.
//
// Public client — Authorization Code with PKCE, so the app never holds a
// client secret. Registered redirect is the APEX ONLY (Spotify wants exact
// matches and we have ~50 tenant subdomains), so the verifier and the
// user's return URL travel in `state`: the code+verifier pair appears only
// on our own https callback, and the callback bounces tokens back to the
// originating origin in a URL FRAGMENT (fragments don't reach server logs).
// The app is in Development mode: only Spotify accounts allowlisted in the
// dashboard's User Management can connect at all.
//
// Playback truth: the Web Playback SDK requires Spotify PREMIUM. Free
// accounts authenticate fine and then get a 403 on play — surfaced as a
// plain message, never a silent failure.

const CLIENT_ID = 'c29e0072752e427498360876e090ec59';
const REDIRECT_URI = window?.location?.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8080/spotify/callback'
  : 'https://gleeworld.org/spotify/callback';
const SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify-private';
const TOKENS_KEY = 'gw-spotify-tokens';

interface Tokens { access_token: string; refresh_token: string; expires_at: number }

function readTokens(): Tokens | null {
  try {
    const t = JSON.parse(localStorage.getItem(TOKENS_KEY) ?? 'null');
    return t?.access_token ? t as Tokens : null;
  } catch { return null; }
}
export function saveTokens(t: { access_token: string; refresh_token?: string; expires_in: number }, prevRefresh?: string): void {
  const stored: Tokens = {
    access_token: t.access_token,
    refresh_token: t.refresh_token || prevRefresh || '',
    expires_at: Date.now() + (t.expires_in - 60) * 1000,
  };
  try { localStorage.setItem(TOKENS_KEY, JSON.stringify(stored)); } catch { /* private mode */ }
}
export function isSpotifyConnected(): boolean { return !!readTokens(); }
export function disconnectSpotify(): void { try { localStorage.removeItem(TOKENS_KEY); } catch { /* ignore */ } }

/** Begin the PKCE dance — navigates the whole window to Spotify. */
export async function connectSpotify(): Promise<void> {
  const bytes = crypto.getRandomValues(new Uint8Array(64));
  const verifier = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const state = btoa(JSON.stringify({ v: verifier, r: window.location.href }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const qs = new URLSearchParams({
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI,
    scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge, state,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${qs}`);
}

/** Called on the apex callback page: exchange the code, then bounce home
 *  with the tokens in the fragment. Returns the URL to navigate to. */
export async function completeSpotifyCallback(code: string, state: string): Promise<string> {
  const parsed = JSON.parse(atob(state.replace(/-/g, '+').replace(/_/g, '/')));
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID, code_verifier: parsed.v,
    }),
  });
  if (!res.ok) throw new Error(`token exchange ${res.status}`);
  const tok = await res.json();
  const returnTo = new URL(typeof parsed.r === 'string' ? parsed.r : 'https://gleeworld.org/');
  if (returnTo.origin === window.location.origin) {
    saveTokens(tok);
    return returnTo.pathname + returnTo.search;
  }
  const frag = btoa(JSON.stringify({ a: tok.access_token, f: tok.refresh_token, e: tok.expires_in }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${returnTo.origin}/spotify/callback#st=${frag}`;
}

/** On any origin: adopt tokens arriving in the fragment from the apex hop. */
export function adoptFragmentTokens(): boolean {
  const m = window.location.hash.match(/st=([A-Za-z0-9\-_]+)/);
  if (!m) return false;
  try {
    const t = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')));
    saveTokens({ access_token: t.a, refresh_token: t.f, expires_in: t.e });
    history.replaceState(null, '', window.location.pathname);
    return true;
  } catch { return false; }
}

export async function getAccessToken(): Promise<string | null> {
  const t = readTokens();
  if (!t) return null;
  if (Date.now() < t.expires_at) return t.access_token;
  if (!t.refresh_token) return null;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: CLIENT_ID }),
  });
  if (!res.ok) { disconnectSpotify(); return null; }
  const tok = await res.json();
  saveTokens(tok, t.refresh_token);
  return tok.access_token as string;
}

// ---------------- Search + playback ----------------

export interface SpotifyHit { uri: string; contextUri?: string; title: string; artist: string; artworkUrl: string | null }

export async function searchSpotify(query: string, kind: 'track' | 'album'): Promise<SpotifyHit | null> {
  const token = await getAccessToken();
  if (!token) throw new Error('not_connected');
  const qs = new URLSearchParams({ q: query, type: kind, limit: '1' });
  const res = await fetch(`https://api.spotify.com/v1/search?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();
  const item = kind === 'album' ? data?.albums?.items?.[0] : data?.tracks?.items?.[0];
  if (!item) return null;
  const images = kind === 'album' ? item.images : item.album?.images;
  return {
    uri: item.uri,
    contextUri: kind === 'album' ? item.uri : undefined,
    title: item.name,
    artist: (item.artists ?? []).map((a: { name: string }) => a.name).join(', '),
    artworkUrl: images?.[1]?.url ?? images?.[0]?.url ?? null,
  };
}

declare global { interface Window { Spotify?: any; onSpotifyWebPlaybackSDKReady?: () => void } }

let playerPromise: Promise<{ player: any; deviceId: string }> | null = null;

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Spotify) return resolve();
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const s = document.createElement('script');
    s.src = 'https://sdk.scdn.co/spotify-player.js';
    s.onerror = () => reject(new Error('sdk load failed'));
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('sdk timeout')), 20000);
  });
}

export async function ensurePlayer(): Promise<{ player: any; deviceId: string }> {
  if (playerPromise) return playerPromise;
  playerPromise = (async () => {
    await loadSdk();
    const player = new window.Spotify.Player({
      name: 'GleeWorld Assistant',
      getOAuthToken: (cb: (t: string) => void) => { getAccessToken().then((t) => t && cb(t)); },
      volume: 0.9,
    });
    const deviceId = await new Promise<string>((resolve, reject) => {
      player.addListener('ready', ({ device_id }: { device_id: string }) => resolve(device_id));
      player.addListener('initialization_error', ({ message }: { message: string }) => reject(new Error(message)));
      player.addListener('authentication_error', ({ message }: { message: string }) => reject(new Error(message)));
      player.addListener('account_error', () => reject(new Error('premium_required')));
      player.connect();
      setTimeout(() => reject(new Error('player timeout')), 20000);
    });
    return { player, deviceId };
  })();
  playerPromise.catch(() => { playerPromise = null; });
  return playerPromise;
}

export async function playOnSpotify(hit: SpotifyHit): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('not_connected');
  const { deviceId } = await ensurePlayer();
  const body = hit.contextUri ? { context_uri: hit.contextUri } : { uris: [hit.uri] };
  const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 403) throw new Error('premium_required');
  if (!res.ok && res.status !== 204) throw new Error(`play ${res.status}`);
}

export async function togglePlayback(): Promise<void> {
  const { player } = await ensurePlayer();
  await player.togglePlay();
}

export async function stopSpotify(): Promise<void> {
  if (!playerPromise) return;
  try { const { player } = await playerPromise; await player.pause(); } catch { /* already gone */ }
}

// ---------------- User playlists ----------------
// The connect scopes included playlist-read-private and
// playlist-modify-private from day one, so tokens minted before this
// shipped already carry them — no reconnect needed.

export async function listMyPlaylists(): Promise<Array<{ id: string; name: string; uri: string }>> {
  const token = await getAccessToken();
  if (!token) throw new Error('not_connected');
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`playlists ${res.status}`);
  const data = await res.json();
  return ((data?.items ?? []) as Array<{ id: string; name?: string; uri: string }>)
    .map((p) => ({ id: p.id, name: p.name ?? 'Untitled', uri: p.uri }));
}

/** Create a PRIVATE playlist on the connected account and fill it. */
export async function createSpotifyPlaylist(
  name: string,
  description: string | undefined,
  trackUris: string[],
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('not_connected');
  const meRes = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: `Bearer ${token}` } });
  if (!meRes.ok) throw new Error(`me ${meRes.status}`);
  const me = await meRes.json();
  const createRes = await fetch(`https://api.spotify.com/v1/users/${encodeURIComponent(me.id)}/playlists`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: description ?? '', public: false }),
  });
  if (!createRes.ok) throw new Error(`create ${createRes.status}`);
  const playlist = await createRes.json();
  if (trackUris.length) {
    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: trackUris.slice(0, 100) }),
    });
    if (!addRes.ok) throw new Error(`add-tracks ${addRes.status}`);
  }
}
