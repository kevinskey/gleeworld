-- Expect: gw_billing_plans has the new scope/lookup-key/storage columns,
-- exactly the four new-tier rows (old ensemble/studio/conservatory/
-- university ids gone), and gw_user_plans exists with RLS on + a unique
-- constraint on stripe_subscription_id. Run after the migration.
\set ON_ERROR_STOP on

-- New columns on gw_billing_plans.
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gw_billing_plans' AND column_name='scope') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gw_billing_plans' AND column_name='stripe_lookup_key_monthly') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gw_billing_plans' AND column_name='stripe_lookup_key_annual') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gw_billing_plans' AND column_name='storage_gb') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname='gw_billing_plans_scope_check') THEN 1 ELSE 0 END);

-- Exactly the four new rows, by id.
SELECT 1/(CASE WHEN (SELECT COUNT(*) FROM gw_billing_plans) = 4 THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM gw_billing_plans WHERE id='personal' AND scope='user') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM gw_billing_plans WHERE id='director_60' AND scope='tenant') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM gw_billing_plans WHERE id='director_150' AND scope='tenant') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM gw_billing_plans WHERE id='institution' AND scope='tenant' AND student_cap IS NULL) THEN 1 ELSE 0 END);

-- Old ids must be gone entirely.
SELECT 1/(CASE WHEN NOT EXISTS (SELECT 1 FROM gw_billing_plans WHERE id IN ('ensemble','studio','conservatory','university')) THEN 1 ELSE 0 END);

-- gw_user_plans: exists, RLS on, unique subscription id.
SELECT 1/(CASE WHEN to_regclass('public.gw_user_plans') IS NOT NULL THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname='gw_user_plans') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (
  SELECT 1 FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.table_name='gw_user_plans' AND tc.constraint_type='UNIQUE' AND ccu.column_name='stripe_subscription_id'
) THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_user_plans' AND policyname='gw_user_plans_owner_read') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_user_plans' AND policyname='gw_user_plans_service_role_only' AND roles='{service_role}') THEN 1 ELSE 0 END);
