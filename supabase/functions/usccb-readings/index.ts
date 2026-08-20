// Daily Catholic readings proxy. Originally targeted USCCB but their
// Cloudflare Bot Fight Mode returns 403 / stub to every server-side
// fetch, so it moved to scraping universalis.com instead — then, here,
// off scraping entirely: it now serves GleeWorld's own Prayer module data
// (the LitCal calendar, catholic-readings-api citations, and public-domain
// WEBCE verses imported in Phase 0, resolved via the Phase 1 citation
// parser). No outbound HTTP request happens in this function any more.
//
// This also fixes a real limitation of the old source: Universalis's
// mass.htm page strips the Responsorial Psalm body to a citation only,
// so directors had to paste the psalm verses in by hand. The psalm now
// renders full verse text like every other reading.
//
// The function name is kept as `usccb-readings` for backward compat with
// deployed clients; the response contract is unchanged (pinned by
// localReadings.test.ts), only the source changed.
//
// docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildLocalReadings } from "./localReadings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { date?: string }

// Shown when Phase 0's calendar import has no row for the requested date.
// Coverage is 2020–2035 for the calendar and 2026–2027 for reading citations
// (see docs/superpowers/plans/2026-08-04-prayer-phase0.md); a date outside
// that window is the local equivalent of Universalis's old "not published
// yet" case, and the frontend already treats `outOfRange` as a pending
// state rather than an error — see ReadingsModal.tsx.
const READINGS_NOT_AVAILABLE =
  "Readings for this date aren't in the calendar yet — check back later.";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: ReqBody;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const date = (payload.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "date must be YYYY-MM-DD" }, 400);
  }

  // gw_prayer_calendar_days / gw_bible_verses are readable by every
  // authenticated user (see 20260804120000_prayer_calendar.sql and
  // 20260804130000_prayer_bible.sql), so the service-role client here is
  // read-only convenience, not a privilege elevation — it reads nothing
  // tenant-scoped.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { liturgicalTitle, readings } = await buildLocalReadings(supabase, date);
    if (readings.length === 0) {
      return json({
        date,
        sourceUrl: "https://gleeworld.org/prayer",
        liturgicalTitle,
        readings,
        error: READINGS_NOT_AVAILABLE,
        outOfRange: true,
      }, 200);
    }
    return json({ date, sourceUrl: "https://gleeworld.org/prayer", liturgicalTitle, readings }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
