// Daily Catholic readings. Serves calendar + citations from `prayer_day()`
// and scripture text from `prayer_reading_text()` — both local Postgres RPCs
// backed by the public-domain data imported in Phase 0
// (docs/superpowers/plans/2026-08-04-prayer-phase0.md) and resolved via the
// citation parser from Phase 1
// (docs/superpowers/plans/2026-08-04-prayer-phase1.md). No outbound HTTP
// request.
//
// Previously scraped universalis.com at request time. That was replaced
// because: (1) licensing — serving scraped third-party text conflicted with
// the Prayer module's public-domain-only content strategy; (2) fragility —
// it had already broken once to anti-bot measures, with no fallback; (3)
// incompleteness — Universalis strips the Responsorial Psalm body to a
// citation only, which this implementation no longer does.
//
// The function name is kept as `usccb-readings` for backward compatibility
// with deployed clients — it never actually served USCCB (their own
// Cloudflare Bot Fight Mode blocks server-side fetches) — and the response
// shape is unchanged; see buildReadings.ts's header comment for the contract.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildReadings, type RpcClient } from "./buildReadings.ts";

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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const resp = await buildReadings(supabase as unknown as RpcClient, date);
  return json(resp, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
