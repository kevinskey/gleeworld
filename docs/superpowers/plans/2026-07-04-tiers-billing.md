# Tiers & Billing Implementation Plan (House & Stage — Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Member/Personal/Director/Institution tier structure in code (spec §11): reseeded plan catalog + user-level Personal plans, lookup_key-based Stripe wiring with webhook fulfillment, a single pricing source rendered on the landing page, plan-limit groundwork, the Box Office 1% application fee, and the groups-tables RLS migration.

**Architecture:** Money state lives in Stripe and reaches the app only through the signature-verified in-repo `stripe-webhook` edge function (idempotent via `gw_webhook_events` on `event.id`). Catalog is DB-first (`gw_billing_plans` reseeded; new `gw_user_plans` for Personal). Prices are referenced by `lookup_key`, created by an idempotent setup script run where `STRIPE_SECRET_KEY` lives (TEST mode until the launch gate). Dev data is disposable (Kevin, 2026-07-04) — reseed wipes plan rows.

**COLLISION GUARD (parallel Commerce Core workstream):** do NOT touch `/opt/gleeworld-provision-webhook/server.js`, `supabase/functions/_shared/payments/*`, `store-*` functions, `gw_store_*` tables, or migrations numbered `202607050000xx`. Subscription fulfillment goes through `supabase/functions/stripe-webhook` ONLY.

**Tech Stack:** Postgres migrations (self-hosted Supabase), Deno edge functions, Stripe subscriptions (Checkout `mode: subscription`), vitest for shared TS config, React landing page.

## Global Constraints (every task inherits)

- Client never sends amounts; checkout functions resolve prices server-side by `lookup_key`.
- Fulfillment ONLY in `stripe-webhook` with signature verification + `event.id` dedupe.
- Amounts integer cents. New tables: `tenant_id`/user scoping + RESTRICTIVE RLS per platform pattern; service-role policies `TO service_role`.
- Stripe TEST mode until Kevin's explicit launch gate; nothing in this plan flips live keys.
- Tenant-neutral copy; pricing copy says "students" (never "members"/"singers") in marketing tiers.
- Commands: `bun x vite build`; `bun x vitest run <path>`; branch `feat/tiers-billing` off main. Migrations are files only — NOT applied to the droplet in this plan; Task 8 produces the ops runbook.

---

### Task 1: Groups tenant-isolation migration (security)

**Files:**
- Create: `supabase/migrations/20260704230000_message_groups_tenant_rls.sql`
- Test: `supabase/migrations/tests/message_groups_tenant_rls_test.sql`

**Interfaces:** adds `tenant_id UUID NOT NULL DEFAULT public.current_tenant_id()` to `gw_message_groups` (backfilled from any member's profile tenant, else platform default) and RESTRICTIVE `tenant_isolation_restrict` policies on BOTH `gw_message_groups` and `gw_group_members` (members table scoped via its group's tenant), dropping the permissive `USING (true)` selects from 20250822005704/20250824025519 by name.

- [ ] **Step 1: failing test** `supabase/migrations/tests/message_groups_tenant_rls_test.sql` (same style as `commerce_core_schema_test.sql` — `\set ON_ERROR_STOP on`, division-guard asserts):

```sql
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gw_message_groups' AND column_name='tenant_id') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_message_groups' AND policyname='tenant_isolation_restrict' AND permissive='RESTRICTIVE') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_group_members' AND policyname='tenant_isolation_restrict' AND permissive='RESTRICTIVE') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_message_groups' AND policyname IN ('simple_view_all_groups','Everyone can view active message groups')) THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_group_members' AND policyname IN ('simple_view_own_membership','Users can view group memberships')) THEN 1 ELSE 0 END);
```

- [ ] **Step 2: migration** — follow the platform's standard pattern (read `supabase/migrations/20260614100000*` for the canonical RESTRICTIVE + DEFAULT + BEFORE INSERT trigger shape):

