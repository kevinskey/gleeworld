# Auctions module — Phase 2 (lots, saved searches, alerts)

Adds the individual lots inside each sale, lets a buyer describe what they're
hunting for, matches new lots against those descriptions, and tells them.
Also adds the DeepSeek normalizer that turns catalog prose into structured
fields.

Depends on Phase 1 (`2026-08-18-auctions-phase-1.md`) being applied first.

Not in this phase: the landed-cost calculator (Phase 3), comps and
due-diligence checklists (Phase 4), and email/API ingestion — see "What still
blocks real data" at the bottom.

## Data posture

Split down the middle, deliberately:

- **`ext_auction_lots`, `ext_auction_llm_usage`** — platform-global, like the
  Phase 1 tables. A lot is the same fact for every tenant.
- **`gw_auction_saved_searches`, `gw_auction_matches`, `gw_auction_watchlist`**
  — tenant-fenced *and* owner-private. What someone is shopping for is nobody
  else's business, not even their director's, so there is deliberately **no
  admin-read policy** — the same call the planner module made for notes.

`gw_auction_matches` carries its own `user_id`/`tenant_id` copied from the
parent search. That denormalization is on purpose: a policy that reached back
into `gw_auction_saved_searches` would make the two tables' policies reference
each other, which is how this codebase has hit 42P17 before.

### Two rules the database enforces, not the code

1. **`raw_title`/`raw_text` are immutable.** A `BEFORE UPDATE` trigger rejects
   any statement that changes them. Normalization writes derived columns only.
   Without this, re-normalization stops being reproducible and there is no
   ground truth left to compare against.
2. **Unverified extractions never reach members.** The lots read policy is
   `USING (review_status IN ('auto','approved'))`, so `pending`,
   `needs_review`, and `rejected` lots are invisible to everyone but platform
   staff — in search results, in matches, and in the API.

## Step 1 — apply the migration

`supabase/migrations/20260818120100_auction_lots_searches.sql`

```
ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin \
  -d postgres -v ON_ERROR_STOP=1" < supabase/migrations/20260818120100_auction_lots_searches.sql
```

Again **without `--single-transaction`** — the file has its own `BEGIN/COMMIT`.

Verified end to end on a throwaway postgres:16 with stubbed platform objects:
applies clean, re-runs clean, and each rule was exercised individually —
raw-text edits refused, invalid modality and out-of-range confidence refused,
duplicate lot numbers refused within a sale but allowed across sales, a
`needs_review` lot invisible to a member, a duplicate match refused by the
unique constraint while the matcher's `ON CONFLICT DO NOTHING` is a harmless
no-op, and saved searches visible to their owner but not to a co-tenant or to
the same person in another tenant.

## Step 2 — set the secrets

The normalizer needs a DeepSeek key on the edge-function host:

```
DEEPSEEK_API_KEY=...            # already present if assistant-chat is configured
AUCTION_LLM_MODEL=deepseek-v4-flash   # optional; this is the default
AUCTION_LLM_PROVIDER=deepseek         # optional; this is the default
```

Model ID and pricing were verified against api-docs.deepseek.com on
2026-08-18: `deepseek-v4-flash` and `deepseek-v4-pro` are current (the legacy
`deepseek-chat`/`deepseek-reasoner` names retired 2026-07-24). Flash is used
for all normalization — this is structured extraction, not reasoning, and Pro
costs three times as much for no benefit. Third-party pricing pages disagree
with each other; the official table is the one encoded in the cost estimator.

## Step 3 — deploy the functions

```
bash scripts/deploy-functions.sh auctions-normalize auctions-match auctions-digest
```

`_shared/` co-deploys automatically, including the new `_shared/llm/`
directory.

## Step 4 — schedule the jobs

**Deliberately not done by a migration.** Wiring pg_cron to an edge function
means putting the service-role key in the SQL, and a committed migration is
the wrong place for a secret. Run this by hand, substituting the key:

```sql
-- Normalize new lots. 12:00 UTC is OFF-PEAK for DeepSeek (peak is
-- 01:00–04:00 and 06:00–10:00 UTC), where tokens cost half.
SELECT cron.unschedule('auctions-normalize') WHERE EXISTS
  (SELECT 1 FROM cron.job WHERE jobname = 'auctions-normalize');
SELECT cron.schedule('auctions-normalize', '0 12 * * *', $$
  SELECT net.http_post(
    url := 'https://supabase.gleeworld.org/functions/v1/auctions-normalize',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb);
$$);

-- Match saved searches against newly normalized lots.
SELECT cron.schedule('auctions-match', '30 12 * * *', $$
  SELECT net.http_post(
    url := 'https://supabase.gleeworld.org/functions/v1/auctions-match',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb);
$$);

-- Send the digests.
SELECT cron.schedule('auctions-digest', '0 13 * * *', $$
  SELECT net.http_post(
    url := 'https://supabase.gleeworld.org/functions/v1/auctions-digest',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb);
$$);
```

Order matters: normalize, then match, then notify. Each is safe to re-run.

Note that `instant` saved searches are only as instant as the matcher cadence
— daily, above. If instant should mean instant, the matcher needs to run far
more often, which is a cost decision worth making on purpose.

## Step 5 — deploy the frontend

```
bash scripts/deploy-frontend.sh
```

Adds `/auctions/lots`, `/auctions/lots/:lotId`, `/auctions/searches`, and
`/auctions/matches`, all under the existing `auctions` module gate, with tabs
across the four surfaces.

## Watching the spend

```sql
SELECT date_trunc('day', created_at) AS day,
       sum(lots_processed) AS lots,
       sum(prompt_tokens) AS prompt_tokens,
       sum(cached_prompt_tokens) AS cached,
       round(sum(estimated_cost_microcents) / 100000000.0, 4) AS est_usd
FROM ext_auction_llm_usage
GROUP BY 1 ORDER BY 1 DESC;
```

`cached` should climb toward the bulk of `prompt_tokens` after the first few
runs — the system prompt is pinned as the exact prefix of every request so
DeepSeek's context caching can hit it, and cache hits cost about 3% of fresh
input. If `cached` stays near zero, something is varying the prefix and the
job is costing roughly 30× what it should.

The review queue:

```sql
SELECT count(*) FROM ext_auction_lots WHERE review_status = 'needs_review';
```

## Post-deploy QA

None of this has been exercised against a browser or the live database.

1. Insert a handful of lots by hand against a real auction, run
   `auctions-normalize` manually, and read the returned `problems` array.
2. Confirm a low-confidence lot lands in `needs_review` and does **not** show
   up at `/auctions/lots` for a normal member.
3. Create a saved search, run `auctions-match`, and confirm matches appear at
   `/auctions/matches` ordered by fit.
4. Run `auctions-digest` and confirm exactly one notification/email arrives,
   then run it again immediately and confirm **nothing** is re-sent.
5. Sign in as a second user in the same tenant and confirm the first user's
   saved searches and matches are invisible.
6. Check `/auctions/searches` and the builder dialog at 390px.

## What still blocks real data

The module can hold lots but has no automated way to get them yet. Phase 1
seeded eight houses, all on the manual tier with their terms of service marked
"not yet reviewed".

- **Email ingestion** (spec's tier 2) is **not built.** It needs a decision
  first: which inbox receives auction notification mail, and which inbound
  provider parses it. Worth choosing before building, not during.
- **API ingestion** (tier 3) is not built. GSA Auctions has a public API and
  is the obvious first one; GovDeals needs a partner-program request.
- No scraping anywhere, by design.

Until one of those lands, lots have to be entered by hand, and the normalizer
will simply find nothing to do.
