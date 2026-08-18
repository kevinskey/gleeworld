# Auctions module — Phase 1 (calendar)

Ships the auction calendar: auction houses, their sales, catalog release
dates, and calendar subscriptions. Lots, saved searches, alerts, and the
landed-cost calculator are later phases and are **not** in this deploy.

Built from the spec in `auctions-claude-code-prompt.pdf`. The spec's stack
section (Express + EJS + node-pg + worker process) does not apply — Lykehouse
is a GleeWorld tenant, so this is a normal GleeWorld add-on module.

## Data posture — read this before touching the tables

`ext_auction_sources` and `ext_auctions` are **platform-global**: no
`tenant_id`, no RESTRICTIVE tenant fence. The same sale at the same house is
the same fact for every tenant, so they follow the `ext_catalog_items`
precedent rather than the `gw_` tenant-table pattern.

- Any signed-in user can **read** both tables.
- Only `is_platform_owner()` can **write** them.
- `anon` is revoked entirely.

They deliberately do **not** carry the `gw_` prefix, because
`scripts/audit-tenant-isolation.sql` matches `tablename LIKE 'gw\_%'` — a
global table under that prefix would show up as a missing-isolation finding
forever.

Phase 2's per-user data (saved searches, matches, watchlist) is the opposite:
tenant-fenced and owner-private, following the planner pattern.

## Step 1 — apply the migration

`supabase/migrations/20260818120000_auctions_module.sql`

```
ssh root@198.211.113.144 "docker exec -i supabase-db psql -U supabase_admin \
  -d postgres -v ON_ERROR_STOP=1" < supabase/migrations/20260818120000_auctions_module.sql
```

**Do not add `--single-transaction`** — the file opens its own `BEGIN/COMMIT`,
and nesting them makes the inner `COMMIT` end the outer transaction early.

Creates `ext_auction_sources` and `ext_auctions`, seeds eight major houses,
and inserts the `auctions` row into `gw_billing_modules` at $0 (add-on billing
is disengaged). Re-running is safe.

The migration was verified end to end on a throwaway postgres:16 with stubbed
platform objects — it applies clean, re-runs clean, and each constraint and
policy was exercised individually (duplicate `external_id` rejected while
multiple NULLs are allowed, backwards dates rejected, unknown modality
rejected, `updated_at` trigger fires, a non-staff `UPDATE` affects 0 rows,
`anon` is denied outright).

Verify:

```sql
SELECT count(*) FROM ext_auction_sources;                       -- 8
SELECT id, monthly_price_cents FROM gw_billing_modules WHERE id='auctions';
```

## Step 2 — deploy the edge function

```
bash scripts/deploy-functions.sh auctions-ics
```

`auctions-ics` serves the iCalendar feeds. It reuses
`gw_profiles.ical_feed_token` — the same token as the main GleeWorld calendar
feed — so **rotating that token in Calendar settings also invalidates a user's
auction subscriptions**. No new column, no new token to manage.

- `?token=<uuid>` — every house
- `?token=<uuid>&source=<slug>` — one house

It emits two events per sale: the sale itself, and a separate all-day entry
for the catalog release, which for several houses is the date that actually
matters. RFC 5545 line folding and escaping live in
`supabase/functions/_shared/auctionIcs.ts`, shared with the vitest suite so
there is exactly one copy of those rules.

## Step 3 — deploy the frontend

```
bash scripts/deploy-frontend.sh
```

Adds `/auctions` (calendar, gated on the `auctions` module) and
`/auctions/admin` (curation, platform staff only — the page self-gates in
addition to RLS).

## Post-deploy QA

Nothing here has been exercised against a browser or the live database yet.

1. `/auctions` renders and the eight seeded houses appear in the house filter.
2. Add an auction from `/auctions/admin` and confirm it lands in the right
   month group on the calendar.
3. Leave the catalog release date blank and confirm the card shows an
   **estimate** ~3 days before open, clearly labelled as an estimate rather
   than a published date.
4. Subscribe → copy the feed address → paste into Google or Apple Calendar and
   confirm both the sale and the catalog entry appear.
5. Sign in as a non-admin and confirm `/auctions/admin` shows the
   "curated centrally" card instead of the tables.
6. Check the calendar at 390px — the cards and the subscribe dialog should not
   overflow.

## Known gaps, carried deliberately into later phases

- `buyer_premium_pct` is NULL for all eight seeded houses. It stays NULL until
  confirmed from each house's published terms; a guessed premium would quietly
  corrupt the Phase 3 landed-cost math.
- Every seeded source is `ingest_method = 'manual'` and its ToS position is
  recorded as "not yet reviewed". No source moves off the manual tier until
  its terms have been read.
- No scraping anywhere, by design. Email and API tiers arrive in Phases 2–3.
