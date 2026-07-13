-- Fix: RLS policies rejecting super_admin users due to role-spelling drift.
--
-- gw_profiles.role has two spellings in the wild: 'super_admin' (canonical,
-- used by 693 policies and src/lib/roles.ts) and legacy 'super-admin'
-- (4 older profiles + 54 legacy policies). A user with either spelling fails
-- the policies written for the other. Reported symptom: super_admin user got
-- "new row violates row-level security policy for table gw_course_modules"
-- when adding a module in Glee Academy.
--
-- This migration is ADDITIVE: every policy whose role list contains
-- 'super-admin' also gets 'super_admin'. No policy loses a match, so the
-- legacy hyphen accounts keep working. All 54 affected policies use the
-- `role = ANY (ARRAY[...])` form (verified: no equality or negated forms).
--
-- Run as supabase_admin (owns the policy objects on this stack).

DO $$
DECLARE
  r RECORD;
  new_qual  text;
  new_check text;
  stmt      text;
BEGIN
  FOR r IN
    SELECT p.polname,
           p.polrelid::regclass AS tbl,
           pg_get_expr(p.polqual, p.polrelid)      AS qual,
           pg_get_expr(p.polwithcheck, p.polrelid) AS chk
    FROM pg_policy p
    WHERE (COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ||
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), ''))
          LIKE '%''super-admin''%'
      -- idempotency: skip policies that already accept the underscore form
      AND (COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ||
           COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), ''))
          NOT LIKE '%''super\_admin''%' ESCAPE '\'
  LOOP
    new_qual  := replace(r.qual,
                         '''super-admin''::text',
                         '''super-admin''::text, ''super_admin''::text');
    new_check := replace(r.chk,
                         '''super-admin''::text',
                         '''super-admin''::text, ''super_admin''::text');

    stmt := format('ALTER POLICY %I ON %s', r.polname, r.tbl);
    IF new_qual IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;

    RAISE NOTICE 'Rewriting policy % on %', r.polname, r.tbl;
    EXECUTE stmt;
  END LOOP;
END $$;
