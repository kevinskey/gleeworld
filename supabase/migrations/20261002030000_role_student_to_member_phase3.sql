-- Rename the 'student' user role to 'member' — phase 3 (drop the tolerance).
--
-- Phase 2 (20261001120000) moved every row. This removes the dual-accept
-- predicates that phase 2 deliberately left behind, now that no row and no
-- live token can still say 'student':
--
--   • rows      — verified 0 remaining in gw_profiles, gw_tenant_members,
--                 app_roles, user_roles_multi, gw_role_module_permissions
--                 and gw_tenant_nav_prefs.
--   • JWT claim — custom_access_token_hook injects tenant_role from
--                 gw_tenant_members.role, and GOTRUE_JWT_EXP is 3600s. Phase
--                 2 landed more than an hour before this, so every access
--                 token still usable was minted from the renamed rows.
--
-- STILL NOT RENAMED, and never will be by this series:
-- gw_course_enrollments.role ('student'|'instructor'|'ta'|'auditor', pinned
-- by gw_course_enrollments_role_check) — a person's role WITHIN one course.
-- public.list_seating_chart_roster therefore keeps its 'student' literal and
-- is intentionally absent from this migration.

BEGIN;

-- Guard: refuse to narrow the predicates while any legacy row survives.
-- Without this, a forgotten row silently loses access the moment the
-- tolerance disappears, and nothing in the output would say so.
DO $$
DECLARE n integer;
BEGIN
  SELECT
    (SELECT count(*) FROM public.gw_profiles                WHERE role = 'student')
  + (SELECT count(*) FROM public.gw_tenant_members          WHERE role = 'student')
  + (SELECT count(*) FROM public.app_roles                  WHERE role = 'student')
  + (SELECT count(*) FROM public.user_roles_multi           WHERE role = 'student')
  + (SELECT count(*) FROM public.gw_role_module_permissions WHERE role = 'student')
  + (SELECT count(*) FROM public.gw_tenant_nav_prefs        WHERE role = 'student')
  INTO n;
  IF n > 0 THEN
    RAISE EXCEPTION 'phase 3 aborted: % row(s) still hold the legacy student role', n;
  END IF;
END $$;

-- 1. Self-registration RLS: member only.
DROP POLICY IF EXISTS "Users can self-register as members" ON public.user_roles_multi;
CREATE POLICY "Users can self-register as members"
  ON public.user_roles_multi
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role = 'member');

-- 2. Plan-cap enforcement: member only.
--
-- Still the function that gates seat purchases from gw-invite-student. The
-- column names (student_cap, current_students) are part of the function's
-- published signature and are left alone deliberately — renaming them would
-- break every caller for no behavioural gain.
CREATE OR REPLACE FUNCTION public.gw_tenant_plan_usage(p_tenant_id uuid)
 RETURNS TABLE(plan_id text, student_cap integer, current_students integer, remaining integer)
 LANGUAGE sql
 STABLE
AS $function$
  WITH plan AS (
    SELECT tp.plan_id, bp.student_cap
    FROM gw_tenant_plans tp
    JOIN gw_billing_plans bp ON bp.id = tp.plan_id
    WHERE tp.tenant_id = p_tenant_id AND tp.status IN ('active', 'trial')
    LIMIT 1
  ),
  count AS (
    SELECT COUNT(*)::int AS n
    FROM gw_profiles
    WHERE tenant_id = p_tenant_id AND role = 'member'
  )
  SELECT
    plan.plan_id,
    plan.student_cap,
    count.n,
    CASE WHEN plan.student_cap IS NULL THEN NULL
         ELSE GREATEST(plan.student_cap - count.n, 0)
    END
  FROM plan, count;
$function$;

COMMIT;
