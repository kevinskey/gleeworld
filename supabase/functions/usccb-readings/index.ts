// Daily Catholic readings proxy. Originally targeted USCCB but their
// Cloudflare Bot Fight Mode returns 403/stub to every server-side
// fetch, so we source from universalis.com — same lectionary, less
// hostile to crawlers, and returns clean parseable HTML.
//
// The function name is kept as `usccb-readings` for backward compat
// with deployed clients; only the upstream and parser changed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { date?: string }

interface ReadingBlock {
  heading: string;          // "First reading", "Responsorial Psalm", "Gospel", etc.
  citation: string | null;  // "Acts 3:1-10"
  summary: string | null;   // The h4 "title" line, e.g. "I will give you what I have…"
  html: string;             // Sanitized HTML safe to inject into our modal
}

interface RespOk {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: ReqBody;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const date = (payload.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "date must be YYYY-MM-DD" }, 400);
  }
  const yyyymmdd = date.replace(/-/g, "");
  const sourceUrl = `https://universalis.com/${yyyymmdd}/mass.htm`;

  const upstream = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "GleeWorld-LiturgyPlanner/1.0 (https://gleeworld.org)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!upstream.ok) {
    return json({ error: `Upstream ${upstream.status}`, sourceUrl }, 502);
  }
  const html = await upstream.text();

  const parsed = parseUniversalisReadings(html);
  const body: RespOk = { date, sourceUrl, ...parsed };
  return json(body, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Universalis layout per <table class="each"> "section header":
 *   <hr class="shortrule"/>
 *   <table class="each">
 *     <tr><th>{HEADING}</th>[<th>{CITATION}</th>]</tr>
 *     [<tr><th>{CITATION}</th></tr>]   (Responsorial sometimes splits)
 *   </table>
 *   [<h4>{SUMMARY}</h4>]
 *   <div class="p">…body paragraphs…</div>
 *   <div class="pi">…</div>          (indented continuation)
 *   <div class="v">…</div>           (verse)
 *   ... up to the next <hr class="shortrule"/>
 *
 * We split on <hr class="shortrule"/> so each chunk is one logical
 * reading block, then pull heading / citation / summary / body.
 */
function parseUniversalisReadings(html: string): { liturgicalTitle: string | null; readings: ReadingBlock[] } {
  const liturgicalTitle = extractTitle(html);

  // Trim to the readings region: everything between "Mass readings" or
  // the first <hr class="shortrule"/> and the page footer. The
  // shortrule split below tolerates anything before the first rule.
  const chunks = html.split(/<hr\s+class="shortrule"\s*\/?>/i);
  // Drop the first chunk (page chrome before any reading).
  chunks.shift();

  const readings: ReadingBlock[] = [];
  for (const raw of chunks) {
    const block = extractBlock(raw);
    if (block) readings.push(block);
  }

  return { liturgicalTitle, readings };
}

function extractTitle(html: string): string | null {
  // The page title is "Universalis: Mass (...)". We pull the parenthetical
  // bit when available, otherwise fall back to "Daily Mass Readings".
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag) {
    const t = decode(titleTag[1]).trim();
    const paren = t.match(/Mass\s*\((.+?)\)/i);
    if (paren) return paren[1].trim();
  }
  return null;
}

function extractBlock(chunk: string): ReadingBlock | null {
  // Header row: <table class="each"> <tr><th align="left">{HEADING}</th>...
  const tableMatch = chunk.match(/<table[^>]*class="[^"]*\beach\b[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;
  const tableInner = tableMatch[1];
  const thMatches = [...tableInner.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => decode(stripTags(m[1])).trim());
  if (thMatches.length === 0) return null;

  const heading = thMatches[0];
  if (!heading) return null;
  // Skip anything that isn't actually a reading section (Universalis
  // also uses <table class="each"> for "About today's readings" etc.).
  if (!/reading|psalm|gospel|acclamation|sequence/i.test(heading)) return null;

  const citation = thMatches.slice(1).find(t => t && t.length > 0) || null;

  // Strip the table out, then grab the optional <h4> summary.
  const afterTable = chunk.slice(tableMatch.index! + tableMatch[0].length);
  let body = afterTable;
  let summary: string | null = null;
  const h4Match = body.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
  if (h4Match) {
    summary = decode(stripTags(h4Match[1])).trim();
    body = body.replace(h4Match[0], "");
  }

  body = sanitizeReadingHtml(body);

  if (!body && !summary) return null;
  return { heading, citation, summary, html: body };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8220;/g, "\u201c")
    .replace(/&#8221;/g, "\u201d")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8212;/g, "\u2014")
    .replace(/&#8230;/g, "\u2026")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201d")
    .replace(/&ldquo;/g, "\u201c")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&hellip;/g, "\u2026");
}

/**
 * Allowlist sanitize. We turn Universalis's <div class="p">,
 * <div class="pi">, <div class="v">, <div class="vi"> into plain
 * <p>/<blockquote> so the modal's prose styling can lay them out
 * uniformly. Strip everything else.
 */
function sanitizeReadingHtml(html: string): string {
  // Drop audio clip blocks, scripts, styles, etc.
  let s = html
    .replace(/<div[^>]*class="[^"]*\baudioclip\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<(script|style|iframe|object|embed|link|audio|video)[\s\S]*?<\/\1>/gi, "")
    .replace(/<hr[^>]*>/gi, "");

  // Map known universalis div classes to semantic tags.
  s = s
    .replace(/<div\s+class="p"[^>]*>([\s\S]*?)<\/div>/gi, "<p>$1</p>")
    .replace(/<div\s+class="pi"[^>]*>([\s\S]*?)<\/div>/gi, '<p style="padding-left:1.5em">$1</p>')
    .replace(/<div\s+class="v"[^>]*>([\s\S]*?)<\/div>/gi, "<blockquote>$1</blockquote>")
    .replace(/<div\s+class="vi"[^>]*>([\s\S]*?)<\/div>/gi, '<blockquote style="padding-left:1.5em">$1</blockquote>')
    .replace(/<div\s+class="rubric"[^>]*>([\s\S]*?)<\/div>/gi, '<p><em>$1</em></p>');

  const ALLOWED = new Set(["p", "br", "em", "strong", "i", "b", "u", "blockquote", "span", "h4"]);
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (full, name) => {
    const tag = name.toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    return full.match(/^<\//) ? `</${tag}>` : `<${tag}>`;
  });

  return s.replace(/\n{3,}/g, "\n\n").trim();
}
