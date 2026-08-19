// ext-import-url — Single-URL repertoire importer.
//
// User-initiated (not a crawler). Fetches ONE URL, parses OpenGraph +
// JSON-LD + site-specific hints, returns structured fields for the
// client to review and save. Never bulk-crawls.
//
// Supported hosts (best-effort — site redesigns can break these):
//   - jwpepper.com          — school catalog
//   - sheetmusicplus.com    — general catalog
//   - musicnotes.com        — digital sheet music
//   - musicspoke.com        — indie composers
//   - Any other host        — OpenGraph + JSON-LD only
//
// Response shape:
//   { ok: true, fetch_ok: bool, source: string, source_id: string,
//     parsed: { title, composer, publisher, voicing, ensemble_type,
//               list_price_cents, currency, thumbnail_url,
//               audio_preview_url, source_page_url, product_url },
//     hint: string }
//
// If fetch_ok=false the client should show a manual form pre-filled
// with whatever fields we did extract from the URL structure alone.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.4 Safari/605.1.15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body { url?: string; }

interface Parsed {
  title: string | null;
  composer: string | null;
  publisher: string | null;
  voicing: string | null;
  ensemble_type: string | null;
  list_price_cents: number | null;
  currency: string | null;
  thumbnail_url: string | null;
  audio_preview_url: string | null;
  source_page_url: string;
  product_url: string | null;
}

function classifySource(host: string): string {
  const h = host.toLowerCase();
  if (h.includes("jwpepper")) return "jwpepper";
  if (h.includes("sheetmusicplus")) return "sheetmusicplus";
  if (h.includes("musicnotes")) return "musicnotes";
  if (h.includes("musicspoke")) return "musicspoke";
  if (h.includes("halleonard")) return "halleonard";
  return "external";
}

function stableIdFromUrl(url: URL, source: string): string {
  // Prefer the SKU-ish last path segment; fall back to a hash of the path.
  const segs = url.pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1] || url.pathname;
  return `${source}:${last}`.slice(0, 200);
}

function priceStringToCents(s: string | null): { cents: number | null; currency: string | null } {
  if (!s) return { cents: null, currency: null };
  const m = s.match(/([$£€])?\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  if (!m) return { cents: null, currency: null };
  const currency = m[1] === "£" ? "GBP" : m[1] === "€" ? "EUR" : "USD";
  return { cents: Math.round(parseFloat(m[2]) * 100), currency };
}

function inferEnsemble(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(satb|ssaa|ttbb|ssa|tb|choir|chorus|choral)\b/.test(t)) return "choral";
  if (/\b(concert band|wind band|marching band|wind ensemble|band)\b/.test(t)) return "band";
  if (/\b(orchestra|symphony|strings)\b/.test(t)) return "orchestra";
  if (/\b(chamber|quartet|quintet|trio|duet|duo)\b/.test(t)) return "chamber";
  if (/\b(solo|piano solo|voice \+ piano)\b/.test(t)) return "solo";
  return null;
}

function inferVoicing(text: string): string | null {
  const m = text.match(/\b(SATB|SSAATTBB|SSAA|TTBB|SSA|SAB|TB|TTBBB|SATTB)\b/i);
  return m ? m[1].toUpperCase() : null;
}

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

function parseJsonLd(html: string): any[] {
  const out: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed); else out.push(parsed);
    } catch { /* skip malformed */ }
  }
  return out;
}

function extractFromJsonLd(nodes: any[]): Partial<Parsed> {
  const product = nodes.find(
    (n) => n && (n["@type"] === "Product" || (Array.isArray(n["@type"]) && n["@type"].includes("Product")))
  );
  if (!product) return {};
  const offers = product.offers || {};
  const priceStr = String(offers.price ?? "");
  const currency = offers.priceCurrency ?? null;
  return {
    title: product.name ?? null,
    thumbnail_url: Array.isArray(product.image) ? product.image[0] : (product.image ?? null),
    publisher: product.brand?.name ?? product.manufacturer?.name ?? null,
    list_price_cents: priceStr ? Math.round(parseFloat(priceStr) * 100) : null,
    currency,
  };
}

