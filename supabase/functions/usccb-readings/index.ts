// Daily Catholic readings. Originally scraped universalis.com (and, before
// that, tried USCCB directly — their Cloudflare Bot Fight Mode returns 403 /
// stub to every server-side fetch). Phase 1 of the Prayer module
// (docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4) replaced that
// scrape entirely: this function now makes NO outbound HTTP request. It
// composes two existing RPCs instead —
//   - `prayer_day` (Phase 0): the liturgical calendar + reading citations.
//   - `prayer_reading_text` (Phase 1 Task 3): resolves a citation's verse
//     ranges to actual WEBCE (public-domain) verse text.
// — using the shared citation parser (../_shared/prayer/citation.ts) to turn
// a citation string into the verse ranges prayer_reading_text expects.
//
// This fixes the three problems the scrape had: licensing exposure (scraped
// third-party HTML shown to users), fragility (already broken once by
// anti-bot measures), and incompleteness (Universalis stripped the
// Responsorial Psalm body to a citation only — WEBCE has the actual verses).
//
// The function name is kept as `usccb-readings` for backward compatibility
// with deployed clients that already call it by this name — it never
// actually served USCCB's text and still doesn't; only what it reads from
// changed. The response shape is unchanged: contract.test.ts pins it.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseCitation, type VerseRange } from "../_shared/prayer/citation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { date?: string }

interface ReadingBlock {
  heading: string;          // "First Reading", "Responsorial Psalm", "Gospel", etc.
  citation: string | null;  // "Acts 3:1-10"
  summary: string | null;   // No longer sourced — WEBCE carries no title line. Always null.
  html: string;             // Verses as <p><sup>N</sup> text</p>, plus an attribution line.
}

interface RespOk {
  date: string;
  sourceUrl: string;
  liturgicalTitle: string | null;
  readings: ReadingBlock[];
}

// Shapes returned by the RPCs this function composes. Kept local (not
// imported from src/hooks/usePrayerDay.ts) — see the import-sharing note in
// ../_shared/prayer/books.ts for why edge functions don't reach into src/;
// this is just the RPC's fixed JSON shape, not logic that could drift.
interface PrayerReadingRow {
  slot: string;
  citation: string | null;
  schema_label: string;
  source: string;
}
interface PrayerEventRow {
  event_key: string;
  name: string;
  rank_grade: number | null;
  readings: PrayerReadingRow[];
}
interface PrayerDayResult {
  date: string;
  rite: string;
  events: PrayerEventRow[];
}
interface PrayerReadingTextResult {
  translation: string;
  attribution: string | null;
  verses: Array<{ chapter: number; verse: number; text: string }>;
}

