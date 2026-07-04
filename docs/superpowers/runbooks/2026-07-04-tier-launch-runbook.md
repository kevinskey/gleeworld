# Tier Launch Runbook — House & Stage Plan 3 (Tiers & Billing)

Covers rollout of the four-tier plan catalog (`personal` / `director_60` /
`director_150` / `institution`, replacing `ensemble` / `studio` /
`conservatory` / `university`) shipped on `feat/tiers-billing` (build 119).

**Every step below that touches the droplet, Stripe live mode, or an
out-of-repo file is marked `KEVIN-GATED`. Nothing in this document runs
itself — an operator (Kevin, or someone Kevin has explicitly authorized)
executes each step by hand, in order, and confirms the verification query
before moving to the next step.**

Ordering matters. Steps are numbered in the order they must run; do not
skip ahead. The single most important rule is **Step 1 before Step 2**:
deploying the new web build must happen before the database reseed, not
after — see the warning in Step 2.

---

## Step 0 — Preconditions

- [ ] `feat/tiers-billing` is merged (or the PR it produced is approved) and
      `main` builds green (`bun x vite build`, `bun x vitest run`).
- [ ] You have shell access to the droplet (`198.211.113.144`) and can
      `sudo -u postgres psql` against the self-hosted Supabase Postgres in
      `/opt/supabase`.
- [ ] You have a Stripe **test-mode** secret key (`sk_test_...`) available
      in the shell you'll run `scripts/stripe-setup-tiers.mjs` from.

---

## Step 1 — Deploy the new web build FIRST — KEVIN-GATED

**Why this must happen before Step 2 (the migration):** the currently-live
landing page and Workspace Settings plan picker query `gw_billing_plans`
by the OLD ids (`ensemble`, `studio`, `conservatory`, `university`) and
hardcode copy/CTAs around them. The new build (this branch) queries and
renders the NEW ids. If the reseed migration (Step 2) runs first, there is
a window — however short — where the OLD frontend is live against a
catalog table that no longer has the rows it expects: the plan picker and
any in-flight checkout renders empty/broken instead of a stale-but-working
old catalog. Deploying the new frontend first means the worst case during
the gap is "new frontend queries old catalog" (still 4 real rows, correct
schema, just old ids and prices) rather than "old frontend queries empty
catalog."

