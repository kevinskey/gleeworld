// Daily Catholic readings. Used to scrape universalis.com at request time
// (see git history) — Prayer Phase 0 imported the Roman calendar, reading
// citations, and a public-domain Catholic Bible (WEBCE) into gw_prayer_* /
// gw_bible_*, and Phase 1 built the pieces (src/lib/prayer/citation.ts,
// prayer_day()/prayer_reading_text() RPCs) needed to serve from that instead.
//
// docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4. This closes
// three problems the scrape had: it served a commercial third party's text
// (licensing exposure Phase 0 exists to avoid), it broke once already to
// anti-bot measures, and Universalis strips the Responsorial Psalm body
// (citation only) — the psalm is now full text, from our own database.
//
// All composition logic lives in readings.ts, which takes a plain
// { rpc() } client and is unit-tested under Vitest; this file only owns
// Deno's serve()/env and stays a thin, untested wrapper — same split as
// supabase/functions/event-share/{index,runShare}.ts.
//
// The function name is kept as `usccb-readings` for backward compat with
// deployed clients; only the source changed. Response contract is unchanged
// — see readings.ts's RespOk and its contract.test.ts.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getReadingsForDate } from "./readings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { date?: string }

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: ReqBody;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const date = (payload.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "date must be YYYY-MM-DD" }, 400);
  }

  // Service role: gw_prayer_*/gw_bible_* are readable to every authenticated
  // user anyway (20260804120000_prayer_calendar.sql,
  // 20260804130000_prayer_bible.sql), and this endpoint has never required a
  // caller JWT — the old scrape fetched a public page with no auth either.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await getReadingsForDate(supabase, date);
    return json(body, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 502);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
