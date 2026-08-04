-- supabase/migrations/tests/prayer_calendar_test.sql
-- Run against a DB with 20260804120000_prayer_calendar.sql applied.
-- Asserts reference-table shape: RLS on, NO tenant_id, read-to-authenticated,
-- write-to-super_admin only.
BEGIN;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['gw_prayer_calendar_days','gw_prayer_readings'] LOOP
    ASSERT (SELECT count(*) = 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t), t || ' missing';
    ASSERT (SELECT relrowsecurity FROM pg_class
            WHERE relname = t AND relnamespace = 'public'::regnamespace),
           t || ': RLS not enabled';
    -- These are PLATFORM REFERENCE tables. Absence of tenant_id is deliberate.
    ASSERT (SELECT count(*) = 0 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t
              AND column_name = 'tenant_id'),
           t || ': has tenant_id — reference tables must be tenant-neutral';
    ASSERT (SELECT count(*) = 0 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
              AND permissive = 'RESTRICTIVE'),
           t || ': unexpected RESTRICTIVE policy on a reference table';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
              AND policyname = t || '_read'),
           t || ': read policy missing';
    ASSERT (SELECT count(*) = 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = t
              AND policyname = t || '_admin_write'),
           t || ': admin write policy missing';
  END LOOP;
END $$;

DO $$
BEGIN
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'gw_prayer_calendar_days_rite_date_key_uidx'),
         'unique (rite, day_date, event_key) index missing';
  ASSERT (SELECT count(*) = 1 FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'gw_prayer_readings_day_slot_uidx'),
         'unique (calendar_day_id, slot, schema_label) index missing';
END $$;

-- The super-admin predicate must NOT grant to tenant admins, and must accept
-- both role spellings. This is the security-relevant behaviour, so evaluate it
-- rather than merely asserting the function exists.
DO $$
DECLARE
  admin_id  uuid := '22222222-2222-2222-2222-222222222222';
  snake_id  uuid := '33333333-3333-3333-3333-333333333333';
  kebab_id  uuid := '44444444-4444-4444-4444-444444444444';
  bool_id   uuid := '55555555-5555-5555-5555-555555555555';
  nobody_id uuid := '66666666-6666-6666-6666-666666666666';
BEGIN
  INSERT INTO public.gw_profiles (user_id, is_admin, is_super_admin, role) VALUES
    (admin_id,  true,  false, 'admin'),
    (snake_id,  false, false, 'super_admin'),
    (kebab_id,  false, false, 'super-admin'),
    (bool_id,   false, true,  NULL),
    (nobody_id, false, false, 'student');

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  ASSERT public.gw_is_platform_super_admin() = false,
         'tenant admin must NOT count as platform super admin';

  PERFORM set_config('request.jwt.claim.sub', snake_id::text, true);
  ASSERT public.gw_is_platform_super_admin() = true, 'super_admin spelling rejected';

  PERFORM set_config('request.jwt.claim.sub', kebab_id::text, true);
  ASSERT public.gw_is_platform_super_admin() = true, 'super-admin spelling rejected';

  PERFORM set_config('request.jwt.claim.sub', bool_id::text, true);
  ASSERT public.gw_is_platform_super_admin() = true, 'is_super_admin boolean ignored';

  PERFORM set_config('request.jwt.claim.sub', nobody_id::text, true);
  ASSERT public.gw_is_platform_super_admin() = false, 'ordinary user granted admin';

  PERFORM set_config('request.jwt.claim.sub', '', true);
  ASSERT public.gw_is_platform_super_admin() = false, 'anonymous granted admin';
END $$;

ROLLBACK;
