-- Tenant base plans (Ensemble / Studio / Conservatory / University).
--
-- The platform now sells in two SKU classes:
--   • PLAN — one base subscription per tenant, with a student_cap and
--     monthly_price_cents. Mutually exclusive (a tenant has 0 or 1).
--   • ADDON — many à-la-carte modules, written into gw_tenant_subscriptions
--     as before. Unchanged by this migration.
--
-- Plans live in their own table because of the per-tenant-singleton
-- constraint and the student_cap field, which add-ons don't have.

-- ── Catalog of base plans ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gw_billing_plans (
  id                  text PRIMARY KEY,           -- 'ensemble' | 'studio' | 'conservatory' | 'university'
  name                text NOT NULL,
  tagline             text,
  student_cap         integer,                    -- null = unlimited
  monthly_price_cents integer NOT NULL,
  annual_price_cents  integer,
  stripe_price_id_monthly text,
  stripe_price_id_annual  text,
  features            jsonb NOT NULL DEFAULT '[]',
  sort_order          integer NOT NULL DEFAULT 100,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Anyone authenticated can read the catalog (powers the plan picker).
ALTER TABLE gw_billing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY gw_billing_plans_read ON gw_billing_plans FOR SELECT TO authenticated USING (true);
-- Writes restricted to super-admins; the seed below uses service-role.
CREATE POLICY gw_billing_plans_super_write ON gw_billing_plans FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM gw_profiles p WHERE p.user_id = auth.uid() AND p.is_super_admin = true));

-- ── Per-tenant active plan ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gw_tenant_plans (
  tenant_id              uuid PRIMARY KEY REFERENCES gw_tenants(id) ON DELETE CASCADE,
  plan_id                text NOT NULL REFERENCES gw_billing_plans(id),
  billing_cycle          text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  status                 text NOT NULL DEFAULT 'active'  CHECK (status IN ('active', 'trial', 'past_due', 'cancelled')),
  stripe_subscription_id text,
  stripe_customer_id     text,
  current_period_end     timestamptz,
  trial_ends_at          timestamptz,
  cancelled_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_tenant_plans_status_idx ON gw_tenant_plans (status);

ALTER TABLE gw_tenant_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY gw_tenant_plans_tenant_read ON gw_tenant_plans FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_super_admin = true OR p.tenant_id = gw_tenant_plans.tenant_id)
  ));
-- Tenant admins can read/update their own plan row; super-admin can write any.
CREATE POLICY gw_tenant_plans_admin_write ON gw_tenant_plans FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid()
      AND ((p.is_admin = true AND p.tenant_id = gw_tenant_plans.tenant_id) OR p.is_super_admin = true)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM gw_profiles p
    WHERE p.user_id = auth.uid()
      AND ((p.is_admin = true AND p.tenant_id = gw_tenant_plans.tenant_id) OR p.is_super_admin = true)
  ));

-- ── Seed the four canonical plans ────────────────────────────────────
INSERT INTO gw_billing_plans (id, name, tagline, student_cap, monthly_price_cents, annual_price_cents, features, sort_order)
VALUES
  ('ensemble',     'Ensemble',     'Small church choirs, community ensembles, youth choirs.',  40, 4900,  49000,
   '["All 9 core features","25 GB storage","Your subdomain","Branded logo + colors","Email + chat support"]'::jsonb, 10),
  ('studio',       'Studio',       'High-school choirs, mid-sized parish music, community choruses.', 100, 9900,  99000,
   '["All 9 core features","100 GB storage","Optional custom domain","Branded logo + colors + tagline","Priority support (24h)","Bulk roster import"]'::jsonb, 20),
  ('conservatory', 'Conservatory', 'Small university music depts, megachurch music ministries.', 250, 17900, 179000,
   '["All 9 core features","500 GB storage","Single Sign-On (SSO)","Custom domain","Custom branding","Priority support (12h)"]'::jsonb, 30),
  ('university',   'University',   'Universities, dioceses, multi-ensemble programs.',          NULL, 29900, 299000,
   '["Unlimited students","Unlimited storage","SSO + custom branding","API access + SLA","Priority support (4h)","Onboarding call + data migration"]'::jsonb, 40)
ON CONFLICT (id) DO UPDATE SET
  name                = EXCLUDED.name,
  tagline             = EXCLUDED.tagline,
  student_cap         = EXCLUDED.student_cap,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents  = EXCLUDED.annual_price_cents,
  features            = EXCLUDED.features,
  updated_at          = now();

-- ── Enforcement helper ───────────────────────────────────────────────
-- Returns { plan_id, student_cap, current_students, can_add_n } for the
-- given tenant. UI uses this for the cap badge + invite blocking.
CREATE OR REPLACE FUNCTION gw_tenant_plan_usage(p_tenant_id uuid)
RETURNS TABLE (
  plan_id text,
  student_cap integer,
  current_students integer,
  remaining integer
)
LANGUAGE sql STABLE AS $$
  WITH plan AS (
    SELECT tp.plan_id, bp.student_cap
    FROM gw_tenant_plans tp
    JOIN gw_billing_plans bp ON bp.id = tp.plan_id
    WHERE tp.tenant_id = p_tenant_id AND tp.status IN ('active', 'trial')
    LIMIT 1
  ),
  count AS (
    SELECT COUNT(*)::int AS n
    FROM gw_profiles
    WHERE tenant_id = p_tenant_id AND role = 'student'
  )
  SELECT
    plan.plan_id,
    plan.student_cap,
    count.n,
    CASE WHEN plan.student_cap IS NULL THEN NULL
         ELSE GREATEST(plan.student_cap - count.n, 0)
    END
  FROM plan, count;
$$;
