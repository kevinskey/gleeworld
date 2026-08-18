// auctions-parse-email — reads staged auction-house email into auctions and
// lots. Scheduled, never on a request path.
//
// Split from auctions-inbound deliberately: the webhook must answer fast or
// Resend retries it, and an LLM call takes seconds. Staging first also means
// a parsing bug is re-runnable — the original message is still there.
//
// Conservative by design:
//   - A sale is only created when the model is confident about it. Below the
//     threshold the email is flagged for a human instead, because a wrong
//     date on a calendar is worse than a missing one.
//   - Lots are inserted with review_status left at its 'pending' default, so
//     they are invisible to members until auctions-normalize reads their
//     specs and clears them.
//   - The auction's external_id is derived from its title and open date, so
//     a reminder email about the same sale updates it instead of creating a
//     second copy.
//
// Auth: service-role bearer token only (cron).
//   POST /functions/v1/auctions-parse-email
//   optional body: { "limit": 25, "threshold": 0.6 }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildEmailExtractionMessages,
  parseEmailExtraction,
  type ExtractedAuction,
} from '../_shared/auctionEmail.ts';
import { estimateCostMicrocents, isPeakPricing } from '../_shared/auctionNormalize.ts';
import { getLlmProvider } from '../_shared/llm/index.ts';
import { JOB_BUDGET_MS, makeDeadline } from '../_shared/jobDeadline.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// One invocation's worth, not the whole inbox — the runtime kills at 60s and
// takes the response with it. Leftovers wait for the next run.
const DEFAULT_LIMIT = 8;
const EMAIL_ESTIMATE_MS = 15_000;
// Below this the sale is not created. Chosen low enough to accept ordinary
// well-formed notices, high enough to reject "this email mentions three
// different sales and I guessed".
const DEFAULT_THRESHOLD = 0.6;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// A stable key for the same sale across repeated emails about it.
function externalIdFor(auction: ExtractedAuction): string {
  const slug = auction.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const day = auction.opens_at ? auction.opens_at.slice(0, 10) : 'nodate';
  return `email:${slug}:${day}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!serviceKey || bearer !== serviceKey) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const limit = Number(body.limit ?? DEFAULT_LIMIT);
  const threshold = Number(body.threshold ?? DEFAULT_THRESHOLD);

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, {
    auth: { persistSession: false },
  });

  const { data: pending, error: fetchErr } = await admin
    .from('ext_auction_inbound_emails')
    .select('id, from_address, subject, text_body, received_at, source_id')
    .eq('status', 'pending')
    .order('received_at', { ascending: true })
    .limit(limit);

  if (fetchErr) return json({ error: fetchErr.message }, 500);

  const emails = pending ?? [];
  if (emails.length === 0) return json({ ok: true, processed: 0, message: 'nothing pending' });

  const provider = getLlmProvider();
  const runId = crypto.randomUUID();
  const peak = isPeakPricing(new Date());
  const startedAt = Date.now();
  const deadline = makeDeadline(startedAt, JOB_BUDGET_MS);
  let processed = 0;
  let stoppedEarly = false;

  let auctionsCreated = 0;
  let lotsCreated = 0;
  let flagged = 0;
  const results: unknown[] = [];

  for (const email of emails) {
    if (!deadline.canAfford(Date.now(), EMAIL_ESTIMATE_MS, processed === 0)) {
      stoppedEarly = true;
      break;
    }
    processed++;
    const problems: string[] = [];
    let status = 'parsed';
    let auctionId: string | null = null;
    let lotsForThisEmail = 0;

    // An email we cannot attribute to a known house is not parsed at all:
    // every auction needs a source, and guessing which house sent it would
    // put a sale under the wrong name.
    if (!email.source_id) {
      await admin.from('ext_auction_inbound_emails').update({
        status: 'needs_review',
        parse_problems: ['sender domain does not match any known auction house'],
        processed_at: new Date().toISOString(),
      }).eq('id', email.id);
      flagged++;
      results.push({ email: email.id, status: 'needs_review', reason: 'unknown sender' });
      continue;
    }

    if (!email.text_body?.trim()) {
      await admin.from('ext_auction_inbound_emails').update({
        status: 'needs_review',
        parse_problems: ['message had no readable text'],
        processed_at: new Date().toISOString(),
      }).eq('id', email.id);
      flagged++;
      continue;
    }

    let extraction;
    try {
      const result = await provider.chatJson(buildEmailExtractionMessages({
        from: email.from_address,
        subject: email.subject,
        text: email.text_body,
        received_at: email.received_at,
      }));

      await admin.from('ext_auction_llm_usage').insert({
        job_run_id: runId,
        provider: provider.name,
        model: result.model,
        lots_processed: 0,
        prompt_tokens: result.usage.prompt_tokens,
        cached_prompt_tokens: result.usage.cached_prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        estimated_cost_microcents: estimateCostMicrocents(result.usage, peak),
        ok: true,
      });

      extraction = parseEmailExtraction(result.content);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await admin.from('ext_auction_inbound_emails').update({
        status: 'failed',
        parse_problems: [detail.slice(0, 500)],
        processed_at: new Date().toISOString(),
      }).eq('id', email.id);
      await admin.from('ext_auction_llm_usage').insert({
        job_run_id: runId, provider: provider.name, model: provider.model,
        ok: false, error_detail: detail.slice(0, 1000),
      });
      results.push({ email: email.id, status: 'failed', detail });
      continue;
    }

    problems.push(...extraction.problems);

    if (extraction.auction && extraction.auction.confidence >= threshold) {
      const auction = extraction.auction;
      const { data: upserted, error: auctionErr } = await admin
        .from('ext_auctions')
        .upsert({
          source_id: email.source_id,
          external_id: externalIdFor(auction),
          title: auction.title,
          opens_at: auction.opens_at,
          closes_at: auction.closes_at,
          catalog_released_at: auction.catalog_released_at,
          location_city: auction.location_city,
          location_state: auction.location_state,
          catalog_url: auction.catalog_url,
        }, { onConflict: 'source_id,external_id' })
        .select('id')
        .maybeSingle();

      if (auctionErr) {
        problems.push(`auction: ${auctionErr.message}`);
        status = 'failed';
      } else if (upserted) {
        auctionId = upserted.id as string;
        auctionsCreated++;
      }
    } else if (extraction.auction) {
      problems.push(
        `auction: confidence ${extraction.auction.confidence} below ${threshold}, not created`,
      );
      status = 'needs_review';
    } else {
      status = extraction.problems.length ? 'needs_review' : 'no_auction';
    }

    // Lots need a sale to hang from. Without one there is nowhere to put
    // them, so they wait for the human who reviews the email.
    if (auctionId && extraction.lots.length > 0) {
      const { data: existing } = await admin
        .from('ext_auction_lots')
        .select('raw_title, lot_number')
        .eq('auction_id', auctionId);

      const seenTitles = new Set((existing ?? []).map((r: { raw_title: string }) => r.raw_title));
      const seenNumbers = new Set(
        (existing ?? [])
          .map((r: { lot_number: string | null }) => r.lot_number)
          .filter((n): n is string => Boolean(n)),
      );

      const rows = extraction.lots
        .filter((l) => {
          if (l.lot_number && seenNumbers.has(l.lot_number)) return false;
          if (seenTitles.has(l.title)) return false;
          if (l.lot_number) seenNumbers.add(l.lot_number);
          seenTitles.add(l.title);
          return true;
        })
        .map((l) => ({
          auction_id: auctionId,
          lot_number: l.lot_number,
          raw_title: l.title,
          url: l.url,
          // review_status stays at its 'pending' default: invisible to
          // members until auctions-normalize has read it.
        }));

      if (rows.length > 0) {
        const { data: inserted, error: lotErr } = await admin
          .from('ext_auction_lots')
          .insert(rows)
          .select('id');
        if (lotErr) problems.push(`lots: ${lotErr.message}`);
        else {
          lotsForThisEmail = inserted?.length ?? 0;
          lotsCreated += lotsForThisEmail;
        }
      }
    }

    if (status === 'needs_review') flagged++;

    await admin.from('ext_auction_inbound_emails').update({
      status,
      parse_problems: problems.slice(0, 20),
      parsed_auction_id: auctionId,
      lots_created: lotsForThisEmail,
      processed_at: new Date().toISOString(),
    }).eq('id', email.id);

    results.push({ email: email.id, status, auction: auctionId, lots: lotsForThisEmail });
  }

  return json({
    ok: true,
    run_id: runId,
    processed: emails.length,
    auctions_upserted: auctionsCreated,
    lots_created: lotsCreated,
    needs_review: flagged,
    results,
  });
});