// Duck-typed to just the one call this function makes, so contract.test.ts
// can pass a plain stub instead of a real Supabase client.
interface RpcClient {
  rpc(
    fn: string,
    params?: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// The reference tables (gw_prayer_calendar_days, gw_prayer_readings,
// gw_bible_*) are readable by every authenticated user and both RPCs are
// SECURITY INVOKER (see their migrations), so this forwards the caller's own
// Authorization header rather than elevating to the service role — RLS
// applies exactly as it would for a direct client-side call.
function realSupabaseClient(req: Request): RpcClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
}

const SLOT_HEADINGS: Record<string, string> = {
  first_reading: "First Reading",
  responsorial_psalm: "Responsorial Psalm",
  second_reading: "Second Reading",
  gospel_acclamation: "Gospel Acclamation",
  gospel: "Gospel",
};

// A slot key this mapping doesn't know about yet (a rare Easter Vigil or
// Pentecost Vigil formulary, a freeform 'note' row, …) still needs a
// heading rather than a thrown error — title-case the raw key.
function headingForSlot(slot: string): string {
  const known = SLOT_HEADINGS[slot];
  if (known) return known;
  const words = slot.split("_").filter(Boolean);
  if (!words.length) return "Reading";
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The reference calendar/citation import currently only covers 2026 and
// 2027 (see the Phase 1 plan). A date outside what's imported reads back
// from prayer_day as zero events — not a licensing/publish-window limit
// the way Universalis's rolling window was, so the message says so plainly
// instead of the old (now false) "Universalis hasn't published this yet".
const READINGS_UNAVAILABLE =
  "This date isn't covered by our imported lectionary data yet " +
  "(currently 2026 and 2027). Check back as more years are added.";

/**
 * Resolves one reading's citation to rendered HTML: verses as
 * <p><sup>N</sup> text</p>, plus a trailing attribution line. Degrades to an
 * empty string — never throws — for a citation the parser couldn't resolve
 * (an unknown book, a letter-chapter reference, a freeform 'note' row) or
 * one prayer_reading_text has no verses for.
 */
async function readingHtml(
  supabase: RpcClient,
  usfmCode: string | null,
  ranges: VerseRange[],
): Promise<string> {
  if (!usfmCode || !ranges.length) return "";

  const { data, error } = await supabase.rpc("prayer_reading_text", {
    p_translation: "WEBCE",
    p_usfm: usfmCode,
    p_ranges: ranges,
  });
  if (error) {
    console.error(`prayer_reading_text(${usfmCode}) failed: ${error.message}`);
    return "";
  }

  const result = data as PrayerReadingTextResult | null;
  const verses = result?.verses ?? [];
  if (!verses.length) return "";

  const body = verses
    .map((v) => `<p><sup>${v.verse}</sup> ${escapeHtml(v.text)}</p>`)
    .join("");
  const attribution = result?.attribution
    ? `<p><em>${escapeHtml(result.attribution)}</em></p>`
    : "";
  return body + attribution;
}

// Exported (rather than only passed to Deno.serve below) so a test can
// invoke it directly with a constructed Request — the same seam
// store-checkout/index.ts uses. `deps.supabase` lets contract.test.ts (and
// any future test) substitute a stub RpcClient instead of a real Supabase
// client; production leaves it unset and gets `realSupabaseClient(req)`.
export async function handler(
  req: Request,
  deps: { supabase?: RpcClient } = {},
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: ReqBody;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const date = (payload.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "date must be YYYY-MM-DD" }, 400);
  }

  // No third-party site to link back to any more. Points at the app's own
  // Prayer preview for this date (see src/App.tsx's /prayer route), scoped
  // to whichever tenant/origin actually called this function.
  const origin = req.headers.get("origin") || "https://gleeworld.org";
  const sourceUrl = `${origin}/prayer?date=${date}`;

  const supabase = deps.supabase ?? realSupabaseClient(req);

  const { data, error } = await supabase.rpc("prayer_day", {
    p_date: date,
    p_rite: "roman_catholic",
  });
  if (error) {
    return json({ error: error.message, sourceUrl }, 502);
  }

  const day = data as PrayerDayResult | null;
  const events = day?.events ?? [];
  if (!events.length) {
    return json({
      date,
      sourceUrl,
      liturgicalTitle: null,
      readings: [],
      error: READINGS_UNAVAILABLE,
      outOfRange: true,
    }, 200);
  }

  // prayer_day already orders events by rank_grade DESC — the first one is
  // the day's primary celebration (a Sunday/solemnity outranks an optional
  // memorial on the same date), matching what a single Mass page showed.
  const topEvent = events[0];
  const liturgicalTitle = topEvent.name ?? null;

  const readings: ReadingBlock[] = await Promise.all(
    (topEvent.readings ?? []).map(async (r): Promise<ReadingBlock> => {
      const citation = r.citation ?? null;
      const parsed = citation
        ? parseCitation(citation)
        : { usfmCode: null, ranges: [] as VerseRange[], unparsed: [] as string[] };
      const html = await readingHtml(supabase, parsed.usfmCode, parsed.ranges);
      return { heading: headingForSlot(r.slot), citation, summary: null, html };
    }),
  );

  return json({ date, sourceUrl, liturgicalTitle, readings } satisfies RespOk, 200);
}

Deno.serve((req) => handler(req));

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
