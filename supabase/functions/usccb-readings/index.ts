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
// Parsing lives in parse.ts (no Deno serve/fetch globals) so it can be
// unit-tested under Vitest — see contract.test.ts, which pins this
// response shape ahead of the Phase 1 plan's move to prayer_day_full().

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  isReadingsPageForDate,
  READINGS_OUT_OF_RANGE,
} from "../_shared/liturgy/readingsWindow.ts";
import { parseUniversalisReadings, type RespOk } from "./parse.ts";

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
  const yyyymmdd = date.replace(/-/g, "");
  const sourceUrl = `https://universalis.com/${yyyymmdd}/mass.htm`;

  const upstream = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "GleeWorld-LiturgyPlanner/1.0 (https://gleeworld.org)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!upstream.ok) {
    return json({ error: `Upstream ${upstream.status}`, sourceUrl }, 502);
  }

  // Universalis 302s out-of-window dates to /n-otherdates.htm. fetch follows
  // redirects, so that arrives as a healthy 200 with no readings in it. Report
  // the real reason instead of letting the parser come up empty and look
  // broken.
  if (!isReadingsPageForDate(upstream.url, yyyymmdd)) {
    return json({
      date,
      sourceUrl,
      liturgicalTitle: null,
      readings: [],
      error: READINGS_OUT_OF_RANGE,
      outOfRange: true,
    }, 200);
  }

  const html = await upstream.text();

  const parsed = parseUniversalisReadings(html, yyyymmdd);
  const body: RespOk = { date, sourceUrl, ...parsed };
  return json(body, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
