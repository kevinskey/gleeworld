// Daily Catholic readings proxy. Originally targeted USCCB but their
// Cloudflare Bot Fight Mode returns 403 / stub to every server-side
// fetch, so we source from universalis.com — same lectionary, less
// hostile to crawlers, and returns clean parseable HTML.
//
// Caveat: Universalis's mass.htm page strips the Responsorial Psalm body
// (citation only). The frontend surfaces this — directors paste the
// psalm verses by hand when planning the song slot.
//
// The function name is kept as `usccb-readings` for backward compat
// with deployed clients; only the upstream and parser changed.
//
// Request/response logic lives in runReadings.ts (no deno.land import),
// so contract.test.ts can pin the response shape under Vitest. This file
// stays a thin serve() wrapper.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { isUsccbReadingsError, runUsccbReadings } from "./runReadings.ts";

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

  const result = await runUsccbReadings(date);
  if (isUsccbReadingsError(result)) {
    return json({ error: result.error, sourceUrl: result.sourceUrl }, result.status);
  }
  return json(result, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
