// Daily Catholic readings proxy.
//
// Originally targeted USCCB, but their Cloudflare Bot Fight Mode returns
// 403/stub to every server-side fetch, so this moved to scraping
// universalis.com — same lectionary, less hostile to crawlers. That scrape is
// gone as of this phase: readings now come from our own liturgical calendar
// and public-domain WEBCE scripture (Prayer module Phase 0/1 — see
// docs/superpowers/plans/2026-08-04-prayer-phase0.md and -phase1.md). No
// outbound HTTP request happens in this function any more, and the
// Responsorial Psalm — which Universalis's page stripped to a citation —
// now carries real verse text.
//
// The function name is kept as `usccb-readings` for backward compatibility
// with deployed clients; it was already a misnomer before this change, and
// the response shape (see buildReadings.ts) is unchanged.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildReadingsResponse } from "./buildReadings.ts";

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

  // gw_prayer_calendar_days / gw_bible_* are readable by any authenticated
  // user (see 20260804120000_prayer_calendar.sql, 20260804130000_prayer_bible.sql),
  // so the caller's own JWT is forwarded rather than elevating to service role.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  try {
    const body = await buildReadingsResponse(date, supabase);
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
