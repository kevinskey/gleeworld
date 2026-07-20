-- Tier price update (2026-07-20, per Kevin).
--
-- Bumps all four tier prices; landing + Workspace Settings both read
-- PLAN_TIERS from planTiers.ts so the client copy stays in sync via the
-- corresponding TS edit. This migration keeps gw_billing_plans (the FK
-- target for gw_tenant_plans / gw_user_plans, and the eventual home of
-- stripe lookup keys) aligned with the client.
--
-- Personal keeps ~3 months free (12*monthly - 3*monthly ≈ annual);
-- the tenant tiers keep 2 months free. Rounding to whole dollars on the
-- annual side.

UPDATE public.gw_billing_plans SET monthly_price_cents = 1299,  annual_price_cents = 11700  WHERE id = 'personal';
UPDATE public.gw_billing_plans SET monthly_price_cents = 4999,  annual_price_cents = 49900  WHERE id = 'director_60';
UPDATE public.gw_billing_plans SET monthly_price_cents = 6999,  annual_price_cents = 69900  WHERE id = 'director_150';
UPDATE public.gw_billing_plans SET monthly_price_cents = 25999, annual_price_cents = 259900 WHERE id = 'institution';

-- Personal repositions: not literally solo — a private-studio teacher with
-- up to 15 students. Bumps student_cap 1 -> 15 and refreshes tagline +
-- feature bullets to match planTiers.ts.
UPDATE public.gw_billing_plans
SET tagline = 'For one musician in their private studio. Max 15 students.',
    student_cap = 15,
    features = '["Studio (practice recording) — included","Your own score library","Personal calendar + Tonight mode","Up to 15 students","1 course (Academy)","Custom domain ($25 setup + $15/yr)","25 GB"]'::jsonb
WHERE id = 'personal';
