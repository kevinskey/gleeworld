// Daily Catholic readings. Originally targeted USCCB but their Cloudflare
// Bot Fight Mode returns 403 / stub to every server-side fetch, so this moved
// to scraping universalis.com instead — same lectionary, less hostile to
// crawlers. That scrape has now been replaced entirely: readings resolve
// from our own local data (Phase 0's calendar + reading citations + WEBCE
// Bible, Phase 1's citation parser) via the prayer_day / prayer_reading_text
// RPCs. See docs/superpowers/plans/2026-08-04-prayer-phase1.md, Task 4.
//
// This function makes NO outbound HTTP request. The Responsorial Psalm now
// carries real verse text instead of a citation-only stub — Universalis's
// mass.htm page stripped the psalm body, which used to mean directors pasted
// psalm verses by hand when planning the song slot.
//
// The function name is kept as `usccb-readings` for backward compat with
// deployed clients; only the source and parser changed. The response
// contract — { date, sourceUrl, liturgicalTitle, readings } — is unchanged,
// pinned by __tests__/buildResponse.contract.test.ts.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildReadingsResponse } from "./buildResponse.ts";

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

  // Reference tables (gw_prayer_calendar_days, gw_bible_*) are readable by
  // any authenticated user — see 20260804120000_prayer_calendar.sql and
  // 20260804130000_prayer_bible.sql. Forward the caller's own JWT rather
  // than elevating to service role, matching supabase/functions/event-share.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  try {
    const body = await buildReadingsResponse(date, supabase);
    return json(body, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Could not build readings" }, 502);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
