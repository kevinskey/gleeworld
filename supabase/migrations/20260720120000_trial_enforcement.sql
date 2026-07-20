-- 30-day free trial policy (2026-07-20).
--
-- Product rule (per Kevin): every account gets 30 days of full-tier access
-- from signup, with 7-day and 1-day warnings and a hard paywall on day 31.
-- Grandfathered exceptions never expire: main (GleeWorld platform), kevin
-- (Kevin's World), and the demo tenants (demo, demo-songwriter, demo-choir,
-- demo-school, demo-district). Grandfathering is expressed by ABSENCE of a
-- gw_tenant_plans row combined with a tenant.created_at earlier than today's
-- policy launch — see useTrialStatus.ts. No per-grandfather row needed.
--
-- Anyone signing up on 2026-07-20 or later automatically gets a 30-day trial
-- clocked from tenant.created_at (again, computed in useTrialStatus). This
-- migration only needs to seed the four tenants that existed pre-policy and
-- SHOULD get a 30-day clock rather than grandfathering.

INSERT INTO gw_tenant_plans (tenant_id, plan_id, billing_cycle, status, trial_ends_at)
SELECT id, 'director_60', 'monthly', 'trial', '2026-08-19 23:59:59+00'
FROM gw_tenants
WHERE slug IN ('dookie', 'hhmchorus', 'the-silvertones-chorus', 'lykehouse')
ON CONFLICT (tenant_id) DO NOTHING;

-- gw_user_plans (Personal-tier subscriptions) mirrors the trial pattern so a
-- Personal signup can also hold a trial timestamp when the user-scope tier
-- picker lands. Adds nullable trial_ends_at + widens the status CHECK to
-- accept 'trial' alongside the existing set.
ALTER TABLE gw_user_plans
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

ALTER TABLE gw_user_plans
  DROP CONSTRAINT IF EXISTS gw_user_plans_status_check;
ALTER TABLE gw_user_plans
  ADD CONSTRAINT gw_user_plans_status_check
  CHECK (status IN ('active', 'trial', 'past_due', 'canceled'));
