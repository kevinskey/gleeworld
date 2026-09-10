// Daily Catholic readings proxy. Originally targeted USCCB but their
// Cloudflare Bot Fight Mode returns 403 / stub to every server-side fetch, so
// this moved to scraping universalis.com — then, in Phase 1 of the Prayer
// module (docs/superpowers/plans/2026-08-04-prayer-phase1.md), to our own
// prayer_day() / prayer_reading_text() RPCs over locally-hosted, public-domain
// WEBCE scripture. There is no outbound HTTP request left in this function.
//
// This also fixes a real gap in the old scrape: Universalis's mass.htm page
// stripped the Responsorial Psalm body (citation only), so directors pasted
// the psalm verses by hand when planning the song slot. The psalm now comes
// back with full verse text like every other reading.
//
// The function name is kept as `usccb-readings` for backward compatibility —
// deployed clients call it by this name — even though the upstream is our
// own database, not USCCB or Universalis.
//
// The response contract is unchanged from before this rewrite (pinned by
// contract.test.ts): { date, sourceUrl, liturgicalTitle, readings: [{
// heading, citation, summary, html }] }.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildReadings } from "./buildReadings.ts";

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

  // gw_prayer_calendar_days / gw_prayer_readings / gw_bible_* are platform
  // reference tables, readable by any authenticated user (see
  // 20260804120000_prayer_calendar.sql) — the service role client just
  // avoids needing to forward a caller JWT for read-only reference data.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await buildReadings(date, supabase);
    return json(body, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
