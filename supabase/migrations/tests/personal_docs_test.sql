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

-- Storage side. Requires 20260811233000_personal_docs_storage_exempt.sql and
-- 20260811233500_storage_drop_select_all_and_sensitive_personal_docs.sql to be
-- applied as well: the bucket's owner-only policies are inert without them.
DO $$
DECLARE
  v_restrict_qual text;
BEGIN
  ASSERT (SELECT count(*) = 1 FROM storage.buckets WHERE id = 'personal-docs'),
         'personal-docs bucket missing';
  ASSERT (SELECT NOT public FROM storage.buckets WHERE id = 'personal-docs'),
         'personal-docs bucket must be private';

  -- four owner-scoped policies on storage.objects
  ASSERT (SELECT count(*) = 4 FROM pg_policies
          WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname LIKE 'personal_docs_images_%'),
         'personal_docs_images_* policies missing';

  -- the bucket must be exempt from the RESTRICTIVE tenant policy, or every
  -- read/write falls to tenant_id = current_tenant_id() and fails (the bucket
  -- is user-scoped and carries no correct tenant value)
  SELECT qual INTO v_restrict_qual FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'tenant_isolation_restrict';
  ASSERT v_restrict_qual IS NOT NULL, 'tenant_isolation_restrict missing on storage.objects';
  ASSERT v_restrict_qual LIKE '%personal-docs%',
         'personal-docs not exempt in tenant_isolation_restrict (20260811233000 not applied?)';

  -- storage_auth_select must fall through to owner = auth.uid() for this bucket
  ASSERT public.is_sensitive_bucket('personal-docs'),
         'is_sensitive_bucket(''personal-docs'') must be true (20260811233500 not applied?)';

  -- the blanket `FOR SELECT TO authenticated USING (true)` policy must be gone,
  -- or all of the above is decorative
  ASSERT (SELECT count(*) = 0 FROM pg_policies
          WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname = 'storage_select_all'),
         'storage_select_all still exists — it ORs over every read policy';
END $$;

ROLLBACK;
