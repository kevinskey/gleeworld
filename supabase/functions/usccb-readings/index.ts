// Daily Catholic readings proxy — Phase 1 of the Prayer module
// (docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4).
//
// Originally scraped universalis.com (before that, USCCB directly, until
// their Cloudflare Bot Fight Mode started returning 403/stub to every
// server-side fetch). Both were third-party scrapes: a licensing risk (see
// docs/superpowers/specs/2026-08-04-prayer-module-design.md), fragile to
// upstream markup changes, and Universalis's mass.htm page strips the
// Responsorial Psalm body down to a bare citation.
//
// This now performs NO outbound HTTP fetch of any kind. It reads the day's
// celebration and reading citations from `prayer_day()` (Phase 0), parses
// each citation with the shared lectionary-citation parser, and resolves
// verse text from our own public-domain WEBCE import via
// `prayer_reading_text()` (Phase 1). Both RPCs are SECURITY INVOKER, so this
// runs as the calling user against the same RLS that already lets every
// authenticated user read the tenant-less Prayer reference tables.
//
// The function name is kept as `usccb-readings` for backward compatibility
// with deployed clients; the response contract is unchanged and pinned by
// formatResponse.test.ts.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseCitation } from "../_shared/liturgy/citation.ts";
import {
  buildReadingsResponse,
  type ReadingInput,
  type RespOk,
  type VerseRow,
} from "./formatResponse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { date?: string }

// The only translation Phase 0 imported. A future translation switch is a
// tenant-config concern, not something this function decides on its own.
const TRANSLATION = "WEBCE";

interface PrayerDayReading {
  slot: string;
  citation: string;
  schema_label: string;
}

interface PrayerDayEvent {
  name: string;
  rank_grade: number | null;
  readings: PrayerDayReading[];
}

interface PrayerDayResult {
  date: string;
  rite: string;
  events: PrayerDayEvent[];
}

interface PrayerReadingTextResult {
  translation: string;
  attribution: string | null;
  verses: VerseRow[];
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  // WEBCE (public domain, hosted by eBible.org) is the actual source of the
  // scripture text rendered below — see gw_bible_translations.attribution,
  // also included inline with every reading. Not universalis.com.
  const sourceUrl = "https://ebible.org/";

  const { data: day, error: dayError } = await supabase.rpc("prayer_day", {
    p_date: date,
    p_rite: "roman_catholic",
  });
  if (dayError) {
    return json({ error: dayError.message, sourceUrl }, 502);
  }

  const events = ((day as PrayerDayResult | null)?.events ?? []);
  // prayer_day() already orders events by rank_grade DESC — the highest-
  // ranked celebration (e.g. a memorial over its underlying feria) is first.
  // The old scrape likewise only ever returned one Mass's worth of readings.
  const event = events[0] ?? null;

  if (!event) {
    const body: RespOk = { date, sourceUrl, liturgicalTitle: null, readings: [] };
    return json(body, 200);
  }

  const readingInputs: ReadingInput[] = [];
  for (const reading of event.readings) {
    const parsed = parseCitation(reading.citation);
    let verses: VerseRow[] = [];
    let attribution: string | null = null;

    if (parsed.usfmCode && parsed.ranges.length > 0) {
      const { data: text, error: textError } = await supabase.rpc("prayer_reading_text", {
        p_translation: TRANSLATION,
        p_usfm: parsed.usfmCode,
        p_ranges: parsed.ranges,
      });
      if (textError) {
        return json({ error: textError.message, sourceUrl }, 502);
      }
      const resolved = text as PrayerReadingTextResult | null;
      verses = resolved?.verses ?? [];
      attribution = resolved?.attribution ?? null;
    }

    readingInputs.push({
      slot: reading.slot,
      citation: reading.citation,
      schemaLabel: reading.schema_label ?? "",
      verses,
      attribution,
    });
  }

  const body = buildReadingsResponse(date, sourceUrl, event.name, readingInputs);
  return json(body, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
