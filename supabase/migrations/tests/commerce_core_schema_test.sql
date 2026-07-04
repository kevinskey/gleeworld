-- Expect: tables exist, uniques exist, RLS on. Run after the migration.
\set ON_ERROR_STOP on
SELECT 1/ (CASE WHEN to_regclass('public.gw_store_orders') IS NOT NULL THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname='gw_store_orders_provider_session_id_key') THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname='gw_store_orders_provider_payment_intent_id_key') THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname='gw_store_orders') THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_store_orders' AND policyname='tenant_isolation_restrict' AND permissive='RESTRICTIVE') THEN 1 ELSE 0 END);
SELECT 1/ (CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_store_orders' AND policyname='service_role_only' AND roles='{service_role}') THEN 1 ELSE 0 END);
