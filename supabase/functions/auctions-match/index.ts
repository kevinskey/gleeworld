// auctions-match — runs every active saved search against lots it has not
// been matched to yet, scores the hits, and records them.
//
// Notifying is a separate job (auctions-digest). This one only decides what
// matched; keeping the two apart means a matcher retry can never send a
// duplicate email.
//
// The unique constraint on (saved_search_id, lot_id) is what actually
// guarantees a lot is never matched twice — this job upserts with
// ignoreDuplicates so a re-run is harmless.
//
// Auth: service-role bearer token only (cron).
//   POST /functions/v1/auctions-match
//   optional body: { "lotLookbackDays": 30 }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  lotMatchesCriteria,
  parseCriteria,
  scoreLot,
  type MatchableLot,
} from '../_shared/auctionMatching.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_LOTS = 5000;

interface SavedSearchRow {
  id: string;
  tenant_id: string;
  user_id: string;
  criteria: unknown;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!serviceKey || bearer !== serviceKey) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({}));
  const lookbackDays = Number(body.lotLookbackDays ?? DEFAULT_LOOKBACK_DAYS);

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, {
    auth: { persistSession: false },
  });

  const { data: searches, error: searchErr } = await admin
    .from('gw_auction_saved_searches')
    .select('id, tenant_id, user_id, criteria')
    .eq('active', true);

  if (searchErr) {
    return new Response(JSON.stringify({ error: searchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const activeSearches = (searches ?? []) as SavedSearchRow[];
  if (activeSearches.length === 0) {
    return new Response(JSON.stringify({ ok: true, searches: 0, matches_created: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Only matchable lots: pending and rejected extractions are not shown to
  // members, so they must not generate alerts either. Closed lots are also
  // pointless to alert on.
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();

  const { data: lotRows, error: lotErr } = await admin
    .from('ext_auction_lots')
    .select(
      'id, raw_title, modality, manufacturer, model, year_of_manufacture, condition_notes, ' +
      'current_bid_cents, normalization_confidence, closes_at, ' +
      'auction:ext_auctions(location_state)',
    )
    .in('review_status', ['auto', 'approved'])
    .gte('created_at', since)
    .or(`closes_at.is.null,closes_at.gte.${nowIso}`)
    .limit(MAX_LOTS);

  if (lotErr) {
    return new Response(JSON.stringify({ error: lotErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const lots: MatchableLot[] = (lotRows ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    raw_title: String(r.raw_title ?? ''),
    modality: (r.modality as string) ?? null,
    manufacturer: (r.manufacturer as string) ?? null,
    model: (r.model as string) ?? null,
    year_of_manufacture: (r.year_of_manufacture as number) ?? null,
    condition_notes: (r.condition_notes as string) ?? null,
    current_bid_cents: (r.current_bid_cents as number) ?? null,
    normalization_confidence: (r.normalization_confidence as number) ?? null,
    auction_state: (r.auction as { location_state?: string } | null)?.location_state ?? null,
  }));

  let matchesCreated = 0;
  const problems: string[] = [];

  for (const search of activeSearches) {
    const criteria = parseCriteria(search.criteria);

    const rows = lots
      .filter((lot) => lotMatchesCriteria(lot, criteria))
      .map((lot) => ({
        tenant_id: search.tenant_id,
        user_id: search.user_id,
        saved_search_id: search.id,
        lot_id: lot.id,
        score: scoreLot(lot, criteria),
      }));

    if (rows.length > 0) {
      // The unique index does the deduping; already-matched lots are skipped
      // rather than re-inserted, so nobody is alerted about them twice.
      const { data: inserted, error: insertErr } = await admin
        .from('gw_auction_matches')
        .upsert(rows, { onConflict: 'saved_search_id,lot_id', ignoreDuplicates: true })
        .select('id');

      if (insertErr) problems.push(`${search.id}: ${insertErr.message}`);
      else matchesCreated += inserted?.length ?? 0;
    }

    await admin
      .from('gw_auction_saved_searches')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', search.id);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      searches: activeSearches.length,
      lots_considered: lots.length,
      matches_created: matchesCreated,
      problems: problems.slice(0, 50),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
