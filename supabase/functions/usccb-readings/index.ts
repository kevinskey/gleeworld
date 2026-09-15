// Daily Catholic readings. Originally targeted USCCB directly but their
// Cloudflare Bot Fight Mode returns 403 / stub to every server-side fetch;
// a second implementation then scraped universalis.com instead. Both were
// runtime scrapes of a third-party site's HTML — fragile (broken once
// already by anti-bot measures) and a licensing risk (serving scraped
// third-party text as `html`).
//
// Phase 0 of the Prayer module (docs/superpowers/plans/2026-08-04-prayer-
// phase0.md) imported a public-domain Catholic Bible (WEBCE) and the full
// liturgical calendar + reading citations into our own database. Phase 1
// (-phase1.md, Task 4) replaces the scrape with a composition of two local
// RPCs: `prayer_day` (calendar + citations) and `prayer_reading_text`
// (citation ranges -> WEBCE verse text). No outbound HTTP request happens
// in this function anymore.
//
// The function name is kept as `usccb-readings` for backward compatibility
// with deployed clients (it was already a misnomer before this change), and
// its response contract — { date, sourceUrl, liturgicalTitle, readings:
// [{ heading, citation, summary, html }] } — is unchanged; see
// __tests__/contract.test.ts, which pins that shape.
//
// Caveat carried over from the scrape era: WEBCE is a different English
// translation from what is proclaimed at Mass (the Lectionary uses NABRE,
// which is not public domain — see the Prayer module design doc's licensing
// section). Directors will notice the wording differs. The Responsorial
// Psalm now DOES include full verse text, unlike the old Universalis source,
// which stripped it to a citation only.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildReadingsResponse } from "./runReadings.ts";

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
    // gw_prayer_calendar_days / gw_prayer_readings / gw_bible_* are readable
    // by any authenticated user (see 20260804120000_prayer_calendar.sql and
    // 20260804130000_prayer_bible.sql), so the anon key is sufficient here —
    // no service role needed for a read-only reference-data lookup.
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const body = await buildReadingsResponse(date, supabase);
    return json(body, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 502);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
