// Server-side article extraction for the Command Center news reader.
// Browsers can't embed news sites (X-Frame-Options / frame-ancestors), and
// RSS only carries a teaser — so the reader sheet asks this function for the
// story body. Fetches the page server-side, runs Mozilla Readability, and
// returns plain-text paragraphs (never raw HTML — no XSS surface).
//
// Known, accepted trade-offs (Kevin, 2026-07-12): extraction is best-effort
// (paywalls/bot-hardened pages fail → client keeps the feed summary), and
// full-text display is a republication call made knowingly; the sheet always
// keeps the "Open full article" attribution link to the source.
//
// Security posture (this function fetches caller-supplied URLs):
// - requires a signature-verified user JWT (no anonymous fetch proxy)
// - hostname blocklist + DNS pre-resolution against private ranges
// - redirects followed MANUALLY with every hop re-checked
// - response bodies streamed with a hard byte cap, never fully buffered
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts';
import { Readability } from 'https://esm.sh/@mozilla/readability@0.5.0';
import { verifyJwtClaims } from '../_shared/verifyJwt.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 10000;
// Full browser UA: many outlets 403 anything that self-identifies as a bot,
// and this fetch is a reader-app page load on a user's behalf, not a crawl.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function isPrivateIpv4(ip: string): boolean {
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return true; // not a clean IPv4 → treat as unsafe
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || a === 127 || a === 0
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 169 && b === 254)
    || (a === 100 && b >= 64 && b <= 127); // CGNAT
}

// String-level checks (no network): protocol, obvious internal names,
// IP literals. Dotless hostnames (kong, auth, rest, db, storage, …) are the
// droplet's Docker service names — nothing public is dotless, block them all.
function isBlockedUrl(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
  if (u.username || u.password) return true;
  const host = u.hostname.toLowerCase();
  if (!host.includes('.')) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host.includes('supabase')) return true;
  if (host.includes(':') || host.startsWith('[')) return true; // IPv6 literals
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return isPrivateIpv4(host);
  return false;
}

// DNS pre-resolution: a public-looking name whose A record points at a
// private address (rebinding) must not be fetched. Fail closed on NXDOMAIN
// (a news site resolves); fail open ONLY when the runtime forbids resolveDns
// entirely — the string-level checks above still hold in that case.
async function resolvesPrivate(host: string): Promise<boolean> {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return isPrivateIpv4(host);
  try {
    const addrs = await Deno.resolveDns(host, 'A');
    if (addrs.length === 0) return true;
    return addrs.some(isPrivateIpv4);
  } catch (e) {
    const name = (e as Error)?.name ?? '';
    if (name === 'PermissionDenied' || name === 'NotCapable') return false;
    return true; // NXDOMAIN / resolver error → fail closed
  }
}

async function guardedFetch(url: string, init: RequestInit): Promise<Response | null> {
  const u = new URL(url);
  if (isBlockedUrl(u) || await resolvesPrivate(u.hostname)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, redirect: 'manual', signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function readBodyCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  if (total >= MAX_HTML_BYTES) await reader.cancel().catch(() => {});
  const merged = new Uint8Array(Math.min(total, MAX_HTML_BYTES));
  let offset = 0;
  for (const c of chunks) {
    const take = Math.min(c.length, merged.length - offset);
    merged.set(c.subarray(0, take), offset);
    offset += take;
    if (offset >= merged.length) break;
  }
  return new TextDecoder().decode(merged);
}

// Follow redirects by hand so EVERY hop passes the guards, and stream the
// final body with a hard cap instead of buffering it whole.
async function fetchPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await guardedFetch(current, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
    });
    if (!res) return null;
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      await res.body?.cancel().catch(() => {});
      if (!loc) return null;
      current = new URL(loc, current).toString();
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    const html = await readBodyCapped(res);
    return html ? { html, finalUrl: current } : null;
  }
  return null;
}

// Google News RSS links point at news.google.com interstitials that redirect
// via JS, not HTTP. Old-format article ids embed the publisher URL in the
// base64 payload; new-format ids (post-2024, the common case) require asking
// Google's own DotsSplashUi batchexecute endpoint to decode them — the same
// mechanism the interstitial page itself uses (and what the public
// googlenewsdecoder tooling does). Everything is best-effort: any failure
// returns null and the caller reports extraction failure.
function urlFromArticleId(articleId: string): string | null {
  try {
    const b64 = articleId.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='));
    const m = decoded.match(/https?:\/\/[!-~]+/);
    if (m) {
      const candidate = m[0].replace(/[^\x20-\x7E]+.*$/, '');
      const u = new URL(candidate);
      if (!u.hostname.includes('google') && !isBlockedUrl(u)) return candidate;
    }
  } catch { /* fall through */ }
  return null;
}

