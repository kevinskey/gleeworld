-- supabase/migrations/tests/_prayer_test_fixture.sql
--
-- Minimal Supabase-shaped bootstrap so the Prayer Phase 0 migrations and their
-- assertion tests can run against a bare PostgreSQL 15 container.
--
-- This is NOT applied to any real environment. It exists because replaying all
-- 2,457 historical migrations locally is neither necessary nor reliable for
-- testing five new objects. It creates only what the Phase 0 migrations
-- actually reference:
--
--   * the `authenticated` role that every policy grants to
--   * an `auth` schema with `auth.uid()`
--   * `public.gw_profiles` with the three columns the super-admin predicate reads
--
-- Usage:
--   psql "$PRAYER_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/tests/_prayer_test_fixture.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

-- Real Supabase reads the JWT from a request setting. The stub returns NULL
-- unless a test explicitly sets request.jwt.claim.sub, which is enough for the
-- Phase 0 tests: they assert policy *shape*, not policy evaluation.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Only the columns gw_is_platform_super_admin() reads.
CREATE TABLE IF NOT EXISTS public.gw_profiles (
  user_id         uuid PRIMARY KEY,
  is_admin        boolean NOT NULL DEFAULT false,
  is_super_admin  boolean NOT NULL DEFAULT false,
  role            text
);
