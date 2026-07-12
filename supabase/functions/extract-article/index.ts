// Server-side article extraction for the Command Center news reader.
// Browsers can't embed news sites (X-Frame-Options / frame-ancestors), and
// RSS only carries a teaser — so the reader sheet asks this function for the
// story body. Fetches the page server-side, runs Mozilla Readability, and
// returns plain-text paragraphs (never raw HTML — no XSS surface).
//
// Known, accepted trade-offs (Kevin, 2026-07-12): extraction is best-effort
// (paywalls/JS-rendered pages fail → client keeps the feed summary), and
// full-text display is a republication call made knowingly; the sheet always
// keeps the "Open full article" attribution link to the source.
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.48/deno-dom-wasm.ts';
import { Readability } from 'https://esm.sh/@mozilla/readability@0.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const FETCH_TIMEOUT_MS = 10000;
// Full browser UA: many outlets 403 anything that self-identifies as a bot,
// and this fetch is a reader-app page load on a user's behalf, not a crawl.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// SSRF guard: this function fetches caller-supplied URLs, so refuse anything
// that could reach the droplet's internal network.
function isBlockedUrl(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === 'kong' || host.includes('supabase')) return true;
  // IPv4 literals: block private/link-local/loopback ranges.
  const m = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) return true;
  }
  if (host.includes(':')) return true; // IPv6 literals — not worth allowlisting
  return false;
}

async function fetchPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const finalUrl = res.url || url;
    if (isBlockedUrl(new URL(finalUrl))) return null; // redirect landed somewhere internal
    const html = await res.text();
    if (html.length > MAX_HTML_BYTES) return { html: html.slice(0, MAX_HTML_BYTES), finalUrl };
    return { html, finalUrl };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Google News RSS links point at news.google.com interstitials that redirect
// via JS, not HTTP. Old-format article ids embed the publisher URL in the
// base64 payload; new-format ids (post-2024, the common case) require asking
// Google's own DotsSplashUi batchexecute endpoint to decode them — the same
// mechanism the interstitial page itself uses (and what the public
// googlenewsdecoder tooling does). Everything is best-effort: any failure
// returns null and the caller reports extraction failure.
function urlFromArticleId(articleId: string): string | null {
  // Old format: the base64url payload contains the URL as printable ASCII.
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

  // New format: scrape the interstitial's signature/timestamp attributes,
  // then ask batchexecute to decode the id into the publisher URL.
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': UA,
      },
      body: 'f.req=' + encodeURIComponent(JSON.stringify(fReq)),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const fail = (error: string) =>
    // 200 with success:false — extraction failure is an expected outcome the
    // client falls back from quietly, not a server error.
    new Response(JSON.stringify({ success: false, error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
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

    const paragraphs = article.textContent
      .split(/\n\s*\n|\n(?=\S)/)
      .map((p: string) => p.replace(/\s+/g, ' ').trim())
      .filter((p: string) => p.length > 1);

    // Cap total size; keep whole paragraphs.
    const capped: string[] = [];
    let total = 0;
    for (const p of paragraphs) {
      if (total + p.length > MAX_TEXT_CHARS) break;
      capped.push(p);
      total += p.length;
    }
    if (capped.length === 0) return fail('no readable content');

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
