-- Tier restructure (2026-07-04): four-tier plan catalog + user-level plans.
--
-- Replaces the four legacy tenant plans (ensemble/studio/conservatory/
-- university) with the new tier set: personal (user-scoped), director_60,
-- director_150, institution (all tenant-scoped). Also introduces
-- gw_billing_plans.scope so the same catalog table can describe both
-- user-level and tenant-level SKUs, plus Stripe lookup-key columns so
-- checkout can resolve prices by lookup_key instead of stored price ids
-- (see Task 5/7 of the tiers-billing plan).
--
-- DEV DATA WIPE — AUTHORIZED: gw_billing_plans/gw_tenant_plans only ever
-- held the four seed rows from 20260623180000_tenant_plans.sql plus
-- whatever local dev tenants had picked one. Production has no live
-- subscriptions in either table yet (verified against the plan doc's
-- Task 3 brief — this migration predates Task 5's Stripe catalog setup
-- and Task 7's checkout/webhook fulfillment, so nothing could have
-- written a real gw_tenant_plans row keyed to the old ids in prod). We
-- therefore DELETE + reseed rather than ON CONFLICT DO UPDATE: the old
-- ids are being retired outright (not renamed), so an upsert would leave
-- stale ensemble/studio/conservatory/university rows behind alongside
-- the new four. Delete order respects the FK: gw_tenant_plans.plan_id
-- references gw_billing_plans(id), so the child table is cleared first.
-- No other table has a FK to gw_billing_plans (checked: `grep -rn
-- "REFERENCES.*gw_billing_plans" supabase/migrations/` returns only the
-- gw_tenant_plans line above).

-- ── gw_billing_plans: new columns ────────────────────────────────────
ALTER TABLE gw_billing_plans
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'tenant',
  ADD COLUMN IF NOT EXISTS stripe_lookup_key_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_lookup_key_annual  text,
  ADD COLUMN IF NOT EXISTS storage_gb integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gw_billing_plans_scope_check'
  ) THEN
    ALTER TABLE gw_billing_plans
      ADD CONSTRAINT gw_billing_plans_scope_check CHECK (scope IN ('tenant', 'user'));
  END IF;
END $$;

-- ── Wipe + reseed the catalog ─────────────────────────────────────────
DELETE FROM gw_tenant_plans;
DELETE FROM gw_billing_plans;

INSERT INTO gw_billing_plans (
  id, scope, name, tagline, student_cap, storage_gb,
  monthly_price_cents, annual_price_cents,
  stripe_lookup_key_monthly, stripe_lookup_key_annual,
  features, sort_order
)
VALUES
  ('personal', 'user', 'Personal', 'For one musician.', 1, 25,
   899, 7900,
   'gw_personal_monthly', 'gw_personal_annual',
   '["Practice studio","Your own score library","Personal calendar + Tonight mode","25 GB"]'::jsonb, 5),

  ('director_60', 'tenant', 'Director', 'For directors with up to 60 students.', 60, 50,
   3900, 39000,
   'gw_director60_monthly', 'gw_director60_annual',
   '["Up to 60 students","Roster, attendance, scheduling","Scores + part tracks + Studio","Tonight mode + stage viewer","Branded login (your logo & colors)","50 GB"]'::jsonb, 10),

  ('director_150', 'tenant', 'Director+', 'For growing programs up to 150 students.', 150, 150,
   6900, 69000,
   'gw_director150_monthly', 'gw_director150_annual',
   '["Up to 150 students","Everything in Director","150 GB"]'::jsonb, 20),

  ('institution', 'tenant', 'Institution', 'Unlimited students, multi-ensemble.', NULL, 1024,
   19900, 199000,
   'gw_institution_monthly', 'gw_institution_annual',
   '["Unlimited students","Multi-ensemble + SSO + Canvas","Broadcast texts included","Box Office included","Custom app icon","Dedicated app (talk to us)","1 TB pooled"]'::jsonb, 30);

-- ── gw_user_plans: user-scoped subscription (personal tier) ──────────
-- Deliberately has NO tenant_id / tenant policy: a Personal plan belongs
-- to an individual auth.users row, not a gw_tenants row (the user may
-- not even be attached to a tenant). Tenant-scoped plans continue to
-- live in gw_tenant_plans; this table is the user-scope counterpart,
-- selected by plan_id via gw_billing_plans.scope = 'user'.
CREATE TABLE IF NOT EXISTS gw_user_plans (
  user_id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                text NOT NULL REFERENCES gw_billing_plans(id),
  status                 text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled')),
  stripe_customer_id     text,
  stripe_subscription_id text UNIQUE,
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE gw_user_plans IS
  'User-scoped subscriptions (e.g. the Personal tier). Keyed by user_id, '
  'not tenant_id — intentionally no tenant isolation policy here, since '
  'the row is owned by the individual, not a tenant.';

ALTER TABLE gw_user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY gw_user_plans_owner_read ON gw_user_plans FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY gw_user_plans_service_role_only ON gw_user_plans FOR ALL TO service_role
  USING (true) WITH CHECK (true);