async function fetchPage(url: string): Promise<{ html: string | null; status: number; ok: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });
    const html = res.ok ? await res.text() : null;
    return { html, status: res.status, ok: res.ok };
  } catch (_e) {
    return { html: null, status: 0, ok: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const body: Body = await req.json().catch(() => ({}));
  const rawUrl = (body.url ?? "").trim();
  if (!rawUrl) {
    return new Response(JSON.stringify({ ok: false, error: "url required" }), {
      status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let u: URL;
  try { u = new URL(rawUrl); } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid url" }), {
      status: 400, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const source = classifySource(u.host);
  const source_id = stableIdFromUrl(u, source);
  const parsed: Parsed = {
    title: null, composer: null, publisher: null, voicing: null,
    ensemble_type: null, list_price_cents: null, currency: null,
    thumbnail_url: null, audio_preview_url: null,
    source_page_url: u.toString(),
    product_url: u.toString(),
  };

  const { html, status, ok } = await fetchPage(u.toString());
  let hint = "";

  if (!ok || !html) {
    hint = `Fetch failed (${status}). The site likely blocks server-side requests — fill in the fields manually.`;
    return new Response(JSON.stringify({
      ok: true, fetch_ok: false, source, source_id, parsed, hint,
    }), { headers: { ...corsHeaders, "content-type": "application/json" } });
  }

  // OpenGraph pass
  parsed.title = parsed.title ?? pickMeta(html, "og:title") ?? pickMeta(html, "twitter:title");
  parsed.thumbnail_url = parsed.thumbnail_url ?? pickMeta(html, "og:image") ?? pickMeta(html, "twitter:image");
  const ogDesc = pickMeta(html, "og:description") ?? pickMeta(html, "description");
  const ogSite = pickMeta(html, "og:site_name");
  if (ogSite && !parsed.publisher) parsed.publisher = ogSite;

  // JSON-LD pass
  const jsonLd = parseJsonLd(html);
  const jsonLdFields = extractFromJsonLd(jsonLd);
  for (const [k, v] of Object.entries(jsonLdFields)) {
    if (v && !(parsed as any)[k]) (parsed as any)[k] = v;
  }

  // Text-based inference from title + description
  const textCorpus = [parsed.title, ogDesc].filter(Boolean).join(" ");
  parsed.ensemble_type = parsed.ensemble_type ?? inferEnsemble(textCorpus);
  parsed.voicing = parsed.voicing ?? inferVoicing(textCorpus);

  // Site-specific selectors
  if (source === "jwpepper") {
    // JW Pepper renders composer under an "By" label
    const m = html.match(/<[^>]+class=["'][^"']*by-line[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
    if (m && !parsed.composer) parsed.composer = m[1].trim();
    const priceM = html.match(/data-price[^>]*>[^\d$]*(\$[\d.]+)/i) ?? html.match(/\$([\d]+\.[\d]{2})/);
    if (priceM && !parsed.list_price_cents) {
      const { cents, currency } = priceStringToCents(priceM[0]);
      parsed.list_price_cents = cents;
      parsed.currency = currency;
    }
  }

  if (source === "sheetmusicplus") {
    const m = html.match(/<span[^>]+itemprop=["']author["'][^>]*>([^<]+)<\/span>/i)
      ?? html.match(/By\s+<a[^>]*>([^<]+)<\/a>/i);
    if (m && !parsed.composer) parsed.composer = m[1].trim();
  }

  // Any-source composer fallback: "by Firstname Lastname" near the title.
  // Guard against picking up template junk like "IMSLP index", "Editorial",
  // "Sheet Music Plus", or single-word all-lowercase words.
  if (!parsed.composer) {
    const m = html.match(/\bby\s+([A-Z][a-zA-Zäöüéèáñç.\- ]{2,60}?)(?:<| ·|,\s|<\/|\s\|)/);
    const candidate = m ? m[1].trim() : null;
    const junk = /\b(index|editorial|reviews?|customers?|admin|imslp|cpdl|sheet\s*music)\b/i;
    if (candidate && !junk.test(candidate) && candidate.split(/\s+/).length >= 2) {
      parsed.composer = candidate;
    }
  }

  return new Response(JSON.stringify({
    ok: true, fetch_ok: true, source, source_id, parsed, hint: "",
  }), { headers: { ...corsHeaders, "content-type": "application/json" } });
});
