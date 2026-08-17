-- supabase/migrations/tests/personal_music_library_test.sql
-- Run against a DB with 20260712120000_personal_music_library.sql applied.
BEGIN;

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.tables
          WHERE table_name = 'gw_personal_scores'), 'table missing';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname = 'gw_personal_scores'),
         'RLS not enabled';
  -- no tenant_id — deliberate personal scope
  ASSERT (SELECT count(*) = 0 FROM information_schema.columns
          WHERE table_name = 'gw_personal_scores' AND column_name = 'tenant_id'),
         'gw_personal_scores must NOT have tenant_id';
  -- all four owner policies present and PERMISSIVE
  ASSERT (SELECT count(*) = 4 FROM pg_policies
          WHERE tablename = 'gw_personal_scores'
            AND policyname LIKE 'gw_personal_scores_%'), 'owner policies missing';
  -- source check constraint
  ASSERT (SELECT count(*) = 1 FROM information_schema.check_constraints c
          JOIN information_schema.constraint_column_usage u
            ON u.constraint_name = c.constraint_name
          WHERE u.table_name = 'gw_personal_scores' AND u.column_name = 'source'),
         'source CHECK missing';
  -- partial unique indexes
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE tablename = 'gw_personal_scores'
            AND indexname = 'gw_personal_scores_pd_uq'), 'pd unique index missing';
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE tablename = 'gw_personal_scores'
            AND indexname = 'gw_personal_scores_entitlement_uq'),
         'entitlement unique index missing';
  -- bucket + policies
  ASSERT (SELECT count(*) = 1 FROM storage.buckets
          WHERE id = 'personal-scores' AND public = false), 'bucket missing/public';
  ASSERT (SELECT count(*) = 3 FROM pg_policies
          WHERE tablename = 'objects' AND schemaname = 'storage'
            AND policyname LIKE 'personal_scores_bucket_%'),
         'bucket policies missing';
  -- shared_with_members column
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_name = 'gw_sheet_music'
            AND column_name = 'shared_with_members'
            AND column_default = 'false'), 'shared_with_members missing';
END $$;

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.tables
          WHERE table_name = 'gw_personal_score_annotations'),
         'personal annotations table missing';
  ASSERT (SELECT relrowsecurity FROM pg_class
          WHERE relname = 'gw_personal_score_annotations'),
         'personal annotations RLS not enabled';
  ASSERT (SELECT count(*) = 0 FROM information_schema.columns
          WHERE table_name = 'gw_personal_score_annotations'
            AND column_name = 'tenant_id'),
         'personal annotations must NOT have tenant_id';
  ASSERT (SELECT count(*) = 4 FROM pg_policies
          WHERE tablename = 'gw_personal_score_annotations'),
         'personal annotations owner policies missing';
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE tablename = 'gw_personal_scores'
            AND indexname = 'gw_personal_scores_purchase_uq'),
         'purchase idempotency index missing';
END $$;

ROLLBACK;
