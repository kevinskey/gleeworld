-- supabase/migrations/tests/notation_editor_test.sql
-- Run against a DB with the migration applied. Asserts additive-safety + tenant plumbing.
BEGIN;
-- student_id exists, is nullable, has no non-null default (course-only assignments unchanged)
DO $$ BEGIN
  ASSERT (SELECT is_nullable = 'YES' FROM information_schema.columns
          WHERE table_name='gw_assignments' AND column_name='student_id'), 'student_id must be nullable';
  ASSERT (SELECT column_default IS NULL FROM information_schema.columns
          WHERE table_name='gw_assignments' AND column_name='student_id'), 'student_id must have no default';
END $$;
-- the join table exists, and the tenant coalesce trigger is bound to the RIGHT
-- function on BEFORE INSERT (not merely "some BEFORE trigger exists")
DO $$ BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.tables
          WHERE table_name='gw_sight_reading_assignment_items'), 'join table missing';
  ASSERT (SELECT count(*) >= 1 FROM information_schema.triggers
          WHERE event_object_table='gw_sight_reading_assignment_items'
            AND action_timing='BEFORE' AND event_manipulation='INSERT'
            AND action_statement ILIKE '%set_tenant_id_default%'),
         'tenant coalesce trigger not bound to set_tenant_id_default on INSERT';
END $$;
-- gw_sight_reading_exercises tenant plumbing (default + new columns)
DO $$ BEGIN
  ASSERT (SELECT column_default LIKE '%current_tenant_id%' FROM information_schema.columns
          WHERE table_name='gw_sight_reading_exercises' AND column_name='tenant_id'),
         'exercises.tenant_id default not set to current_tenant_id()';
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_name='gw_sight_reading_exercises' AND column_name='difficulty'), 'exercises.difficulty missing';
  ASSERT (SELECT count(*) = 1 FROM information_schema.columns
          WHERE table_name='gw_sight_reading_exercises' AND column_name='is_active'), 'exercises.is_active missing';
END $$;
-- RLS enabled AND both policies present with correct kinds. A RESTRICTIVE policy
-- alone denies everything; the PERMISSIVE grant must exist too. This guards against
-- either policy being silently dropped (all-denied) or the isolation policy vanishing
-- (all-open cross-tenant).
DO $$ BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname='gw_sight_reading_assignment_items'), 'RLS not enabled';
  ASSERT (SELECT count(*) = 1 FROM pg_policies
          WHERE tablename='gw_sight_reading_assignment_items'
            AND policyname='srai_isolation' AND permissive='RESTRICTIVE'), 'RESTRICTIVE isolation policy missing';
  ASSERT (SELECT count(*) = 1 FROM pg_policies
          WHERE tablename='gw_sight_reading_assignment_items'
            AND policyname='srai_rw' AND permissive='PERMISSIVE'), 'PERMISSIVE base-access policy missing';
END $$;
ROLLBACK;