async function resolveGoogleNews(url: URL): Promise<string | null> {
  const idMatch = url.pathname.match(/\/(?:rss\/)?articles\/([^/?]+)/);
  if (!idMatch) return null;
  const articleId = idMatch[1];

  const embedded = urlFromArticleId(articleId);
  if (embedded) return embedded;

  try {
    const page = await fetchPage(`https://news.google.com/articles/${articleId}?hl=en-US&gl=US&ceid=US:en`);
    if (!page) return null;
    const sg = page.html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const ts = page.html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!sg || !ts) return null;

    const garturlreq = [
      ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
      'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0,
    ];
    const fReq = [[[
      'Fbv4je',
      JSON.stringify(['garturlreq', garturlreq, articleId, Number(ts), sg]),
      null,
      'generic',
    ]]];
    const res = await guardedFetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': UA,
      },
      body: 'f.req=' + encodeURIComponent(JSON.stringify(fReq)),
    });
    if (!res || !res.ok) {
      await res?.body?.cancel().catch(() => {});
      return null;
    }
    const text = await readBodyCapped(res);
    const chunk = text.split('\n\n')[1] ?? text;
    const outer = JSON.parse(chunk.substring(chunk.indexOf('[')));
    const frame = outer.find((x: unknown[]) => Array.isArray(x) && x[0] === 'wrb.fr');
    if (!frame || typeof frame[2] !== 'string') return null;
    const inner = JSON.parse(frame[2]);
    const target = inner?.[1];
    if (typeof target !== 'string') return null;
    const u = new URL(target);
    if (u.hostname.includes('google') || isBlockedUrl(u)) return null;
    return target;
  } catch {
    return null;
  }
}

// Paragraphs come from the article's block elements, not from textContent
// splitting — minified pages have no newlines between blocks, so a
// newline-split yields one unusable wall of text (or nothing at all).
function paragraphsFromArticle(article: { content?: string | null; textContent?: string | null }): string[] {
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
  if (article.content) {
    const doc = new DOMParser().parseFromString(article.content, 'text/html');
    if (doc) {
      const blocks = Array.from(doc.querySelectorAll('p, li, blockquote, h2, h3, h4'))
        .map((el) => clean(el.textContent ?? ''))
        .filter((p) => p.length > 1);
      if (blocks.length > 0) return blocks;
    }
  }
  const text = clean(article.textContent ?? '');
  if (!text) return [];
  // Last resort: chunk the flat text at word boundaries.
  const chunks: string[] = [];
  for (let i = 0; i < text.length && chunks.length < 40; ) {
    let end = Math.min(i + 800, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > i + 200) end = space;
    }
    chunks.push(text.slice(i, end).trim());
    i = end;
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const fail = (error: string, status = 200) =>
    // 200 with success:false — extraction failure is an expected outcome the
    // client falls back from quietly, not a server error.
    new Response(JSON.stringify({ success: false, error }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // Signed-in users only: this endpoint fetches caller-supplied URLs and
    // must not be an anonymous fetch proxy. Signature-verified via GoTrue
    // (the functions gateway runs VERIFY_JWT=false). Local testing may set
    // EXTRACT_AUTH_OPTIONAL=1; never set it in production.
    if (Deno.env.get('EXTRACT_AUTH_OPTIONAL') !== '1') {
      const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
      const claims = await verifyJwtClaims(token);
      if (!claims?.sub) return fail('auth required', 401);
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const rawUrl = typeof body?.url === 'string' ? body.url : '';
    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return fail('invalid url');
    }
    if (isBlockedUrl(target)) return fail('blocked url');

    // Resolve Google News interstitials to the publisher URL BEFORE the main
    // fetch — their pages redirect via JS, so fetching them yields no article.
    if (target.hostname.endsWith('news.google.com')) {
      const publisherUrl = await resolveGoogleNews(target);
      if (!publisherUrl) return fail('could not resolve google news link');
      target = new URL(publisherUrl);
      if (isBlockedUrl(target)) return fail('blocked url');
    }

    const page = await fetchPage(target.toString());
    if (!page) return fail('fetch failed');

    const document = new DOMParser().parseFromString(page.html, 'text/html');
    if (!document) return fail('unparseable page');
    const article = new Readability(document as unknown as Document).parse();
    if (!article?.textContent?.trim()) return fail('no readable content');

    const paragraphs = paragraphsFromArticle(article);
    if (paragraphs.length === 0) return fail('no readable content');

    // Cap total size; always keep at least one (possibly trimmed) paragraph.
    const capped: string[] = [];
    let total = 0;
    for (const p of paragraphs) {
      if (total + p.length > MAX_TEXT_CHARS) {
        if (capped.length === 0) capped.push(p.slice(0, MAX_TEXT_CHARS));
        break;
      }
      capped.push(p);
      total += p.length;
    }

    return new Response(JSON.stringify({
      success: true,
      title: article.title || null,
      byline: article.byline || null,
      siteName: article.siteName || new URL(page.finalUrl).hostname,
      sourceUrl: page.finalUrl,
      paragraphs: capped,
      truncated: capped.length < paragraphs.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('extract-article error:', error);
    return fail(error instanceof Error ? error.message : 'extraction failed');
  }
});
