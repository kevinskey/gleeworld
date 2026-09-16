// Daily Catholic readings, served from our own data.
//
// Originally targeted USCCB (blocked by their Cloudflare Bot Fight Mode),
// then scraped universalis.com. Neither is licensable to redistribute at
// scale, and Universalis's mass.htm strips the Responsorial Psalm body to a
// citation. Phase 0 (docs/superpowers/plans/2026-08-04-prayer-phase0.md)
// imported the calendar, reading citations, and the public-domain WEBCE
// Bible; Phase 1 Task 4 retires the scrape in favour of them. This function
// makes no outbound HTTP request.
//
// The function name stays `usccb-readings` for backward compatibility —
// deployed clients call it by name — and its response contract is
// unchanged: { date, sourceUrl, liturgicalTitle, readings: [{ heading,
// citation, summary, html }] }.

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
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  try {
    const result = await buildReadingsResponse({ supabase, date });
    return json(result, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 502);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
