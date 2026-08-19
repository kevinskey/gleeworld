-- SUPERSEDED — DO NOT APPLY. This migration was never run anywhere.
--
-- It was written against this repo's migration history, on the premise that
-- these tables had no tenant_id and no tenant scoping. Checked against
-- production on 2026-08-10, that premise was FALSE: the tables already have
-- tenant_id and already carry a RESTRICTIVE tenant_isolation_restrict policy
-- (tenant_id = current_tenant_id()), plus anon_tenant_isolation and two
-- demo_viewer_* guards. None of those appear in any migration here — they were
-- applied directly on the droplet. There was no cross-tenant leak.
--
-- Applying this would DROP a working tenant_isolation_restrict in order to
-- recreate an identical one, for no benefit and some risk.
--
-- The two things that DID need fixing — a tenant-blind UNIQUE (user_id, date)
-- causing a live 23505 loop, and instructor/is_exec_board over-grants on the
-- admin read policies — are in:
--
--   20260810120000_usage_tracking_corrections.sql
--
-- Kept rather than deleted so the reasoning, and the correction, stay legible.
-- The original body follows, neutralised.

/* ORIGINAL BODY — INERT, RETAINED FOR THE RECORD

-- Tenant-isolate the usage-tracking tables.
--
-- ════════════════════════════════════════════════════════════════════════════
-- PRE-FLIGHT — RUN THIS AGAINST PRODUCTION BEFORE APPLYING
-- ════════════════════════════════════════════════════════════════════════════
--
--   SELECT policyname, permissive, cmd, qual FROM pg_policies
--   WHERE tablename IN ('user_page_views','user_sessions','user_engagement_daily');
--
-- Confirm it returns EXACTLY these seven policies, all created by
-- 20260120063345_01727965-7b12-4016-b501-acd765dbe80d.sql:
--
--   user_page_views        "Users can insert own page views"   INSERT
--   user_page_views        "Admins can view all page views"    SELECT
--   user_page_views        "Users can view own page views"     SELECT
--   user_sessions          "Users can manage own sessions"     ALL
--   user_sessions          "Admins can view all sessions"      SELECT
--   user_engagement_daily  "Users can manage own engagement"   ALL
--   user_engagement_daily  "Admins can view all engagement"    SELECT
--
-- WHY THIS MATTERS. Section 4 below closes the leak by DROP POLICY IF EXISTS
-- on those exact quoted names. If anyone hand-patched these tables directly on
-- the droplet (this platform has a documented history of out-of-band DDL —
-- see 20260718020000_current_tenant_id_platform_owner_sync.sql), a
-- differently-NAMED admin SELECT policy would survive every DROP here, remain
-- permissive, and keep granting an unscoped cross-tenant read. The RESTRICTIVE
-- policy in section 3 would still fence it to one tenant, so this is not
-- catastrophic — but the 'instructor' grant and the role-only check would
-- silently persist. If the query returns anything other than the seven rows
-- above, stop and reconcile before applying.
--
-- ════════════════════════════════════════════════════════════════════════════
-- WHAT WAS WRONG
-- ════════════════════════════════════════════════════════════════════════════
--
-- user_page_views / user_sessions / user_engagement_daily are written on every
-- navigation by UsageTracker (mounted around the whole app in App.tsx). They had
-- RLS enabled, own-row insert, and own-row select — but their "admin" SELECT
-- policy was:
--
--   USING (EXISTS (SELECT 1 FROM gw_profiles
--                  WHERE user_id = auth.uid()
--                    AND role IN ('admin','super-admin','instructor')))
--
-- Two defects, compounding:
--
--   1. NO TENANT SCOPING. These tables have no tenant_id at all, so the policy
--      cannot filter by tenant even in principle. On a multi-tenant platform an
--      admin at one tenant could read the page-by-page browsing history of every
--      member of EVERY other tenant.
--   2. 'instructor' WAS TREATED AS ADMIN. Not just tenant admins — any
--      instructor, at any tenant, got the same platform-wide read.
--
-- Same class as the storage_auth_select cross-tenant hole: a policy that grants
-- on role without ever asking "which tenant".
--
-- ════════════════════════════════════════════════════════════════════════════
-- WHAT THIS DOES
-- ════════════════════════════════════════════════════════════════════════════
--
--   * adds tenant_id to all three tables, DEFAULT current_tenant_id()
--   * adds a BEFORE INSERT trigger to fill it (belt-and-braces: the DEFAULT
--     only fires when the column is omitted, the trigger also covers an
--     explicit NULL). Reuses the existing shared public.set_tenant_id_default()
--     helper rather than minting a near-duplicate — see "TRIGGER SCOPE" below.
--   * adds a RESTRICTIVE tenant-isolation policy to each, so every other policy
--     is ANDed with "same tenant"
--   * replaces UNIQUE(user_id, date) on user_engagement_daily with
--     UNIQUE(tenant_id, user_id, date) — MANDATORY, see "CONSTRAINT" below
--   * replaces the admin SELECT policies with a tenant-scoped predicate
--
-- ════════════════════════════════════════════════════════════════════════════
-- CONSTRAINT — user_engagement_daily UNIQUE(user_id, date) MUST CHANGE
-- ════════════════════════════════════════════════════════════════════════════
--
-- This is not optional and not a nicety. src/hooks/useUsageTracking.ts:160-192
-- does NOT upsert. It does:
--
--   select('id, page_views, modules_visited').eq(user_id).eq(date).single()
--   → if found: update  |  if not found: insert
--
-- Verified: there is no .upsert() and no onConflict target on this table
-- anywhere in the repo (grep across src/ and supabase/functions/ returns
-- nothing). An earlier draft of this migration claimed "the app upserts on the
-- existing constraint … changing it raises 42P10" and left the constraint
-- alone. That claim was FALSE, and acting on it would have been the worst
-- outcome available:
--
--   Once the SELECT is tenant-filtered by the RESTRICTIVE policy, a user who is
--   active in two tenants on the same calendar day cannot see the row they wrote
--   under the other tenant. The read returns nothing, the hook takes the INSERT
--   branch, and the insert collides with UNIQUE(user_id, date) — which is a
--   plain btree constraint and is NOT RLS-aware. Result: 23505 on EVERY
--   navigation, permanently, for every such user. The error is swallowed by the
--   catch at line 204, so it presents as silent write loss plus a wasted
--   round-trip per page view, with nothing in any log.
--
-- The replacement UNIQUE(tenant_id, user_id, date) makes the constraint agree
-- with what the RESTRICTIVE policy lets the app see. Legacy rows keep
-- tenant_id = NULL and NULLs are distinct in a unique index, so they cannot
-- collide with anything.
--
-- ════════════════════════════════════════════════════════════════════════════
-- ADMIN READ — WHAT NARROWS AND WHAT WIDENS
-- ════════════════════════════════════════════════════════════════════════════
--
-- Be honest in both directions. This is not a pure tightening.
--
-- NARROWS:
--   * 'instructor' is dropped entirely. Instructors are not admins and have no
--     business reading other members' browsing history. If a specific
--     instructor workflow needs this, give it its own narrowly-scoped policy
--     rather than restoring a platform-wide grant.
--   * The grant is now tenant-scoped. Previously an admin at ANY tenant read
--     EVERY tenant. Now the authority must exist in the CURRENT tenant.
--
-- WIDENS:
--   * The old policy tested gw_profiles.role only — the text column. The new
--     predicate also admits gw_profiles.is_admin and gw_profiles.is_super_admin
--     (booleans), and gw_tenant_members.role in ('admin','director','owner',
--     'super-admin','super_admin') for the current tenant.
--   * This is NOT theoretical. Per 20260808200100_profiles_membership_admin_read.sql,
--     flag-based and membership-based admins are the COMMON case live: "All five
--     demo tenants' admins are in this state" — tenant admins whose rights come
--     from gw_tenant_members.role, holding no matching gw_profiles.role text.
--     Several such people could not read these tables before and can now.
--   * Net effect for a tenant admin who previously had nothing: they gain a read
--     over their OWN tenant's usage data. That is the intended product
--     behaviour (UsageAnalyticsModule is an admin surface) and it is bounded by
--     the RESTRICTIVE policy, but it is a real widening and is recorded as one.
--
-- WHY NOT current_user_is_admin(). Its first branch checks gw_profiles admin
-- flags with NO tenant predicate:
--
--   EXISTS (SELECT 1 FROM gw_profiles WHERE user_id = auth.uid()
--             AND (is_admin OR is_super_admin OR role IN ('admin','super-admin')))
--
-- So a profile-flag admin of tenant A who also holds a gw_tenant_members row in
-- tenant B — in ANY role, student included — gets current_tenant_id() = B while
-- standing on B's subdomain (see current_tenant_id(), 20260718020000: a member
-- of the header tenant is returned that tenant) and still returns true. The
-- RESTRICTIVE policy then happily hands them all of B's history. That is the
-- exact cross-tenant read this migration exists to close, surviving inside the
-- fix.
--
-- The shared helper is NOT changed here — it has other callers (12+ RLS
-- policies, admin_create_user, delete_user_and_data) and re-scoping it is a
-- platform-wide decision, not a usage-analytics one. Instead this migration
-- adds a new, separately-named, tenant-scoped helper used only by these tables
-- (and by activity_logs in the sibling migration).
--
-- ════════════════════════════════════════════════════════════════════════════
-- RECURSION AND RLS BYPASS — THE ACTUAL MECHANISM
-- ════════════════════════════════════════════════════════════════════════════
--
-- No policy here scans the table it protects, so none can raise 42P17 (infinite
-- recursion detected in policy) — the defect fixed repeatedly in migrations
-- 20260809020000..20260809040000.
--
-- An earlier draft justified the inner scans of gw_profiles / gw_tenant_members
-- by saying the helpers are SECURITY DEFINER and therefore "do not re-enter the
-- caller's RLS". THAT IS WRONG. SECURITY DEFINER changes the effective USER; it
-- does not disable row-level security. RLS is skipped only when the current
-- effective role is a superuser, has BYPASSRLS, or owns the table AND the table
-- does not have FORCE ROW LEVEL SECURITY. gw_profiles has FORCE ROW LEVEL
-- SECURITY, so the table-owner route is closed.
--
-- The conclusion still holds, but for a different reason: these helper
-- functions are owned by supabase_admin, which has BYPASSRLS. It is the OWNER'S
-- BYPASSRLS ATTRIBUTE, not the SECURITY DEFINER keyword, that keeps the inner
-- scans from re-entering RLS.
--
-- That makes correct ownership a load-bearing precondition rather than an
-- incidental detail, so the guard below fails the migration loudly if it is
-- applied as anything else. Applied as, say, `postgres` on a managed instance
-- without BYPASSRLS, the helpers would be created owned by that role, the inner
-- gw_profiles scan would run under the caller's RLS, and the admin read would
-- silently evaluate to false for everyone — an availability bug that looks like
-- a permissions bug and would take a day to find.
--
-- ════════════════════════════════════════════════════════════════════════════
-- FAILURE MODES YOU SHOULD KNOW ABOUT BEFORE APPLYING
-- ════════════════════════════════════════════════════════════════════════════
--
-- NULL TENANT = TRACKING STOPS FOR THAT USER. If current_tenant_id() returns
-- NULL (no x-tenant-slug header match, no tenant_id JWT claim, and a
-- gw_profiles row with a NULL tenant_id), the DEFAULT and the trigger both set
-- NULL, the RESTRICTIVE WITH CHECK evaluates NULL = NULL → NULL → not true, and
-- the INSERT is rejected with 42501. That is the correct direction — it fails
-- CLOSED, never writing an unattributable row — but the consequence is real:
-- page-view tracking stops entirely for those users, and because the hook
-- swallows the error at line 204, it stops SILENTLY. If usage analytics goes
-- quiet for a cohort after this lands, this is the first thing to check.
--
-- TRIGGER SCOPE — INSERT ONLY, DELIBERATELY. The trigger is BEFORE INSERT and
-- has no UPDATE arm. An UPDATE arm would be theatre: for UPDATE, the RESTRICTIVE
-- policy's USING qual is evaluated against the OLD row BEFORE any BEFORE
-- trigger fires, so a legacy row with tenant_id = NULL can never be selected for
-- update in the first place and the trigger never runs on it. An UPDATE arm
-- therefore cannot repair a single historical row; it would only imply coverage
-- that does not exist. Because the arm is gone, this migration reuses the
-- existing shared public.set_tenant_id_default() helper (created conditionally
-- in 20260710120000, used by 20260808140000) instead of minting a near-identical
-- private copy.
--
-- POLICY ROLE — "TO PUBLIC", DELIBERATELY. The RESTRICTIVE policies below omit
-- the TO clause, which makes them TO PUBLIC. The house pattern (20260808140000)
-- is a pair: `AS RESTRICTIVE FOR ALL TO authenticated` plus a separate
-- `TO anon` policy using anon_tenant_id(). TO PUBLIC is STRICTER than either —
-- it applies to every role that is not exempt from RLS, so any future grant to
-- a role nobody thought about is fenced by default. These tables have no
-- legitimate anon writer and no service-role reader that is not already
-- BYPASSRLS, so there is nothing to accommodate and the stricter form is the
-- right one here.
--
-- ════════════════════════════════════════════════════════════════════════════
-- EXISTING ROWS ARE LEFT WITH tenant_id = NULL ON PURPOSE
-- ════════════════════════════════════════════════════════════════════════════
--
-- The RESTRICTIVE policy compares tenant_id = current_tenant_id(), and
-- NULL = <uuid> is NULL, not true — so historical rows become invisible to
-- every non-BYPASSRLS caller the moment this lands. That closes the leak
-- immediately without a backfill that could mis-attribute one tenant's history
-- to another. An optional, deliberately-separate backfill is at the bottom;
-- read all of it before running any of it.
--
-- Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6.4
-- Ships with: src/hooks/useUsageTracking.ts SESSION_DB_ID_KEY bump to _v2.
--   Without that bump, every open tab holds a user_sessions id in
--   sessionStorage for a row that is about to become invisible (NULL tenant).
--   The UPDATEs at useUsageTracking.ts:99-105 and :196-202 then match zero rows
--   and return 204 with no error, and initSession() returns early whenever the
--   ref is set — so the tab never creates a replacement session and simply stops
--   recording, with no symptom. Changing the key discards the stale ids.

BEGIN;

-- ── 0. ownership guard ──────────────────────────────────────────────────────
--
-- See "RECURSION AND RLS BYPASS" above. The helper functions created below are
-- only correct if their owner can bypass RLS.

DO $$ BEGIN
  IF NOT (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'apply as supabase_admin/postgres: helper functions must be owned by a BYPASSRLS role';
  END IF;
END $$;

-- ── 1. tenant_id ────────────────────────────────────────────────────────────

ALTER TABLE public.user_page_views
  ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.current_tenant_id();
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.current_tenant_id();
ALTER TABLE public.user_engagement_daily
  ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT public.current_tenant_id();

-- Deliberately NOT NOT-NULL: that would require backfilling historical rows
-- first, and a wrong backfill is worse than an invisible one. Revisit after
-- the optional backfill below has been run and verified.

-- ── 2. replace UNIQUE(user_id, date) — see "CONSTRAINT" above ───────────────
--
-- Must run after the tenant_id column exists and before COMMIT. The constraint
-- is found by its COLUMN SET, not by a guessed name: it was created inline as
-- `UNIQUE(user_id, date)` in 20260120063345, which Postgres names
-- user_engagement_daily_user_id_date_key — but a table that has been dumped and
-- restored, or hand-patched, can carry a different name for the same shape.

DO $$
DECLARE
  v_con text;
BEGIN
  SELECT c.conname INTO v_con
    FROM pg_constraint c
    JOIN pg_class     t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'user_engagement_daily'
     AND c.contype = 'u'
     AND (SELECT array_agg(a.attname ORDER BY a.attname)
            FROM unnest(c.conkey) AS k(attnum)
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum)
         = ARRAY['date','user_id']::name[];

  IF v_con IS NULL THEN
    RAISE NOTICE 'user_engagement_daily: no UNIQUE(user_id, date) constraint found — already replaced, or the table differs from 20260120063345';
  ELSE
    EXECUTE format('ALTER TABLE public.user_engagement_daily DROP CONSTRAINT %I', v_con);
    RAISE NOTICE 'user_engagement_daily: dropped % (UNIQUE(user_id, date))', v_con;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_engagement_daily_tenant_user_date_key
  ON public.user_engagement_daily (tenant_id, user_id, date);

-- Fail loudly rather than shipping the 23505-on-every-navigation bug.
DO $$
DECLARE
  v_left text;
BEGIN
  SELECT c.conname INTO v_left
    FROM pg_constraint c
    JOIN pg_class     t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname = 'user_engagement_daily'
     AND c.contype = 'u'
     AND (SELECT array_agg(a.attname ORDER BY a.attname)
            FROM unnest(c.conkey) AS k(attnum)
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum)
         = ARRAY['date','user_id']::name[];
  IF v_left IS NOT NULL THEN
    RAISE EXCEPTION 'UNIQUE(user_id, date) still present on user_engagement_daily as %; tenant-filtered reads would collide with it on every navigation', v_left;
  END IF;
END $$;

-- ── 3. fill on write ────────────────────────────────────────────────────────
--
-- public.set_tenant_id_default() is the shared helper (created conditionally in
-- 20260710120000, used by 20260808140000). Created here only if absent, with the
-- identical body, so this migration is safe to apply to a database rebuilt from
-- an earlier point. BEFORE INSERT only — see "TRIGGER SCOPE" above.

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_tenant_id_default' AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.set_tenant_id_default() RETURNS trigger
    LANGUAGE plpgsql SET search_path = public, pg_temp
    AS $fn$ BEGIN
      IF NEW.tenant_id IS NULL THEN NEW.tenant_id := public.current_tenant_id(); END IF; RETURN NEW; END $fn$;
  END IF;
END
$do$;

DROP TRIGGER IF EXISTS user_page_views_fill_tenant ON public.user_page_views;
CREATE TRIGGER user_page_views_fill_tenant
  BEFORE INSERT ON public.user_page_views
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

DROP TRIGGER IF EXISTS user_sessions_fill_tenant ON public.user_sessions;
CREATE TRIGGER user_sessions_fill_tenant
  BEFORE INSERT ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

DROP TRIGGER IF EXISTS user_engagement_daily_fill_tenant ON public.user_engagement_daily;
CREATE TRIGGER user_engagement_daily_fill_tenant
  BEFORE INSERT ON public.user_engagement_daily
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default();

-- ── 4. RESTRICTIVE tenant isolation ─────────────────────────────────────────
--
-- RESTRICTIVE policies are ANDed with the permissive ones, so this cannot be
-- widened by any existing or future permissive policy on these tables.
-- TO PUBLIC is deliberate — see "POLICY ROLE" above.

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.user_page_views;
CREATE POLICY tenant_isolation_restrict
  ON public.user_page_views
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.user_sessions;
CREATE POLICY tenant_isolation_restrict
  ON public.user_sessions
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.user_engagement_daily;
CREATE POLICY tenant_isolation_restrict
  ON public.user_engagement_daily
  AS RESTRICTIVE FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ── 5. tenant-scoped admin predicate ────────────────────────────────────────
--
-- New helper, NOT a change to current_user_is_admin(). See "ADMIN READ" above
-- for why the shared helper cannot be used here and must not be edited.
--
-- Every branch is anchored to current_tenant_id(): profile-flag authority must
-- live in the current tenant, membership authority must be a row in the current
-- tenant, and is_platform_owner() already requires tenant_slug='main' on the JWT
-- plus gw_profiles.is_super_admin.
--
-- Role spellings follow the house rule (reference_super_admin_role_spelling):
-- accept 'super_admin' and legacy 'super-admin'. Membership roles match the list
-- in 20260808200100_profiles_membership_admin_read.sql.

CREATE OR REPLACE FUNCTION public.current_user_is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND p.tenant_id = public.current_tenant_id()
      AND (p.is_admin = true
           OR p.is_super_admin = true
           OR p.role IN ('admin', 'super-admin', 'super_admin'))
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_tenant_members m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = public.current_tenant_id()
      AND m.role IN ('admin', 'director', 'owner', 'super-admin', 'super_admin')
  )
  OR public.is_platform_owner();
$function$;

COMMENT ON FUNCTION public.current_user_is_tenant_admin() IS
  'Admin check whose authority must exist IN THE CURRENT TENANT. Unlike '
  'current_user_is_admin(), the gw_profiles branch is scoped by '
  'tenant_id = current_tenant_id(), so a profile-flag admin of tenant A who is '
  'merely a member of tenant B is NOT an admin on B''s subdomain. Used by the '
  'usage-tracking and activity_logs admin reads. Deliberately separate from '
  'current_user_is_admin(), which has many other callers.';

-- ── 6. re-scope the admin read ──────────────────────────────────────────────
--
-- The old names come from 20260120063345; the pre-flight query above exists to
-- confirm no differently-named survivor is hiding behind these drops.

DROP POLICY IF EXISTS "Admins can view all page views" ON public.user_page_views;
DROP POLICY IF EXISTS usage_admin_select_page_views ON public.user_page_views;
CREATE POLICY usage_admin_select_page_views
  ON public.user_page_views FOR SELECT
  USING (public.current_user_is_tenant_admin());

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS usage_admin_select_sessions ON public.user_sessions;
CREATE POLICY usage_admin_select_sessions
  ON public.user_sessions FOR SELECT
  USING (public.current_user_is_tenant_admin());

DROP POLICY IF EXISTS "Admins can view all engagement" ON public.user_engagement_daily;
DROP POLICY IF EXISTS "Admins can view all engagement data" ON public.user_engagement_daily;
DROP POLICY IF EXISTS usage_admin_select_engagement ON public.user_engagement_daily;
CREATE POLICY usage_admin_select_engagement
  ON public.user_engagement_daily FOR SELECT
  USING (public.current_user_is_tenant_admin());

-- ── 7. indexes matching the real admin queries ──────────────────────────────
--
-- UsageAnalyticsModule.tsx does NOT filter by user_id on any of the three
-- tables. It filters and orders on the timestamp alone:
--
--   :80-95   user_page_views       .gte/.lte(created_at).order(created_at desc).limit(500)
--   :114-118 user_engagement_daily .gte(date).order(date desc)
--   :129-134 user_sessions         .gte(session_start).order(session_start desc).limit(100)
--
-- With no user_id predicate, a (tenant_id, user_id, created_at DESC) index
-- degenerates to a full scan of the tenant's rows — the leading columns are
-- usable but the ordering column is third, so Postgres cannot walk it in order.
-- Each table therefore gets a (tenant_id, <time> DESC) index that matches the
-- query shape exactly. The per-user composite is kept for the own-history
-- lookups the app also does.

CREATE INDEX IF NOT EXISTS idx_user_page_views_tenant_created
  ON public.user_page_views (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_page_views_tenant_user_created
  ON public.user_page_views (tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_start
  ON public.user_sessions (tenant_id, session_start DESC);

CREATE INDEX IF NOT EXISTS idx_user_engagement_daily_tenant_date
  ON public.user_engagement_daily (tenant_id, date DESC);

COMMENT ON COLUMN public.user_page_views.tenant_id IS
  'Tenant that owns this row. NULL on rows written before 20260809060000; those are invisible to every non-BYPASSRLS caller by design.';
COMMENT ON COLUMN public.user_sessions.tenant_id IS
  'Tenant that owns this row. NULL on rows written before 20260809060000; those are invisible to every non-BYPASSRLS caller by design.';
COMMENT ON COLUMN public.user_engagement_daily.tenant_id IS
  'Tenant that owns this row. NULL on rows written before 20260809060000; those are invisible to every non-BYPASSRLS caller by design. Part of UNIQUE(tenant_id, user_id, date).';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- OPTIONAL BACKFILL — READ ALL OF THIS. NOT PART OF THE MIGRATION.
--
-- Historical rows have tenant_id = NULL and are therefore invisible. If that
-- history matters, one option is to attribute each row to the writer's home
-- tenant:
--
--   -- MUST be run as supabase_admin / postgres. See caveat 2.
--   BEGIN;
--   UPDATE public.user_page_views v
--      SET tenant_id = p.tenant_id
--     FROM public.gw_profiles p
--    WHERE p.user_id = v.user_id
--      AND v.tenant_id IS NULL
--      AND p.tenant_id IS NOT NULL
--      AND v.created_at >= '2026-01-01' AND v.created_at < '2026-02-01';  -- one window at a time
--   -- inspect the count, then COMMIT or ROLLBACK
--   COMMIT;
--
-- Six things to weigh first. The first three can produce wrong data or a
-- false sense of success; do not skip them.
--
--   1. IT ATTRIBUTES BY CURRENT HOME TENANT, WHICH IS WRONG FOR MOVERS.
--      For a member who was in tenant A and is now in B, this hands B a view of
--      activity that happened at A. If any user has ever moved between tenants,
--      prefer leaving the history invisible.
--
--   2. IT MUST RUN AS A BYPASSRLS ROLE, OR IT LIES. Run as `authenticated`, the
--      RESTRICTIVE tenant_isolation_restrict policy hides every NULL-tenant row
--      from the UPDATE's own scan. The statement matches zero rows and REPORTS
--      SUCCESS. The "inspect the count, then COMMIT" step would show UPDATE 0
--      and read as "nothing needed fixing" — the single most likely way to
--      conclude this backfill is done when it has not started. Run it as
--      supabase_admin or postgres, and treat UPDATE 0 as a red flag, not a
--      green one.
--
--   3. THE PLATFORM OWNER IS THE WORST CASE, NOT AN EDGE CASE. The platform
--      owner's gw_profiles.tenant_id is 'main', and they browse EVERY tenant's
--      subdomain doing admin work. This UPDATE relabels their entire
--      cross-tenant browsing history as 'main'. That is the same bug class as
--      20260718020000_current_tenant_id_platform_owner_sync.sql, where the
--      owner's work on lykehouse.gleeworld.org was written under tenant_id
--      'main' and the real data was lost. Exclude the owner explicitly, or
--      accept that their history is mislabelled.
--
--   4. IT ONLY COVERS user_page_views. user_sessions and user_engagement_daily
--      are untouched by the statement above and their historical rows stay NULL
--      and invisible. That is a defensible split — sessions and daily
--      aggregates are cheap to regenerate from live traffic and are not
--      forensically interesting — but it means analytics over the pre-migration
--      period will show page views with no sessions and no daily rollups behind
--      them. If you want them too, write the equivalent statements; note that
--      user_engagement_daily rows would need to satisfy the new
--      UNIQUE(tenant_id, user_id, date), which they will, since each user has at
--      most one NULL-tenant row per date.
--
--   5. IT IS UNBATCHED OVER A HOT TABLE. user_page_views has been written on
--      every navigation by every user since January. A single unqualified
--      UPDATE rewrites every historical row in one transaction, holding row
--      locks and bloating the table while UsageTracker keeps inserting. Batch by
--      created_at window (as shown above) and commit between windows, or take a
--      maintenance window.
--
--   6. SOME ROWS CAN NEVER BE ATTRIBUTED. Rows whose author has a NULL
--      gw_profiles.tenant_id, and rows whose author was deleted (user_id is ON
--      DELETE CASCADE from auth.users, so deleted users take their rows with
--      them, but a row whose profile row is gone while the auth user remains
--      will not join), keep tenant_id = NULL and stay invisible. The backfill
--      is partial by construction; do not follow it with
--      ALTER COLUMN tenant_id SET NOT NULL without checking what is left.
-- ────────────────────────────────────────────────────────────────────────────


*/
