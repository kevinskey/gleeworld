// Daily Catholic readings, served from our own data.
//
// Originally scraped USCCB (blocked by Cloudflare Bot Fight Mode for every
// server-side fetch), then universalis.com. Both meant serving a commercial
// third party's text through our own modal — exactly what Phase 0's content
// strategy exists to avoid, and it broke once already when Universalis
// changed its markup.
//
// Now: `prayer_day` (Phase 0) supplies the day's celebration and reading
// citations from the Roman calendar; `prayer_reading_text` (Phase 1) resolves
// each citation against WEBCE, the public-domain scripture we host ourselves.
// No outbound HTTP request, no scraping, no upstream we don't control.
//
// The function name is kept as `usccb-readings` for backward compat with
// deployed clients; only the source changed. The response contract — {date,
// sourceUrl, liturgicalTitle, readings: [{heading, citation, summary,
// html}]} — is unchanged; see __tests__/buildReadings.test.ts.

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildReadingsFromDb } from './buildReadings.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReqBody { date?: string }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: ReqBody;
  try { payload = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const date = (payload.date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ error: 'date must be YYYY-MM-DD' }, 400);
  }

  // gw_prayer_calendar_days / gw_prayer_readings / gw_bible_* are platform
  // reference data, readable by every authenticated user (see
  // 20260804120000_prayer_calendar.sql) — no service-role elevation needed,
  // just the caller's own JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const result = await buildReadingsFromDb(date, supabase);
  if ('error' in result && !('readings' in result)) {
    return json({ error: result.error }, 502);
  }
  return json(result, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
