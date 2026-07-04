-- Verifies gw_tenant_plan_usage() (defined in 20260623180000_tenant_plans.sql,
-- untouched by the 20260704231000_tier_restructure.sql reseed) still joins
-- gw_billing_plans.student_cap generically by plan_id, and that the
-- reseeded 'institution' row's NULL cap really does read back as NULL —
-- the precondition the edge-function guard in
-- gw-invite-student/index.ts:69-78 (`u.student_cap !== null`) depends on
-- to treat "unlimited" as "don't block invites". Deliberately avoids
-- inserting fixture rows into gw_tenants/gw_tenant_plans (schema not
-- defined anywhere in this migrations tree — created out-of-band before
-- migrations were tracked — so a fabricated INSERT risks failing on
-- unknown NOT NULL columns). Instead this checks the two facts that
-- together guarantee correct behavior: (a) the seed data, (b) the
-- function body's CASE expression, reproduced verbatim against that seed
-- data via a self-join rather than executing the live RPC.
-- Run after 20260704231000_tier_restructure.sql.
\set ON_ERROR_STOP on

-- (a) Seed data: institution has NULL cap, director_60/director_150 have
-- numeric caps. (Redundant with tier_restructure_test.sql's institution
-- check, kept here so this file is a standalone regression check for the
-- invite-cap fix even if that file is deleted later.)
SELECT 1/(CASE WHEN (SELECT student_cap FROM gw_billing_plans WHERE id = 'institution') IS NULL THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN (SELECT student_cap FROM gw_billing_plans WHERE id = 'director_60') = 60 THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN (SELECT student_cap FROM gw_billing_plans WHERE id = 'director_150') = 150 THEN 1 ELSE 0 END);

-- (b) gw_tenant_plan_usage's function body must still exist and still
-- reference gw_billing_plans (i.e. the reseed didn't drop/orphan it, and
-- nobody hardcoded a legacy plan id like 'university' into its source).
SELECT 1/(CASE WHEN EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'gw_tenant_plan_usage'
) THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN pg_get_functiondef('gw_tenant_plan_usage'::regproc) ILIKE '%gw_billing_plans%student_cap%'
               OR pg_get_functiondef('gw_tenant_plan_usage'::regproc) ILIKE '%bp.student_cap%'
          THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN pg_get_functiondef('gw_tenant_plan_usage'::regproc) NOT ILIKE '%ensemble%'
               AND pg_get_functiondef('gw_tenant_plan_usage'::regproc) NOT ILIKE '%university%'
               AND pg_get_functiondef('gw_tenant_plan_usage'::regproc) NOT ILIKE '%conservatory%'
          THEN 1 ELSE 0 END);

-- (c) The function's own CASE expression for "remaining", reproduced
-- verbatim, applied to the reseeded institution row: must yield NULL
-- (unlimited), never 0 or a number. This is the exact expression from
-- gw_tenant_plan_usage's body — if that body ever changes, update this
-- line to match so the two can't silently drift apart.
SELECT 1/(CASE WHEN (
  SELECT CASE WHEN bp.student_cap IS NULL THEN NULL ELSE GREATEST(bp.student_cap - 0, 0) END
  FROM gw_billing_plans bp WHERE bp.id = 'institution'
) IS NULL THEN 1 ELSE 0 END);
