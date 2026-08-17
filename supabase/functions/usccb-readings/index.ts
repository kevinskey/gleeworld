// Daily Catholic readings proxy. Originally targeted USCCB but their
// Cloudflare Bot Fight Mode returns 403 / stub to every server-side
// fetch, so we source from universalis.com — same lectionary, less
// hostile to crawlers, and returns clean parseable HTML.
//
// Caveat: Universalis's mass.htm page strips the Responsorial Psalm body
// (citation only). The frontend surfaces this — directors paste the
// psalm verses by hand when planning the song slot.
//
// The function name is kept as `usccb-readings` for backward compat
// with deployed clients; only the upstream and parser changed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  isReadingsPageForDate,
  READINGS_OUT_OF_RANGE,
} from "../_shared/liturgy/readingsWindow.ts";

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

  // Universalis 302s out-of-window dates to /n-otherdates.htm. fetch follows
  // redirects, so that arrives as a healthy 200 with no readings in it. Report
  // the real reason instead of letting the parser come up empty and look
  // broken.
  if (!isReadingsPageForDate(upstream.url, yyyymmdd)) {
    return json({
      date,
      sourceUrl,
      liturgicalTitle: null,
      readings: [],
      error: READINGS_OUT_OF_RANGE,
      outOfRange: true,
    }, 200);
  }

  const html = await upstream.text();

  const parsed = parseUniversalisReadings(html, yyyymmdd);
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
function parseUniversalisReadings(html: string, yyyymmdd: string): { liturgicalTitle: string | null; readings: ReadingBlock[] } {
  const liturgicalTitle = extractTitle(html, yyyymmdd);

  const chunks = html.split(/<hr\s+class="shortrule"\s*\/?>/i);
  chunks.shift();

  const readings: ReadingBlock[] = [];
  for (const raw of chunks) {
    const block = extractBlock(raw);
    if (block) readings.push(block);
  }

  return { liturgicalTitle, readings };
}

function extractTitle(html: string, yyyymmdd: string): string | null {
  // Universalis renders the day's own name in the anchor that links back
  // to this same date, e.g.
  //   <a class="optmem" href="/20260704/mass.htm">Saturday of week 13 in Ordinary Time<br>…
  //   <a class="feast" href="/20260705/mass.htm">14th Sunday in Ordinary Time</a>
  // Take the text up to the first <br> or </a>. This covers ordinary
  // weekdays/Sundays that the <title> tag ("Readings at Mass") does not.
  const anchor = new RegExp(
    `<a[^>]*href="/${yyyymmdd}/mass\\.htm"[^>]*>([\\s\\S]*?)(?:<br|</a>)`,
    'i',
  );
  const m = html.match(anchor);
  if (m) {
    const t = decode(stripTags(m[1])).replace(/\s+/g, ' ').trim();
    if (t && !/^readings at mass$/i.test(t)) return t;
  }
  // Fallback: the older "Mass (Name)" <title> form (solemnities/feasts
  // whose page title carries the celebration name in parentheses).
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag) {
    const t = decode(titleTag[1]).trim();
    const paren = t.match(/Mass\s*\((.+?)\)/i);
    if (paren) return paren[1].trim();
  }
  return null;
}

function extractBlock(chunk: string): ReadingBlock | null {
  const tableMatch = chunk.match(/<table[^>]*class="[^"]*\beach\b[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;
  const tableInner = tableMatch[1];
  const thMatches = [...tableInner.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => decode(stripTags(m[1])).trim());
  if (thMatches.length === 0) return null;

  const heading = thMatches[0];
  if (!heading) return null;
  if (!/reading|psalm|gospel|acclamation|sequence/i.test(heading)) return null;

  const citation = thMatches.slice(1).find(t => t && t.length > 0) || null;

  let body = truncateAtPageChrome(
    chunk.slice(tableMatch.index! + tableMatch[0].length),
  );
  let summary: string | null = null;
  const h4Match = body.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
  if (h4Match) {
    summary = decode(stripTags(h4Match[1])).trim();
    body = body.replace(h4Match[0], "");
  }

  body = sanitizeReadingHtml(body);

  // Include citation-only entries (e.g. the Responsorial Psalm on
  // mass.htm) so the frontend can still auto-fill its citation. The
  // popover gracefully handles an empty body by showing the citation.
  if (!body && !summary && !citation) return null;
  return { heading, citation, summary, html: body };
}

/**
 * The final shortrule chunk carries the rest of the page after the last
 * reading: the Greek/English cross-link (<p class="rubric">), the
 * "Christian Art" blurb (<h2>), the Dates navigation and the copyright
 * block. Tag-stripping keeps their TEXT, so it all rode along after the
 * Gospel. No reading body ever contains an <h2> or these rubric/nav
 * phrases, so cut at the earliest marker.
 */
function truncateAtPageChrome(body: string): string {
  const markers = [
    /<h2[\s>]/i,
    /<p\s+class="rubric"[^>]*>\s*You can also view this page/i,
    /<!--\s*Delta/i,
    /<div[^>]*class="[^"]*\bbottomstuff\b/i,
  ];
  let cut = -1;
  for (const re of markers) {
    const m = body.match(re);
    if (m && m.index !== undefined && (cut < 0 || m.index < cut)) cut = m.index;
  }
  return cut < 0 ? body : body.slice(0, cut);
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
  let s = html
    .replace(/<div[^>]*class="[^"]*\baudioclip\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<(script|style|iframe|object|embed|link|audio|video)[\s\S]*?<\/\1>/gi, "")
    .replace(/<hr[^>]*>/gi, "");

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
