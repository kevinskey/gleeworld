-- Two confirmed cross-tenant read holes, verified against the live DB
-- 2026-08-08 via scripts/audit-tenant-isolation-exposure.sql. Both fixes are
-- non-destructive and reversible; neither drops data.
--
-- Most of what the exposure audit flagged turned out to be SAFE on inspection
-- and is deliberately left alone:
--   • gw_merch_products / gw_merch_designs — policies are PERMISSIVE rather
--     than RESTRICTIVE, but their predicate IS (tenant_id = current_tenant_id())
--     and they are the only policies on those tables, so they do fence
--     correctly today. Worth converting to RESTRICTIVE eventually so a future
--     added permissive policy cannot OR the fence open, but not a live hole.
--   • gw_assistant_threads / gw_assistant_messages, gw_personal_scores,
--     gw_video_playlists / items, gw_google_connections — all scoped by
--     (auth.uid() = user_id) or owner_id. Per-user scoping makes cross-tenant
--     leakage impossible whether or not a tenant_id column exists.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. gw_personal_scores_title_backup — 279 rows, RLS DISABLED, zero policies.
--
-- With RLS off and a GRANT to authenticated, every signed-in user on every
-- tenant can read the whole table. Columns are (id, old_title, old_composer,
-- backed_up_at), so the content is score metadata rather than personal data,
-- but nothing should be readable platform-wide by default.
--
-- It is an orphan: no migration creates it, and nothing in src/ or
-- supabase/functions/ references it. It was produced out-of-band by a
-- one-off title-cleanup on gw_personal_scores.
--
-- Enabling RLS with no policy = deny-all for authenticated/anon, while the
-- table owner and service_role still reach it, so the backup remains
-- recoverable. Dropping it is probably correct but is a data deletion, so
-- that decision is left to a human.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gw_personal_scores_title_backup ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.gw_personal_scores_title_backup IS
  'Orphaned one-off backup from a gw_personal_scores title cleanup. RLS enabled '
  '2026-08-08 with no policies (deny-all) because it was readable platform-wide. '
  'No code references it. Safe to DROP once confirmed no longer needed.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. gw_course_grade_categories — 182 rows, SELECT policy is literally
--    USING (true) for every authenticated user, with no restrictive twin.
--    Any signed-in user on any tenant can read every tenant's gradebook
--    category definitions (names, weights, drop rules).
--
-- The table has no tenant_id column, but it has course_id, and gw_courses is
-- properly tenanted — so scope through the course.
--
-- Chosen deliberately over an enrollment-based predicate: within a tenant this
-- preserves exactly today's behaviour (any authenticated member can read), so
-- no gradebook or admin view can break. It removes only the cross-tenant read.
-- Tightening further to enrolled-users-only is a product decision, not a
-- security one, and would risk breaking instructor/admin surfaces.
--
-- The write policy is already correctly scoped to course instructors via
-- gw_course_enrollments and is left untouched.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "grade categories readable to authed users"
  ON public.gw_course_grade_categories;

CREATE POLICY "grade categories readable within tenant"
  ON public.gw_course_grade_categories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
       WHERE c.id = gw_course_grade_categories.course_id
         AND c.tenant_id = public.current_tenant_id()
    )
  );

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────────────────
\echo ''
\echo '=== backup table: expect rls_enabled = t, n_policies = 0 (deny-all) ==='
SELECT c.relname, c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname='public' AND p.tablename=c.relname) AS n_policies
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname='public' AND c.relname='gw_personal_scores_title_backup';

\echo ''
\echo '=== grade categories: expect NO policy whose USING is plain true ==='
SELECT policyname, cmd, roles::text, qual
  FROM pg_policies
 WHERE schemaname='public' AND tablename='gw_course_grade_categories'
   AND policyname NOT LIKE 'demo_viewer%'
 ORDER BY cmd, policyname;

NOTIFY pgrst, 'reload schema';
