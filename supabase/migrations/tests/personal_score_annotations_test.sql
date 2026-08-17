-- supabase/migrations/tests/personal_score_annotations_test.sql
-- Run against a DB with 20260817120000_personal_score_annotations.sql applied.
BEGIN;
DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gw_personal_score_annotations'
  )), 'table gw_personal_score_annotations missing';

  ASSERT (SELECT relrowsecurity FROM pg_class
    WHERE oid = 'public.gw_personal_score_annotations'::regclass),
    'RLS not enabled';

  -- Deliberately tenantless — the audit exception must hold structurally.
  ASSERT NOT (SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gw_personal_score_annotations'
      AND column_name = 'tenant_id'
  )), 'tenant_id must NOT exist on gw_personal_score_annotations';

  ASSERT (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gw_personal_score_annotations'
      AND policyname LIKE 'gw_personal_score_annotations_%') = 4,
    'expected exactly 4 owner policies';

  -- pg_constraint, not information_schema: constraint_column_usage only
  -- returns rows to the table OWNER (supabase_admin here), so the assert
  -- false-failed when run as postgres even though the CHECK exists.
  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.gw_personal_score_annotations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%annotation_type%'
  )), 'annotation_type CHECK missing';

  ASSERT (SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'gw_personal_score_annotations'
      AND indexname = 'gw_personal_score_annotations_score_page_idx'
  )), 'score+page index missing';
END $$;
ROLLBACK;
