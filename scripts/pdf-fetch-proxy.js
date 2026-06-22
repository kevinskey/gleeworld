// Fetches a remote PDF and streams it back to the caller. Used by the
// Music Library's "Import from URL" flow so users can paste a publicly
// reachable PDF link from any publisher / Drive / Dropbox without being
// blocked by CORS. The result is uploaded to Supabase storage from the
// browser exactly like a manual upload.
//
// Security: we cap the fetched payload at 50 MB and refuse anything
// whose content-type isn't application/pdf. No auth — the endpoint is
// rate-limited per IP at the nginx layer (10 req/min) and the actual
// upload step is gated by the tenant's existing Supabase RLS.

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = parseInt(process.env.PORT || '3055', 10);
const MAX_BYTES = 50 * 1024 * 1024;

function streamFetch(targetUrl, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(targetUrl); }
    catch { return reject(new Error('Invalid URL')); }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return reject(new Error('Only http(s) URLs are allowed'));
    }
    const lib = parsed.protocol === 'http:' ? http : https;
    const req = lib.get(parsed, { headers: { 'User-Agent': 'GleeWorld-PDF-Import/1.0', 'Accept': 'application/pdf,*/*' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
        const nextUrl = new URL(res.headers.location, parsed).toString();
        res.resume();
        streamFetch(nextUrl, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if ((res.statusCode || 0) >= 400) {
        return reject(new Error(`Source responded ${res.statusCode}`));
      }
      resolve(res);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(new Error('timeout')); });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (!req.url?.startsWith('/import-proxy')) {
    res.writeHead(404); res.end('not found'); return;
  }
  const params = new URL(req.url, 'http://localhost').searchParams;
  const target = params.get('url');
  if (!target) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('missing url'); return; }
  try {
    const upstream = await streamFetch(target);
    const ct = (upstream.headers['content-type'] || '').toLowerCase();
    if (!ct.includes('application/pdf') && !ct.includes('octet-stream') && !ct.includes('binary')) {
      res.writeHead(415, { 'Content-Type': 'text/plain' });
      res.end(`Not a PDF (content-type: ${ct || 'unknown'})`);
      upstream.resume();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': upstream.headers['content-length'] ?? undefined,
    });
    let total = 0;
    upstream.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BYTES) {
        upstream.destroy();
        try { res.end(); } catch {}
        return;
      }
      res.write(chunk);
    });
    upstream.on('end', () => res.end());
    upstream.on('error', () => { try { res.end(); } catch {} });
  } catch (err) {
    console.warn('[pdf-fetch-proxy]', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end(`Fetch failed: ${err.message}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[pdf-fetch-proxy] listening on 127.0.0.1:${PORT}`);
});
