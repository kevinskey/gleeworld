// auctions-normalize — turns raw auction catalog text into structured lot
// fields, in batches, on a schedule.
//
// Never called from a user-facing request path. A member browsing lots sees
// whatever the last run produced; nobody waits on a model round-trip.
//
// Cost discipline (this is high-volume, low-value-per-call work):
//   - The system prompt is pinned and sent as the exact prefix of every
//     request so DeepSeek's context caching hits.
//   - Lots are batched per request.
//   - Scheduled off-peak, when DeepSeek charges half.
//   - Every run's tokens and estimated cost land in ext_auction_llm_usage.
//
// Nothing the model returns is written until it passes the validator in
// _shared/auctionNormalize.ts. Low-confidence extractions get review_status
// 'needs_review' and stay out of members' search results until a human says
// otherwise.
//
// Auth: service-role bearer token only (cron). No user path.
//   POST /functions/v1/auctions-normalize
//   optional body: { "limit": 100, "batchSize": 10, "threshold": 0.75 }

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildNormalizationMessages,
  decideReviewStatus,
  estimateCostMicrocents,
  isPeakPricing,
  parseNormalizationResponse,
  type NormalizationInput,
} from '../_shared/auctionNormalize.ts';
import { getLlmProvider } from '../_shared/llm/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_LIMIT = 100;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_THRESHOLD = 0.75;

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
  const limit = Number(body.limit ?? DEFAULT_LIMIT);
  const batchSize = Math.max(1, Number(body.batchSize ?? DEFAULT_BATCH_SIZE));
  const threshold = Number(body.threshold ?? DEFAULT_THRESHOLD);

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey, {
    auth: { persistSession: false },
  });

  const { data: pending, error: fetchErr } = await admin
    .from('ext_auction_lots')
    .select('id, raw_title, raw_text')
    .is('normalized_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const lots = (pending ?? []) as NormalizationInput[];
  if (lots.length === 0) {
    return new Response(JSON.stringify({ ok: true, normalized: 0, message: 'nothing pending' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const provider = getLlmProvider();
  const runId = crypto.randomUUID();
  const peak = isPeakPricing(new Date());

  let normalized = 0;
  let flagged = 0;
  let costMicrocents = 0;
  const problems: string[] = [];

  for (let i = 0; i < lots.length; i += batchSize) {
    const batch = lots.slice(i, i + batchSize);
    const ids = new Set(batch.map((l) => l.id));

    let result;
    try {
      result = await provider.chatJson(buildNormalizationMessages(batch));
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      problems.push(`batch ${i / batchSize}: ${detail}`);
      await admin.from('ext_auction_llm_usage').insert({
        job_run_id: runId, provider: provider.name, model: provider.model,
        lots_processed: 0, ok: false, error_detail: detail.slice(0, 1000),
      });
      continue;
    }

    const batchCost = estimateCostMicrocents(result.usage, peak);
    costMicrocents += batchCost;

    const { valid, invalid } = parseNormalizationResponse(result.content, ids);
    problems.push(...invalid);

    await admin.from('ext_auction_llm_usage').insert({
      job_run_id: runId,
      provider: provider.name,
      model: result.model,
      lots_processed: valid.length,
      prompt_tokens: result.usage.prompt_tokens,
      cached_prompt_tokens: result.usage.cached_prompt_tokens,
      completion_tokens: result.usage.completion_tokens,
      estimated_cost_microcents: batchCost,
      ok: invalid.length === 0,
      error_detail: invalid.length ? invalid.join('; ').slice(0, 1000) : null,
    });

    const stampedAt = new Date().toISOString();
    for (const lot of valid) {
      const status = decideReviewStatus(lot.confidence, threshold);
      if (status === 'needs_review') flagged++;

      // Only derived columns are written here. raw_title/raw_text are not in
      // this update at all, and a database trigger rejects the statement if
      // they ever appear.
      const { error: updateErr } = await admin
        .from('ext_auction_lots')
        .update({
          modality: lot.modality,
          manufacturer: lot.manufacturer,
          model: lot.model,
          year_of_manufacture: lot.year,
          serial: lot.serial,
          condition_notes: lot.condition_notes,
          normalization_confidence: lot.confidence,
          normalized_at: stampedAt,
          review_status: status,
        })
        .eq('id', lot.id);

      if (updateErr) problems.push(`${lot.id}: ${updateErr.message}`);
      else normalized++;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      run_id: runId,
      considered: lots.length,
      normalized,
      needs_review: flagged,
      peak_pricing: peak,
      estimated_cost_usd: Number((costMicrocents / 100_000_000).toFixed(6)),
      problems: problems.slice(0, 50),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
