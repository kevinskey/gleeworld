// auctions-digest — tells people about the lots that matched their saved
// searches, at the cadence they asked for.
//
// Split from the matcher on purpose: matching is idempotent and safe to
// retry, sending is not. This job only ever reads matches the matcher already
// recorded, and it stamps notified_at inside the same pass so a retry cannot
// send the same lot twice.
//
// Delivery follows the search's notify_channel: an in-app gw_notifications
// row, an email via gw-send-email, or both.
//
// Auth: service-role bearer token only (cron).
//   POST /functions/v1/auctions-digest

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buildDigestHtml, isSearchDue, type DigestMatch } from '../_shared/auctionDigest.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_LOTS_PER_DIGEST = 25;

interface SearchRow {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  notify_channel: string;
  notify_frequency: string;
  last_notified_at: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!serviceKey || bearer !== serviceKey) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const now = new Date();

  const { data: searches, error: searchErr } = await admin
    .from('gw_auction_saved_searches')
    .select('id, tenant_id, user_id, name, notify_channel, notify_frequency, last_notified_at')
    .eq('active', true)
    .neq('notify_channel', 'none');

  if (searchErr) {
    return new Response(JSON.stringify({ error: searchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let digestsSent = 0;
  let lotsReported = 0;
  const problems: string[] = [];

  for (const search of (searches ?? []) as SearchRow[]) {
    if (!isSearchDue(search.notify_frequency, search.last_notified_at, now)) continue;

    const { data: matchRows, error: matchErr } = await admin
      .from('gw_auction_matches')
      .select(
        'id, score, lot:ext_auction_lots(id, raw_title, model, closes_at, current_bid_cents, url, ' +
        'auction:ext_auctions(title, source:ext_auction_sources(name)))',
      )
      .eq('saved_search_id', search.id)
      .is('notified_at', null)
      .is('dismissed_at', null)
      .order('score', { ascending: false })
      .limit(MAX_LOTS_PER_DIGEST);

    if (matchErr) {
      problems.push(`${search.id}: ${matchErr.message}`);
      continue;
    }
    if (!matchRows || matchRows.length === 0) continue;

    const matches: DigestMatch[] = matchRows.map((row: Record<string, unknown>) => {
      const lot = (row.lot ?? {}) as Record<string, unknown>;
      const auction = (lot.auction ?? null) as Record<string, unknown> | null;
      const source = (auction?.source ?? null) as { name?: string } | null;
      return {
        lot_id: String(lot.id ?? ''),
        // Prefer the house's own wording: it is what the buyer will recognise
        // on the listing page.
        title: String(lot.raw_title ?? lot.model ?? 'Untitled lot'),
        auction_title: (auction?.title as string) ?? null,
        source_name: source?.name ?? null,
        closes_at: (lot.closes_at as string) ?? null,
        current_bid_cents: (lot.current_bid_cents as number) ?? null,
        score: Number(row.score ?? 0),
        url: (lot.url as string) ?? null,
      };
    });

    const count = matches.length;
    const title = `${count} new ${count === 1 ? 'lot' : 'lots'} matched "${search.name}"`;
    const wantsEmail = search.notify_channel === 'email' || search.notify_channel === 'both';
    const wantsInApp = search.notify_channel === 'in_app' || search.notify_channel === 'both';

    if (wantsInApp) {
      const { error } = await admin.from('gw_notifications').insert({
        user_id: search.user_id,
        title,
        message: matches.slice(0, 3).map((m) => m.title).join(' · '),
        type: 'auction_match_digest',
        category: 'auctions',
        action_url: '/auctions/matches',
        action_label: 'View matches',
        metadata: { saved_search_id: search.id, lot_ids: matches.map((m) => m.lot_id) },
      });
      if (error) problems.push(`${search.id} in-app: ${error.message}`);
    }

    if (wantsEmail) {
      const { data: profile } = await admin
        .from('gw_profiles')
        .select('email')
        .eq('user_id', search.user_id)
        .maybeSingle();

      const to = profile?.email as string | undefined;
      if (!to) {
        problems.push(`${search.id} email: no address on file`);
      } else {
        const res = await fetch(`${supabaseUrl}/functions/v1/gw-send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            to,
            subject: title,
            html: buildDigestHtml(search.name, matches),
          }),
        });
        if (!res.ok) {
          problems.push(`${search.id} email: ${res.status} ${(await res.text()).slice(0, 200)}`);
        }
      }
    }

    // Stamped whatever the channel outcome: a delivery failure is logged, but
    // re-sending the same 25 lots on the next tick would be worse than a gap.
    const stamped = new Date().toISOString();
    const { error: stampErr } = await admin
      .from('gw_auction_matches')
      .update({ notified_at: stamped })
      .in('id', matchRows.map((r: Record<string, unknown>) => r.id));
    if (stampErr) problems.push(`${search.id} stamp: ${stampErr.message}`);

    await admin
      .from('gw_auction_saved_searches')
      .update({ last_notified_at: stamped })
      .eq('id', search.id);

    digestsSent++;
    lotsReported += count;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      digests_sent: digestsSent,
      lots_reported: lotsReported,
      problems: problems.slice(0, 50),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
