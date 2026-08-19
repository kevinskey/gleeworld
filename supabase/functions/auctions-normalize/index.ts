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
import { JOB_BUDGET_MS, makeDeadline } from '../_shared/jobDeadline.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sized for one invocation, not for the whole backlog. The runtime kills a
// function at 60s and the kill takes the response with it, so a job that
// tries to drain everything reports nothing at all — see _shared/jobDeadline.
// Whatever is left over is picked up by the next scheduled run.
const DEFAULT_LIMIT = 24;
const DEFAULT_BATCH_SIZE = 4;
// Seeded from observed batch times (~10-20s for four lots); replaced by the
// real measured average after the first batch of each run.
const INITIAL_BATCH_ESTIMATE_MS = 18_000;
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
  const startedAt = Date.now();
  const deadline = makeDeadline(startedAt, JOB_BUDGET_MS);
  let batchEstimateMs = INITIAL_BATCH_ESTIMATE_MS;
  let batchesRun = 0;
  let stoppedEarly = false;

  let normalized = 0;
  let flagged = 0;
  let flaggedFailures = 0;
  let costMicrocents = 0;
  const problems: string[] = [];

  for (let i = 0; i < lots.length; i += batchSize) {
    // Stop one batch short of the wall rather than being killed mid-flight.
    if (!deadline.canAfford(Date.now(), batchEstimateMs, batchesRun === 0)) {
      stoppedEarly = true;
      break;
    }
    const batchStartedAt = Date.now();
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

    // Learn the real pace: the seed estimate is a guess, the measured
    // average is not.
    batchesRun++;
    const elapsed = Date.now() - batchStartedAt;
    batchEstimateMs = Math.round((batchEstimateMs * (batchesRun - 1) + elapsed) / batchesRun);

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

      if (updateErr) { problems.push(`${lot.id}: ${updateErr.message}`); flaggedFailures++; }
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
      // A run that stops early is healthy, not failed — say so plainly so a
      // cron log shows progress rather than looking stuck.
      stopped_early: stoppedEarly,
      remaining_after_run: Math.max(0, lots.length - normalized - flaggedFailures),
      elapsed_ms: Date.now() - startedAt,
      peak_pricing: peak,
      estimated_cost_usd: Number((costMicrocents / 100_000_000).toFixed(6)),
      problems: problems.slice(0, 50),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
