-- Corrections to the usage-tracking tables, replacing most of
-- 20260809060000 and 20260809070000 — which were written against the
-- migration history rather than the live database, and are largely redundant.
--
-- ════════════════════════════════════════════════════════════════════════════
-- WHAT THE EARLIER MIGRATIONS GOT WRONG
-- ════════════════════════════════════════════════════════════════════════════
--
-- They were built on the premise that user_page_views / user_sessions /
-- user_engagement_daily / activity_logs had NO tenant_id and therefore NO
-- tenant scoping, so an admin at one tenant could read every other tenant's
-- browsing history.
--
-- That premise was FALSE. Checked against production 2026-08-10:
--
--   * All four tables already have tenant_id.
--   * All four already carry a RESTRICTIVE tenant_isolation_restrict
--     policy with qual (tenant_id = current_tenant_id()).
--   * All four also carry a RESTRICTIVE anon_tenant_isolation
--     (tenant_id = anon_tenant_id()) and two demo_viewer_* guards.
--
-- RESTRICTIVE policies are ANDed with the permissive ones, so every read is
-- already fenced to the caller's tenant. THERE IS NO CROSS-TENANT LEAK.
--
-- None of those policies appear in any migration in this repo — they were
-- applied directly on the droplet. The lesson is the one this platform keeps
-- relearning: on this database, migration history is not the schema. Check
-- pg_policies before reasoning about what a policy does.
--
-- Applying 20260809060000 as written would have DROPped a working
-- tenant_isolation_restrict to recreate an identical one, and would have left
-- the two things below unfixed.
--
-- ════════════════════════════════════════════════════════════════════════════
-- 1. A LIVE BUG: the unique constraint is tenant-blind
-- ════════════════════════════════════════════════════════════════════════════
--
-- user_engagement_daily still carries UNIQUE (user_id, date), while reads are
-- already tenant-fenced. src/hooks/useUsageTracking.ts:160-192 does NOT upsert
-- — it selects, then updates or inserts:
--
--   select('id, page_views, modules_visited').eq(user_id).eq(date).single()
--   → found ? update : insert
--
-- For a member active in two tenants on the same calendar day, the SELECT is
-- filtered to the current tenant and cannot see the row they wrote under the
-- other one. So it inserts, and collides with a constraint that is a plain
-- btree and is NOT RLS-aware: 23505, on every navigation, for the rest of that
-- day. The error is swallowed by the catch at line 204, so it presents as
-- silent write loss with nothing in any log.
--
-- This is happening NOW, not a hazard introduced by anything here. The
-- platform owner is the most exposed, browsing every tenant's subdomain.
--
-- NULLs are distinct in a unique index, so any legacy row with a NULL
-- tenant_id cannot collide with anything.

BEGIN;

DO $$
DECLARE v_con text;
BEGIN
  SELECT conname INTO v_con
    FROM pg_constraint
   WHERE conrelid = 'public.user_engagement_daily'::regclass
     AND contype = 'u'
     AND pg_get_constraintdef(oid) = 'UNIQUE (user_id, date)';
  IF v_con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_engagement_daily DROP CONSTRAINT %I', v_con);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_engagement_daily_tenant_user_date_key
  ON public.user_engagement_daily (tenant_id, user_id, date);

-- Fail loudly rather than leaving the 23505 loop in place.
DO $$
DECLARE v_left text;
BEGIN
  SELECT conname INTO v_left
    FROM pg_constraint
   WHERE conrelid = 'public.user_engagement_daily'::regclass
     AND contype = 'u'
     AND pg_get_constraintdef(oid) = 'UNIQUE (user_id, date)';
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION
      'UNIQUE (user_id, date) still present on user_engagement_daily as %; tenant-filtered reads collide with it on every navigation', v_left;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. A PRIVACY OVER-GRANT: instructors and exec board read everyone's activity
-- ════════════════════════════════════════════════════════════════════════════
--
-- Intra-tenant, not cross-tenant — the RESTRICTIVE fence holds. But the
-- permissive admin policies grant on role alone and the role lists are too
-- wide:
--
--   user_page_views / user_sessions / user_engagement_daily
--     role = ANY ('admin','super-admin','super_admin','instructor')
--       → any instructor reads every member of their tenant's page-by-page
--         browsing history, session times and dwell time.
--
--   activity_logs
--     ... OR is_exec_board = true
--       → a STUDENT OFFICER reads every member's activity log.
--
-- Neither is defensible for what these tables hold. Dropping the two extra
-- grants is the whole change: the admin role list is otherwise preserved
-- EXACTLY, including both super-admin spellings.
--
-- Deliberately NOT widened to gw_profiles.is_admin / is_super_admin booleans.
-- Flag-based admins are the common case live (see
-- 20260808200100_profiles_membership_admin_read.sql), so admitting them would
-- grant this read to people who do not have it today. That may well be right
-- as a product decision, but it is a WIDENING and does not belong in a
-- migration whose purpose is to narrow.

DROP POLICY IF EXISTS "Admins can view all page views" ON public.user_page_views;
CREATE POLICY "Admins can view all page views"
  ON public.user_page_views FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles
     WHERE gw_profiles.user_id = auth.uid()
       AND gw_profiles.role = ANY (ARRAY['admin','super-admin','super_admin'])
  ));

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles
     WHERE gw_profiles.user_id = auth.uid()
       AND gw_profiles.role = ANY (ARRAY['admin','super-admin','super_admin'])
  ));

DROP POLICY IF EXISTS "Admins can view all engagement" ON public.user_engagement_daily;
CREATE POLICY "Admins can view all engagement"
  ON public.user_engagement_daily FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles
     WHERE gw_profiles.user_id = auth.uid()
       AND gw_profiles.role = ANY (ARRAY['admin','super-admin','super_admin'])
  ));

DROP POLICY IF EXISTS "Admins and exec board can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.gw_profiles
     WHERE gw_profiles.user_id = auth.uid()
       AND gw_profiles.role = ANY (ARRAY['admin','super-admin','super_admin'])
  ));

-- No recursion risk: each policy scans gw_profiles, never the table it
-- protects, so none can raise 42P17 (the defect fixed four times on
-- 2026-08-09). gw_profiles' own policies do not read these four tables.

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFY AFTER APPLYING
-- ════════════════════════════════════════════════════════════════════════════
--
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid='public.user_engagement_daily'::regclass AND contype='u';
--   -- expect: no UNIQUE (user_id, date)
--
--   SELECT indexname FROM pg_indexes
--    WHERE tablename='user_engagement_daily'
--      AND indexname='user_engagement_daily_tenant_user_date_key';
--   -- expect: one row
--
--   SELECT tablename, policyname, qual FROM pg_policies
--    WHERE tablename IN ('user_page_views','user_sessions',
--                        'user_engagement_daily','activity_logs')
--      AND policyname ILIKE 'Admins%';
--   -- expect: no 'instructor', no is_exec_board, and the RESTRICTIVE
--   --         tenant_isolation_restrict / anon_tenant_isolation policies
--   --         still present and untouched.
