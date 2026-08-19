// auctions-ics — emits an iCalendar (RFC 5545) feed of tracked equipment
// auctions so a buyer can subscribe from Google / Apple / Outlook and see
// sale dates and catalog release dates alongside the rest of their calendar.
//
// Auth model: token-in-URL, the same model as the ical-feed function and the
// standard for private calendar subscriptions (a calendar client cannot send
// a bearer token). It reuses gw_profiles.ical_feed_token, so rotating that
// token invalidates every GleeWorld feed the user has subscribed to at once.
//
// The auction tables are platform-global reference data with no tenant_id, so
// unlike ical-feed there is no tenant scope to re-impose after the token
// lookup — a valid token grants the same calendar to everyone. The token is
// here to keep the curated calendar off the open internet, not to partition it.
//
// Endpoints:
//   GET /functions/v1/auctions-ics?token=<uuid>                → every house
//   GET /functions/v1/auctions-ics?token=<uuid>&source=<slug>  → one house
// Returns:
//   200 text/calendar; charset=utf-8   — the .ics feed
//   400                                — malformed token
//   404                                — token or source not recognised

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildAuctionCalendar, type IcsAuction } from '../_shared/auctionIcs.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// A calendar does not need history. Recently closed sales stay visible for a
// short while so a subscriber can still see what just happened.
const LOOKBACK_DAYS = 60;
const MAX_AUCTIONS = 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const sourceSlug = url.searchParams.get('source');

  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
    return new Response('Bad token', { status: 400, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: profile, error: profErr } = await admin
    .from('gw_profiles')
    .select('user_id')
    .eq('ical_feed_token', token)
    .maybeSingle();

  if (profErr || !profile) {
    return new Response('Feed not found', { status: 404, headers: corsHeaders });
  }

  let calendarName = 'Equipment auctions';
  let sourceId: string | null = null;

  if (sourceSlug) {
    const { data: source } = await admin
      .from('ext_auction_sources')
      .select('id, name')
      .eq('slug', sourceSlug)
      .maybeSingle();

    if (!source) {
      return new Response('Source not found', { status: 404, headers: corsHeaders });
    }
    sourceId = source.id;
    calendarName = `Equipment auctions — ${source.name}`;
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let query = admin
    .from('ext_auctions')
    .select(
      'id, title, location_city, location_state, opens_at, closes_at, catalog_url, ' +
      'catalog_released_at, status, updated_at, source:ext_auction_sources(name)',
    )
    .or(`opens_at.gte.${since},closes_at.gte.${since},catalog_released_at.gte.${since}`)
    .order('opens_at', { ascending: true, nullsFirst: false })
    .limit(MAX_AUCTIONS);

  if (sourceId) query = query.eq('source_id', sourceId);

  const { data: auctions, error: auctionsErr } = await query;

  if (auctionsErr) {
    return new Response('Feed error: ' + auctionsErr.message, { status: 500, headers: corsHeaders });
  }

  const rows: IcsAuction[] = (auctions ?? []).map((a: Record<string, unknown>) => ({
    id: String(a.id),
    title: String(a.title ?? 'Auction'),
    location_city: (a.location_city as string) ?? null,
    location_state: (a.location_state as string) ?? null,
    opens_at: (a.opens_at as string) ?? null,
    closes_at: (a.closes_at as string) ?? null,
    catalog_url: (a.catalog_url as string) ?? null,
    catalog_released_at: (a.catalog_released_at as string) ?? null,
    status: String(a.status ?? 'announced'),
    updated_at: (a.updated_at as string) ?? null,
    source_name: (a.source as { name?: string } | null)?.name ?? null,
  }));

  const ics = buildAuctionCalendar(rows, {
    name: calendarName,
    now: new Date().toISOString(),
  });

  return new Response(ics, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
});