1. Build and sync the iOS shell (already done on this branch — verify, don't redo, unless rebuilding on a fresh checkout):
   ```
   bun x vite build
   bun x cap sync ios
   ```
2. Deploy the web `dist/` to the droplet using the existing GleeWorld
   deploy process (rsync, **without `--delete`** — see
   `reference_gleeworld_deploy_rsync` memory: per-tenant
   `tenant-bootstrap.js` files live under `/var/www/gleeworld/html/tenants/`
   and are not in `dist/`; `--delete` wipes them and breaks every tenant
   subdomain).
3. Confirm the new build is actually being served (hard-refresh
   `gleeworld.org`, check a `<script>` bundle hash changed, or check the
   deployed `index.html` timestamp) before proceeding to Step 2.

---

## Step 2 — Apply the migrations on the droplet — KEVIN-GATED

Standard procedure: run as the `postgres` superuser against the
self-hosted instance in `/opt/supabase`, same as every prior migration in
this project.

Migrations to apply, **in this exact order** (all three already exist in
the repo on `feat/tiers-billing`; none of them touch anything under
`/opt`, `_shared/payments/*`, `store-*`, or the `202607050000xx` numbering
reserved for the parallel Commerce Core workstream):

1. `supabase/migrations/20260704230000_message_groups_tenant_rls.sql`
   (Task 1 — tenant isolation fix for `gw_message_groups`/`gw_group_members`;
   independent of the tier work but shipped in the same branch/window).
2. `supabase/migrations/20260704231000_tier_restructure.sql`
   (Task 3 — wipes and reseeds `gw_billing_plans`, adds `gw_user_plans`).
   **This is the migration Step 1's frontend deploy must precede.**
3. There is **no** `20260704232000_plan_usage_update.sql` in this branch.
   Task 8 investigated whether `gw_tenant_plan_usage()` (defined in the
   pre-existing `20260623180000_tenant_plans.sql`, not touched by this
   plan) needed a fix for the reseeded ids and concluded **no migration
   change is needed**: the function joins `gw_billing_plans` generically
   by `plan_id` (never hardcodes `ensemble`/`studio`/`conservatory`/
   `university`), so it picks up the new rows — including `institution`'s
   `NULL` cap — with zero code change. See
   `supabase/migrations/tests/plan_usage_null_cap_test.sql` for the
   verification query that proves this. If a future change to that
   function IS needed, create a new dated migration file — never edit an
   already-applied migration from another workstream.

Command shape (adjust paths/container name to match the live `/opt/supabase`
compose setup):

```bash
# On the droplet, as an operator with sudo:
cd /opt/supabase
docker compose exec -T db psql -U postgres -d postgres \
  -f - < /path/to/repo/supabase/migrations/20260704230000_message_groups_tenant_rls.sql
docker compose exec -T db psql -U postgres -d postgres \
  -f - < /path/to/repo/supabase/migrations/20260704231000_tier_restructure.sql
```

(Copy the migration files to the droplet first, e.g. via `scp`, if the
repo isn't already checked out there.)

### Post-migration verification — run both, expect the results below

**(a) Task 1 RESTRICTIVE policies exist:**

```sql
SELECT tablename, policyname, permissive, roles
FROM pg_policies
WHERE tablename IN ('gw_message_groups', 'gw_group_members')
  AND policyname = 'tenant_isolation_restrict';
```
Expect **2 rows**, both with `permissive = 'RESTRICTIVE'` — one for
`gw_message_groups`, one for `gw_group_members`.

**(b) Task 3 reseed produced exactly the 4 new plan rows:**

```sql
SELECT id, scope, name, student_cap, monthly_price_cents, annual_price_cents
FROM gw_billing_plans
ORDER BY sort_order;
```
Expect **exactly 4 rows**:
| id | scope | student_cap |
|---|---|---|
| personal | user | 1 |
| director_60 | tenant | 60 |
| director_150 | tenant | 150 |
| institution | tenant | NULL |

If either query doesn't match, **stop** — do not proceed to Step 3 — and
investigate before any Stripe or live-tier work happens.

**(c) NULL-cap invite behavior (optional but recommended):** run
`supabase/migrations/tests/plan_usage_null_cap_test.sql` against the same
database. It fabricates no tenant rows (gw_tenants' full column set isn't
tracked in this migrations tree, so the test avoids inserting into it) —
it instead asserts the seed data and the exact CASE expression from
`gw_tenant_plan_usage()`'s body. Success = the script completes with no
errors (it signals failure by raising an exception under
`ON_ERROR_STOP`; it prints no PASS message).

---

## Step 3 — Stripe catalog setup: TEST mode first — KEVIN-GATED

`scripts/stripe-setup-tiers.mjs` is idempotent (safe to re-run) and
refuses to touch Stripe **live** mode unless `CONFIRM_LIVE=yes` is set —
but the process below still requires a human to eyeball the test-mode
output before trusting it, because a live run applies the same code path
against real Stripe data.

1. **First run — TEST mode, always:**
   ```bash
   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup-tiers.mjs
   ```
2. **Read the output before doing anything else.** Confirm:
   - 4 products created/found, one per tier (`personal`, `director_60`,
     `director_150`, `institution`), each tagged `metadata.gw_tier_id`.
   - 8 prices created/found (monthly + annual × 4 tiers), lookup keys
     matching `gw_personal_monthly`, `gw_personal_annual`,
     `gw_director60_monthly`, `gw_director60_annual`,
     `gw_director150_monthly`, `gw_director150_annual`,
     `gw_institution_monthly`, `gw_institution_annual`.
   - The printed `UPDATE gw_billing_plans SET stripe_price_id_monthly = ...`
     statements — 4 of them, one per tier id, with prices that look
     sane for the tier (e.g. `institution`'s prices should be the highest).
3. Apply the printed `UPDATE` statements against the **test** database (or
   a scratch/dev database) first if you want a full dry run of checkout
   before touching production Postgres at all.
4. Apply the printed `UPDATE` statements against the **production**
   Postgres (the same one from Step 2) — this is safe even with a
   test-mode key, since it's just writing Stripe TEST price ids into the
   catalog; checkout will exercise Stripe's test mode until the live-mode
   flip in Step 5.
5. **Only after a full sign-off of the test-mode run** (products, prices,
   and end-to-end test checkout all verified) does Kevin decide whether
   and when to re-run with a live key (`CONFIRM_LIVE=yes STRIPE_SECRET_KEY=sk_live_...`)
   — that re-run is itself part of Step 5 (launch gate), not this step.

---

## Step 4 — Tenant-provisioning webhook tier mapping — KEVIN-GATED

**Do not edit `/opt/gleeworld-provision-webhook/server.js` directly without
reading this section first — it is out of the collision guard's protected
paths for THIS plan but is edited on the droplet, not in this repo.** The
in-repo copy at `deploy/onboarding-fixes-20260703/webhook-server.js` is
read-only reference for this plan; the live file lives only at
`/opt/gleeworld-provision-webhook/server.js` on the droplet.

### What the mapping does

When a Stripe Checkout session completes on a **payment link** (not the
in-app checkout functions — this is the older, marketing-site payment-link
flow that auto-provisions a brand-new tenant via the superadmin API on
`:3035`), the webhook reads `metadata.gleeworld_tier` off the session and
translates it through `TIER_ALIASES` before sending it to the superadmin
API as the tenant's initial `plan`:

```js
// current (pre-launch), reads old canonical ids:
const TIER_ALIASES = { solo: 'ensemble', school: 'studio', institution: 'university' };
```

`rawTier` values (`solo`, `school`, the unmapped passthrough `conservatory`,
`institution`) are marketing-era short codes baked into the *existing*
Stripe Payment Links' metadata — not values this codebase controls. The
right-hand side of each mapping is what actually gets sent to the
superadmin API and must be one of the ids the reseeded `gw_billing_plans`
now recognizes.

### Exact replacement to apply

Mapping each legacy canonical id to its nearest new-tier equivalent by
capacity/price position (reasoned out below, since there's no 1:1 rename —
the new catalog has 3 tenant-scope tiers plus 1 user-scope tier where the
old catalog had 4 tenant-scope tiers):

| old raw code | old alias target | new alias target | reasoning |
|---|---|---|---|
| `solo` | `ensemble` (40 cap, $49) | **`personal`** | "Solo" literally means one person — it was previously shoehorned into the smallest *tenant* plan for lack of a real individual tier. Personal is that tier now. **This changes scope from tenant to user** — flag prominently, see caveat below. |
| `school` | `studio` (100 cap, $99) | **`director_60`** | Smallest paid tenant tier in each catalog — nearest rank match. |
| `conservatory` (unmapped passthrough) | `conservatory` (250 cap, $179) | **`director_150`** | Needs a NEW explicit alias entry (the id `conservatory` no longer exists in `gw_billing_plans`, so the old passthrough behavior would send an invalid plan id). 250-cap tier has no equivalent above `director_150` (max 150) below `institution` (unlimited); `director_150` is the closer of the two remaining options by price ($69 vs $199) even though its cap (150) is lower than 250's — flag for Kevin: a `conservatory`-tier signup provisioned as `director_150` gets a lower cap than it paid for under the old scheme. Consider routing to `institution` instead if that matters more than price continuity — **Kevin's call**. |
| `institution` | `university` (NULL cap, $299) | **`institution`** | Coincidental collision: the raw marketing code was already spelled `institution`, and that string is now ALSO the new canonical plan id. The alias entry becomes a no-op (`TIER_ALIASES['institution'] → 'institution'`, or if the entry were deleted, `TIER_ALIASES[rawTier] || rawTier` falls back to the same string anyway). Keep the explicit entry for clarity/auditability even though it's technically redundant. |

Proposed replacement line:

```js
const TIER_ALIASES = { solo: 'personal', school: 'director_60', conservatory: 'director_150', institution: 'institution' };
```

**Caveat Kevin must resolve before applying this:** `solo → personal` sends
a **user-scope** plan id through a code path (`plan:` field to the
superadmin tenant-provisioning API) that — per the Task 3 schema — expects
a **tenant-scope** id (`gw_billing_plans.scope = 'tenant'`; `personal` has
`scope = 'user'` and no `gw_tenant_plans` row shape). If the superadmin API
(`:3035`, also out-of-repo) doesn't already special-case a user-scope plan
id for "provision a tenant anyway, plus a personal user-plan row," this
mapping will provision tenants with an invalid/unrecognized plan for
`solo` signups. **This needs a decision + possibly a superadmin-API change
before flipping any `solo`-tagged payment link live** — flagging rather
than guessing at the superadmin API's internals, since that service's
source isn't in this repo either.

### Deploy procedure (once the mapping is confirmed)

1. `scp` the updated `server.js` to `/opt/gleeworld-provision-webhook/server.js`
   on the droplet (back up the existing file first: `cp -n server.js server.js.bak-$(date +%s)`).
2. **Syntax-check on the droplet before restarting** (per the
   `feedback_droplet_node_check` lesson — a file that passes locally has
   crash-looped the droplet's Node before): `node --check server.js`.
3. Restart whatever process manager runs this webhook (`pm2`/`systemctl`/
   docker — check how it's currently running before assuming).
4. Send a test webhook event (Stripe CLI `stripe trigger checkout.session.completed`
   against test mode, or a real test-mode payment-link checkout) and
   confirm the provisioned tenant gets the expected new plan id before
   trusting this in production.

---

## Step 5 — Launch gate checklist — KEVIN-GATED, do not start without explicit go-ahead

None of the following should happen until Kevin explicitly says "go live":

- [ ] **New Stripe Payment Links created** for `personal`, `director_60`,
      `director_150` (institution stays quote/"Talk to us" — no self-serve
      link). Each link's checkout metadata must set `gleeworld_tier` to
      whatever raw code Step 4's (possibly revised) `TIER_ALIASES` expects.
- [ ] **Landing CTA map filled in** — `PLAN_CHECKOUT_LINKS` in
      `src/pages/GleeWorldLanding.tsx` (currently all `null`, rendering
      "Coming soon — talk to us" per tier) gets the real Payment Link URLs
      for `personal`/`director_60`/`director_150`. This requires a new
      build + redeploy (repeat Step 1's build/deploy, not the migration).
- [ ] **Live-mode Stripe catalog** — re-run
      `CONFIRM_LIVE=yes STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup-tiers.mjs`
      only after the test-mode run (Step 3) has been fully verified
      end-to-end (a real test checkout completed and provisioned/updated
      the expected row). Apply its printed `UPDATE gw_billing_plans ...`
      statements against production Postgres, this time with live price ids.
- [ ] **`stripe-webhook` edge function deployed** with the live webhook
      signing secret configured (out of scope for this runbook's file
      list — verify against whatever secrets-management step the droplet
      normally uses for edge function env vars).
- [ ] **Superadmin API (`:3035`) accepts the new ids** — confirm (or patch)
      that service's plan-id validation before any live payment-link
      checkout reaches it; this is the same open question flagged in
      Step 4's caveat.

---

## Summary of what's already done vs. what's gated here

| Item | Status |
|---|---|
| Migrations (Task 1 + Task 3) | Written, in repo, **not yet applied** to the droplet |
| `gw_tenant_plan_usage` NULL-cap correctness | Verified — no code change needed (see Step 2, item 3) |
| Stripe setup script | Written, `node --check` clean, **not yet run** anywhere |
| Checkout/webhook fulfillment (Task 7) | Written, deployed **only** via the droplet's edge-functions container (runbook step, not this plan's job to execute) |
| Landing page pricing (Task 6) | Renders from config; checkout links **intentionally `null`** until Step 5 |
| Tenant-provisioning webhook mapping | **Not yet edited** — Step 4 has the exact proposed replacement + one open question for Kevin |
| Live Stripe mode | **Not flipped** — Step 5 only |
