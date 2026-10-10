// Daily Catholic readings. Originally targeted USCCB but their Cloudflare
// Bot Fight Mode returns 403 to every server-side fetch, so this moved to
// scraping universalis.com instead — same lectionary, less hostile to
// crawlers, but still a runtime dependency on a commercial third party's
// HTML, and still stripped the Responsorial Psalm body to a citation only.
//
// Phase 0/1 of the Prayer add-on (docs/superpowers/plans/2026-08-04-prayer-
// phase0.md, -phase1.md) built exactly what removes that dependency: a
// locally-hosted, public-domain Catholic Bible (WEBCE) plus the liturgical
// calendar and reading citations, joined by the prayer_day_full() RPC. This
// function is now a thin adapter over that RPC — no outbound HTTP request,
// full Responsorial Psalm text, and the licensing exposure of re-serving
// scraped third-party HTML is gone.
//
// The function name is kept as `usccb-readings` for backward compatibility
// with deployed clients; only the data source changed. The response
// contract — date, sourceUrl, liturgicalTitle, readings[] — is unchanged;
// `attribution` is new and purely additive. See handler.ts (unit-tested
// under Vitest) for the mapping logic.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildReadingsResponse, type PrayerDayFull } from "./handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReqBody { date?: string }

const SITE_URL = Deno.env.get("GW_PUBLIC_SITE_URL") ?? "https://gleeworld.org";

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

  const { data, error } = await supabase.rpc("prayer_day_full", {
    p_date: date,
    p_rite: "roman_catholic",
    p_translation: "WEBCE",
  });
  if (error) return json({ error: error.message, date }, 502);

  const sourceUrl = `${SITE_URL}/prayer?date=${date}`;
  const body = buildReadingsResponse(data as PrayerDayFull, sourceUrl);
  return json(body, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
