// Apple Music developer-token minter.
//
// Mints a short-lived ES256 JWT signed with our Apple Developer MusicKit
// private key. The token is the same for every tenant + every user — it
// only identifies *us* (GleeWorld) to Apple's catalog API. User
// identification happens client-side via MusicKit JS's "music-user-token"
// after the listener signs in with their Apple ID.
//
// We rotate by re-issuing on every request (max validity ~180 days), with
// a 12-hour in-memory cache so we don't spend signing CPU on every page
// load. No persistence — restart and the cache rebuilds.
//
// Deploy: systemd unit at /etc/systemd/system/apple-music-token.service.
// Listens on 127.0.0.1:3050. Nginx fronts /apple-music/developer-token
// on every gleeworld vhost.

const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const KEY_PATH = process.env.APPLE_MUSIC_KEY_PATH
  || '/opt/apple-music/AuthKey_76BUX254J7.p8';
const KEY_ID = process.env.APPLE_MUSIC_KEY_ID || '76BUX254J7';
const TEAM_ID = process.env.APPLE_MUSIC_TEAM_ID || 'AUJY92SA4D';
const PORT = parseInt(process.env.PORT || '3050', 10);

// Tokens last 180 days; we mint with a 150-day expiry so we can re-mint
// well before Apple stops accepting them.
const TOKEN_LIFETIME_SECONDS = 150 * 24 * 60 * 60;
// Cache for 12 hours so we don't burn CPU on every page load.
const CACHE_LIFETIME_MS = 12 * 60 * 60 * 1000;

let cachedToken = null;
let cachedAt = 0;

const privateKey = fs.readFileSync(KEY_PATH, 'utf8');

function mintToken() {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: TOKEN_LIFETIME_SECONDS,
    issuer: TEAM_ID,
    header: { kid: KEY_ID, alg: 'ES256' },
  });
}

function getToken() {
  if (cachedToken && Date.now() - cachedAt < CACHE_LIFETIME_MS) {
    return cachedToken;
  }
  cachedToken = mintToken();
  cachedAt = Date.now();
  return cachedToken;
}

const server = http.createServer((req, res) => {
  // CORS: this is consumed cross-tenant (every *.gleeworld.org and the
  // main domain), and we never set cookies on this endpoint, so a wide
  // open Access-Control-Allow-Origin is safe.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url !== '/apple-music/developer-token' && req.url !== '/developer-token') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  try {
    const token = getToken();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token }));
  } catch (err) {
    console.error('[apple-music-token] mint failed', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'mint_failed' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[apple-music-token] listening on 127.0.0.1:${PORT}`);
});