```sql
-- gw_message_groups / gw_group_members had permissive USING(true) selects
-- and no tenant scoping (found 2026-07-04): any authenticated user could
-- read every tenant's groups. UI containment shipped in Plan 2; this is
-- the real fix, matching the 586-table tenant-isolation pattern.
ALTER TABLE public.gw_message_groups
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

UPDATE public.gw_message_groups g
SET tenant_id = COALESCE(
  (SELECT p.tenant_id FROM public.gw_group_members m
     JOIN public.gw_profiles p ON p.user_id = m.user_id
    WHERE m.group_id = g.id AND p.tenant_id IS NOT NULL
    LIMIT 1),
  public.current_tenant_id()
)
WHERE g.tenant_id IS NULL;

ALTER TABLE public.gw_message_groups
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id();

CREATE OR REPLACE FUNCTION public.gw_message_groups_fill_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN NEW.tenant_id := public.current_tenant_id(); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gw_message_groups_fill_tenant ON public.gw_message_groups;
CREATE TRIGGER gw_message_groups_fill_tenant BEFORE INSERT ON public.gw_message_groups
FOR EACH ROW EXECUTE FUNCTION public.gw_message_groups_fill_tenant();

DROP POLICY IF EXISTS "simple_view_all_groups" ON public.gw_message_groups;
DROP POLICY IF EXISTS "Everyone can view active message groups" ON public.gw_message_groups;
DROP POLICY IF EXISTS "simple_view_own_membership" ON public.gw_group_members;
DROP POLICY IF EXISTS "Users can view group memberships" ON public.gw_group_members;

CREATE POLICY tenant_isolation_restrict ON public.gw_message_groups
AS RESTRICTIVE FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY groups_select ON public.gw_message_groups
FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY tenant_isolation_restrict ON public.gw_group_members
AS RESTRICTIVE FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.gw_message_groups g
               WHERE g.id = group_id AND g.tenant_id = public.current_tenant_id()));

CREATE POLICY members_select ON public.gw_group_members
FOR SELECT TO authenticated USING (true);

CREATE POLICY service_full_groups ON public.gw_message_groups FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_full_members ON public.gw_group_members FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Before writing, VERIFY against the live migration files which permissive INSERT/UPDATE/DELETE policies exist on both tables and preserve equivalent permissive write policies (RESTRICTIVE ANDs with them); list every existing policy name you found in the report.

- [ ] **Step 3:** No local Postgres — validation is (a) the test file's asserts are consistent with the migration, (b) `grep` the migration for the five required elements. Commit: `security: tenant isolation for message groups tables`.

---

### Task 2: Box Office 1% application fee

**Files:**
- Modify: `supabase/functions/box-office-checkout/index.ts` (the session-creation body, ~lines 200-215)

**Interfaces:** direct charge keeps `Stripe-Account` header; adds `payment_intent_data[application_fee_amount]` = `Math.round(totalCents * 0.01)` (min 1 cent when total > 0). Marketing already advertises "+1% of ticket sales".

- [ ] **Step 1:** Read the function; compute `totalCents` from the same server-side values used to build `line_items` (never client input). Add to the form body: `payment_intent_data[application_fee_amount]: String(feeCents)`. Update the now-false comment ("GleeWorld takes 0%") to describe the 1% fee and reference the pricing page.
- [ ] **Step 2:** Grep-verify: `grep -n application_fee supabase/functions/box-office-checkout/index.ts` shows exactly one live usage. Commit: `fix(box-office): collect the advertised 1% application fee`.

---

### Task 3: Plan catalog reseed + `gw_user_plans`

**Files:**
- Create: `supabase/migrations/20260704231000_tier_restructure.sql`
- Test: `supabase/migrations/tests/tier_restructure_test.sql`

**Interfaces:**
- `gw_billing_plans` gains columns `scope TEXT NOT NULL DEFAULT 'tenant' CHECK (scope IN ('tenant','user'))` and `stripe_lookup_key_monthly TEXT`, `stripe_lookup_key_annual TEXT`, `storage_gb INT`.
- Dev rows wiped (`DELETE FROM gw_tenant_plans; DELETE FROM gw_billing_plans;` — dev data disposal authorized) and reseeded:

| id | scope | label | monthly_cents | annual_cents | student_cap | storage_gb | lookup keys |
|---|---|---|---|---|---|---|---|
| personal | user | Personal | 899 | 7900 | 1 | 25 | gw_personal_monthly / gw_personal_annual |
| director_60 | tenant | Director | 3900 | 39000 | 60 | 50 | gw_director60_monthly / gw_director60_annual |
| director_150 | tenant | Director+ | 6900 | 69000 | 150 | 150 | gw_director150_monthly / gw_director150_annual |
| institution | tenant | Institution | 19900 | 199000 | NULL (unlimited) | 1024 | gw_institution_monthly / gw_institution_annual |

- New table `gw_user_plans (user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, plan_id TEXT NOT NULL REFERENCES gw_billing_plans(id), status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled')), stripe_customer_id TEXT, stripe_subscription_id TEXT UNIQUE, current_period_end TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())` — RLS: owner SELECT (`user_id = auth.uid()`), service_role ALL; no tenant policy (user-scoped by design, with a comment saying so).
- `DEFAULT_PLAN_TIER` becomes `director_60` (matches Task 4's TS).

- [ ] **Step 1: failing test** (same assert style): columns exist on gw_billing_plans (`scope`,`stripe_lookup_key_monthly`,`storage_gb`); 4 seeded rows by id; `gw_user_plans` exists with RLS enabled + unique subscription id; old ids (`ensemble`,`studio`,`conservatory`,`university`) absent.
- [ ] **Step 2:** write the migration exactly per the table above (ON CONFLICT DO NOTHING is wrong here — use DELETE+INSERT since dev data is disposable; document that in a header comment).
- [ ] **Step 3:** consistency grep + commit: `feat(billing): tier restructure — plan catalog reseed + user-level personal plans`.

---

### Task 4: Shared pricing config + planTiers rewrite (TDD)

**Files:**
- Rewrite: `src/lib/planTiers.ts`
- Test: `src/lib/__tests__/planTiers.test.ts`
- Modify: `src/components/admin/CreateTenantDialog.tsx` (consumes the new tenant-scoped list)

**Interfaces (consumed by Task 6 landing page):**

```ts
export type PlanTierId = 'personal' | 'director_60' | 'director_150' | 'institution';
export interface PlanTier {
  id: PlanTierId; scope: 'user' | 'tenant'; label: string; tagline: string;
  monthlyCents: number; annualCents: number;
  studentCap: number | null; storageGb: number;
  lookupKeyMonthly: string; lookupKeyAnnual: string;
  features: string[]; quote?: boolean;
}
export const PLAN_TIERS: PlanTier[];               // all four, in the table order
export const TENANT_PLAN_TIERS: PlanTier[];        // scope==='tenant'
export const DEFAULT_PLAN_TIER: PlanTierId = 'director_60';
export function formatPrice(cents: number): string; // 899 → "$8.99", 19900 → "$199"
```

Seed values MUST byte-match Task 3's table. `features` copy (tenant-neutral, "students"): personal — ['Practice studio', 'Your own score library', 'Personal calendar + Tonight mode', '25 GB']; director_60 — ['Up to 60 students', 'Roster, attendance, scheduling', 'Scores + part tracks + Studio', 'Tonight mode + stage viewer', '50 GB']; director_150 — ['Up to 150 students', 'Everything in Director', '150 GB']; institution (quote: true) — ['Unlimited students', 'Multi-ensemble + SSO + Canvas', 'Broadcast texts included', 'Box Office included', '1 TB pooled'].

- [ ] **Step 1: failing test**: PLAN_TIERS length 4 + ids in order; TENANT_PLAN_TIERS excludes personal; formatPrice cases (899→'$8.99', 3900→'$39', 19900→'$199', 39000→'$390'); every tier's lookup keys are distinct and prefixed `gw_`; DEFAULT_PLAN_TIER is a tenant scope id.
- [ ] **Step 2:** implement; update `CreateTenantDialog.tsx` to import `TENANT_PLAN_TIERS` (it previously mapped PLAN_TIERS of 4 tenant tiers; keep its posted `plan` value = tier id).
- [ ] **Step 3:** `bun x vitest run src/lib` green; `bun x vite build` PASS (fix any other compile-break consumers found by the build — list them in the report). Commit: `feat(billing): four-tier plan config as single source`.

---

### Task 5: Stripe catalog setup script (idempotent, lookup_keys)

**Files:**
- Create: `scripts/stripe-setup-tiers.mjs`

**Interfaces:** run with `STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-setup-tiers.mjs` wherever the key lives (droplet). For each tier in a hardcoded copy of the Task 3 table: ensure ONE Product per tier (search by `metadata.gw_tier_id`), then ensure monthly + annual recurring Prices with the exact `lookup_key`s (Stripe: lookup_keys are unique; use `transfer_lookup_key: true` on re-runs) — then UPDATE `gw_billing_plans.stripe_price_id_monthly/annual` via a printed SQL statement (script prints SQL; it does NOT connect to Postgres). Uses global `fetch` against `https://api.stripe.com/v1/*` (no new deps), `Idempotency-Key` headers on creates.

- [ ] **Step 1:** write the script: list products with `metadata['gw_tier_id']` search; create missing (`name` = label, metadata gw_tier_id); for prices use `GET /v1/prices?lookup_keys[]=…` then create missing with `unit_amount`, `currency: 'usd'`, `recurring[interval]`, `lookup_key`, `transfer_lookup_key: true`; final output = the UPDATE statements + a summary table.
- [ ] **Step 2:** `node --check scripts/stripe-setup-tiers.mjs` passes; dry logic reviewed (no execution without a key). Commit: `feat(billing): idempotent Stripe tier catalog setup script`.

---

### Task 6: Landing pricing from config

**Files:**
- Modify: `src/pages/GleeWorldLanding.tsx` (`ApplePricing` ~1569-1644, `STRIPE_LINKS` ~1552-1557)

**Interfaces:** consumes `PLAN_TIERS`/`formatPrice` from Task 4. The pricing section renders the four tiers from config (Personal shown as the first, smaller card labeled "For one musician"; Institution card shows "From $199/mo" + "Talk to us" when `quote`), annual toggle showing two-months-free math from `annualCents`. Replace the hardcoded tier array; keep the section's visual design system (it's the marketing page — existing style stands). CTA wiring: keep the existing `STRIPE_LINKS` mechanism but source URLs from a `PLAN_CHECKOUT_LINKS: Record<PlanTierId, string | null>` map with the OLD links removed and `null` values rendering a "Coming soon — talk to us" mailto CTA (new payment links are created at the launch gate, not in this plan; document via code comment).

- [ ] **Step 1:** implement; delete the 4 hardcoded tier objects; ensure "students" wording (never "members") in features.
- [ ] **Step 2:** `bun x vite build` PASS; grep the file for `\$49|\$99|\$179|\$299` — none remain. Commit: `feat(landing): pricing rendered from the four-tier config`.

---

### Task 7: Checkout + webhook fulfillment (lookup_key based)

**Files:**
- Modify: `supabase/functions/create-plan-checkout/index.ts`
- Create: `supabase/functions/create-personal-checkout/index.ts`
- Modify: `supabase/functions/stripe-webhook/index.ts`

**Interfaces:**
- `create-plan-checkout`: body `{ planId, interval: 'monthly'|'annual' }` — validates planId ∈ tenant-scope ids by querying `gw_billing_plans` (`scope='tenant'`); resolves the Stripe price by `lookup_key` (`GET /v1/prices?lookup_keys[]=X&limit=1`) instead of stored price ids (keep stored-id fallback if lookup returns empty); Checkout Session `mode: subscription`, `metadata[kind]='plan'`, `metadata[plan_id]`, `metadata[tenant_id]`.
- `create-personal-checkout`: same shape for `planId='personal'` keyed to the CALLER's user (JWT verified the same way create-plan-checkout verifies; metadata `kind='personal'`, `user_id`).
- `stripe-webhook`: on `checkout.session.completed` with `metadata.kind==='plan'` → upsert `gw_tenant_plans` (tenant_id from metadata, plan_id, stripe ids, status 'active', period end from the subscription); with `kind==='personal'` → upsert `gw_user_plans`. On `customer.subscription.updated/deleted` → update status/period on whichever table has the `stripe_subscription_id`. ALL branches: verify signature (existing code) AND dedupe by `event.id` against `gw_webhook_events` BEFORE side effects (extend the existing logging insert to be the dedupe: unique on event id, skip when conflict).
- [ ] **Step 1:** read all three functions fully; implement per above, copying the repo's existing raw-fetch Stripe style and JWT verification pattern from create-plan-checkout itself.
- [ ] **Step 2:** verification without deploy: `deno check supabase/functions/create-plan-checkout/index.ts supabase/functions/create-personal-checkout/index.ts supabase/functions/stripe-webhook/index.ts` (if deno unavailable locally, `node --experimental-strip-types --check` is NOT valid for Deno — fall back to careful self-review + `bun x tsc --noEmit` is inapplicable; state what check ran). Commit: `feat(billing): lookup_key checkouts + idempotent webhook fulfillment for tenant/user plans`.

---

### Task 8: Limits groundwork + ops runbook + ship

**Files:**
- Modify: `supabase/migrations/20260704231000_tier_restructure.sql` from Task 3 ONLY IF the RPC needs it (else new small migration `20260704232000_plan_usage_update.sql`): `gw_tenant_plan_usage` must read caps from the reseeded rows (verify its SQL still joins `gw_billing_plans.student_cap`; NULL cap = unlimited must not block invites — read `gw-invite-student/index.ts:69-78` and fix its comparison for NULL caps).
- Create: `docs/superpowers/runbooks/2026-07-04-tier-launch-runbook.md` — ops steps in order: (1) apply the two/three migrations on the droplet (psql as postgres, standard procedure), (2) run `scripts/stripe-setup-tiers.mjs` with the TEST key + apply its printed UPDATEs, (3) superadmin `:3035` tier-name mapping must accept the new ids (out-of-repo; flag exact old ids to replace), (4) launch gate checklist (live key, payment links, landing CTA map) — all EXPLICITLY Kevin-gated.
- Bump `CURRENT_PROJECT_VERSION` 118→119; `bun x vite build && bun x cap sync ios`.

- [ ] **Step 1:** NULL-cap invite fix + RPC verification; **Step 2:** runbook; **Step 3:** build + sync + bump + commit; **Step 4:** simulator smoke (launch, no crash); **Step 5:** push, PR "Tiers & billing (House & Stage plan 3, build 119)". Merge/upload/deploy stays behind Kevin's word; migrations apply at the runbook step, also Kevin-gated.

## Deliberately deferred
- Launch covers + tenant display-font promotion + tap instrumentation (experience-polish plan).
- Storage byte-metering enforcement (needs DO Spaces usage plumbing; caps recorded in catalog now).
- Personal-tier feature gates in Studio/Viewer UI (follow the entitlement rows landing here).
- New payment links + live-mode flip (launch gate, Kevin-run per runbook).
