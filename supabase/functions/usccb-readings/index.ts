// Daily Catholic readings. Originally targeted USCCB, but their Cloudflare
// Bot Fight Mode returns 403/stub to every server-side fetch, so this moved
// to scraping universalis.com — same lectionary, less hostile to crawlers.
//
// That was still a live scrape of a commercial third-party site: a licensing
// risk (serving someone else's copyrighted reading text as our own HTML), a
// fragility risk (already broken once by anti-bot measures, with no
// fallback), and incomplete (Universalis strips the Responsorial Psalm body
// to a citation only, so directors pasted the psalm verses in by hand).
//
// The Prayer module's Phase 0/1 work
// (docs/superpowers/plans/2026-08-04-prayer-phase0.md,
// docs/superpowers/plans/2026-08-04-prayer-phase1.md) fixes all three: the
// liturgical calendar, reading citations, and a full public-domain Bible
// (WEBCE) are now hosted locally. This function is a thin adapter over the
// prayer_day_full() RPC — no outbound HTTP request, ever.
//
// The function name is kept as `usccb-readings` for backward compatibility
// with deployed clients, and so is its exact response contract — see
// contract.test.ts, which is the regression guard for that shape.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildReadingsResponse } from "./buildReadingsResponse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { date?: string }

// The calendar covers 2020-2035 (LitCal), but reading citations only exist
// upstream for 2026-2027 (catholic-readings-api) — see the Prayer Phase 0
// plan's "Known constraints". A date outside that window resolves a real
// liturgical day with zero readings; report why instead of leaving the
// sheet looking silently broken.
const READINGS_NOT_IMPORTED = "Readings for this date have not been imported yet.";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let payload: ReqBody;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const date = (payload.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: "date must be YYYY-MM-DD" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await buildReadingsResponse(
      supabase,
      date,
      `https://gleeworld.org/prayer?date=${date}`,
    );
    if (body.readings.length === 0) {
      return json({ ...body, error: READINGS_NOT_IMPORTED, outOfRange: true }, 200);
    }
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
