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
import { parseHTML } from 'https://esm.sh/linkedom@0.16.11';
import { Readability } from 'https://esm.sh/@mozilla/readability@0.5.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_TEXT_CHARS = 20000;
const FETCH_TIMEOUT_MS = 10000;
const UA = 'Mozilla/5.0 (compatible; GleeWorld News Reader/1.0)';

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
// via JS, not HTTP — dig the publisher URL out of the interstitial markup.
function publisherUrlFromGoogleNews(html: string): string | null {
  const meta = html.match(/http-equiv=["']refresh["'][^>]*url=([^"'>]+)/i);
  if (meta && !meta[1].includes('google.')) return meta[1];
  const links = html.match(/https?:\/\/[^"'\s<>]+/g) ?? [];
  for (const link of links) {
    try {
      const u = new URL(link);
      if (u.hostname.includes('google') || u.hostname.includes('gstatic') || u.hostname.includes('w3.org')) continue;
      if (isBlockedUrl(u)) continue;
      return link;
    } catch { /* not a URL */ }
  }
  return null;
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

    let page = await fetchPage(target.toString());
    if (!page) return fail('fetch failed');

    if (new URL(page.finalUrl).hostname.endsWith('news.google.com')) {
      const publisherUrl = publisherUrlFromGoogleNews(page.html);
      if (!publisherUrl) return fail('could not resolve google news link');
      page = await fetchPage(publisherUrl);
      if (!page) return fail('publisher fetch failed');
    }

    const { document } = parseHTML(page.html);
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
