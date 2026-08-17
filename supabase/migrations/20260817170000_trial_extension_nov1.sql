-- Free period through Oct 31; every customer tenant goes paid Nov 1 (2026-08-17).
--
-- Product rule (per Kevin): all six customer tenants get the same trial end —
-- 2026-11-01 03:59:59+00 (Oct 31 11:59:59pm ET), so the paywall begins Nov 1.
-- The admin-only TrialBanner counts down all fall (calm tier immediately,
-- amber at ≤14 days, red on the last day).
--
-- This UPSERTS gw_tenant_plans for the six, which:
--   • moves the four 20260720120000-seeded rows off their Aug 19 deadline
--   • creates rows for campbell-hs-chorus and c-a-u-philharmonic-society,
--     whose implicit created_at+30d auto-trials (Sep 1 / Sep 2 — computed in
--     useTrialStatus.ts) would otherwise expire early; an explicit plan row
--     always wins over that heuristic
--
-- Deliberately untouched (grandfathered by ABSENCE of a plan row + pre-policy
-- created_at): main, kevin, and the demo tenants (demo, demo-songwriter,
-- demo-choir, demo-school, demo-district).

INSERT INTO gw_tenant_plans (tenant_id, plan_id, billing_cycle, status, trial_ends_at)
SELECT id, 'director_60', 'monthly', 'trial', '2026-11-01 03:59:59+00'
FROM gw_tenants
WHERE slug IN (
  'dookie',
  'hhmchorus',
  'the-silvertones-chorus',
  'lykehouse',
  'campbell-hs-chorus',
  'c-a-u-philharmonic-society'
)
ON CONFLICT (tenant_id) DO UPDATE
SET plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    trial_ends_at = EXCLUDED.trial_ends_at
-- Only rows still on a trial move. A tenant that converted to a paid plan
-- (status='active', stripe-webhook-written) must never be silently
-- downgraded back to a trial by a re-run of this migration.
WHERE gw_tenant_plans.status = 'trial';
