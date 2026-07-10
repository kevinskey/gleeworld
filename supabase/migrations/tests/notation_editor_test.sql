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
-- the join table exists with a tenant default and the tenant trigger
DO $$ BEGIN
  ASSERT (SELECT count(*) = 1 FROM information_schema.tables
          WHERE table_name='gw_sight_reading_assignment_items'), 'join table missing';
  ASSERT (SELECT count(*) >= 1 FROM information_schema.triggers
          WHERE event_object_table='gw_sight_reading_assignment_items' AND action_timing='BEFORE'), 'tenant trigger missing';
END $$;
-- RLS enabled on the join table
DO $$ BEGIN
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE relname='gw_sight_reading_assignment_items'), 'RLS not enabled';
END $$;
ROLLBACK;
