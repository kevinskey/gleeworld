-- supabase/migrations/tests/personal_docs_test.sql
-- Run against a DB with 20260811230000_personal_docs.sql applied.
BEGIN;

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.tables
          WHERE table_name = 'gw_personal_docs'), 'table missing';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'gw_personal_docs'),
         'RLS not enabled';
  -- no tenant_id — deliberate personal scope
  ASSERT (SELECT count(*) = 0 FROM information_schema.columns
          WHERE table_name = 'gw_personal_docs' AND column_name = 'tenant_id'),
         'gw_personal_docs must NOT have tenant_id';
  -- all four owner policies present and PERMISSIVE
  ASSERT (SELECT count(*) = 4 FROM pg_policies
          WHERE tablename = 'gw_personal_docs'
            AND policyname LIKE 'gw_personal_docs_%'), 'owner policies missing';
  -- citation_style check constraint
  ASSERT (SELECT count(*) = 1 FROM information_schema.check_constraints c
          JOIN information_schema.constraint_column_usage u
            ON u.constraint_name = c.constraint_name
          WHERE u.table_name = 'gw_personal_docs' AND u.column_name = 'citation_style'),
         'citation_style CHECK missing';
END $$;

ROLLBACK;
