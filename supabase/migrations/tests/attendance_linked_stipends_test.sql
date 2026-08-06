-- Asserts the tenant-isolation boilerplate is actually wired on all three
-- stipend tables. Run inside a transaction and roll back.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_stipend_policies','gw_stipend_periods','gw_stipend_awards']
  LOOP
    ASSERT (SELECT column_default LIKE '%current_tenant_id%'
            FROM information_schema.columns
            WHERE table_name = t AND column_name = 'tenant_id'),
      format('%s.tenant_id default is not current_tenant_id()', t);

    ASSERT EXISTS (SELECT 1 FROM information_schema.triggers
                   WHERE event_object_table = t
                     AND action_statement ILIKE '%set_tenant_id_default%'
                     AND event_manipulation = 'INSERT'),
      format('%s missing set_tenant_id_default INSERT trigger', t);

    ASSERT (SELECT relrowsecurity FROM pg_class
            WHERE oid = format('public.%I', t)::regclass),
      format('%s does not have RLS enabled', t);

    ASSERT EXISTS (SELECT 1 FROM pg_policies
                   WHERE tablename = t
                     AND policyname = 'tenant_isolation_restrict'
                     AND permissive = 'RESTRICTIVE'),
      format('%s missing RESTRICTIVE tenant_isolation_restrict policy', t);
  END LOOP;

  ASSERT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'stipend_override_needs_reason'),
    'override without a reason is not blocked';

  ASSERT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'stipend_award_unique_per_period'),
    'a student can be awarded twice in one period';

  RAISE NOTICE 'attendance_linked_stipends schema assertions passed';
END $$;
