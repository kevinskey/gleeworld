-- Expect: tenant_id column + RESTRICTIVE tenant policies on both tables,
-- and the old permissive USING(true)-style SELECT policies gone.
-- Run after the migration.
\set ON_ERROR_STOP on
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gw_message_groups' AND column_name='tenant_id') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_message_groups' AND policyname='tenant_isolation_restrict' AND permissive='RESTRICTIVE') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_group_members' AND policyname='tenant_isolation_restrict' AND permissive='RESTRICTIVE') THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_message_groups' AND policyname IN ('simple_view_all_groups','Everyone can view active message groups')) THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_group_members' AND policyname IN ('simple_view_own_membership','Users can view group memberships')) THEN 1 ELSE 0 END);
SELECT 1/(CASE WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gw_group_members' AND policyname='System can manage memberships') THEN 1 ELSE 0 END);
