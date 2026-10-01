-- Rename the 'student' user role to 'member' — phase 2 (the data move).
--
-- Phase 1 (PR #816) already shipped: all client and edge-function reads treat
-- 'student' and 'member' as one audience, so this migration can land before or
-- after any deploy without a window where someone is locked out.
--
-- SCOPE — read this before extending the migration:
--
--   RENAMED: the USER role, on gw_profiles.role, gw_tenant_members.role,
--   app_roles.role, user_roles_multi.role, gw_role_module_permissions.role.
--
--   NOT RENAMED: gw_course_enrollments.role, whose domain is
--   'student' | 'instructor' | 'ta' | 'auditor' and which is pinned by
--   gw_course_enrollments_role_check. That is a person's role WITHIN one
--   course — a different axis that happens to share a word. Renaming it
--   would violate the constraint and break every gradebook query.
--
-- THE TRAP: four triggers named trg_no_member_role_* currently rewrite
-- 'member' back to 'student' on every write. They were applied directly to
-- the database and never recorded in this directory, so nothing in the repo
-- hints they exist. Without dropping them first, every UPDATE below silently
-- does nothing and the migration "succeeds".

BEGIN;

-- 1. Remove the guard that inverts this entire migration.
DROP TRIGGER IF EXISTS trg_no_member_role_gw_profiles ON public.gw_profiles;
DROP TRIGGER IF EXISTS trg_no_member_role_app_roles ON public.app_roles;
DROP TRIGGER IF EXISTS trg_no_member_role_user_roles_multi ON public.user_roles_multi;
DROP TRIGGER IF EXISTS trg_no_member_role_gw_role_module_permissions
  ON public.gw_role_module_permissions;
DROP FUNCTION IF EXISTS public.member_to_student();

-- 2. Move the rows.
UPDATE public.gw_profiles                SET role = 'member' WHERE role = 'student';
UPDATE public.gw_tenant_members          SET role = 'member' WHERE role = 'student';
UPDATE public.app_roles                  SET role = 'member' WHERE role = 'student';
UPDATE public.user_roles_multi           SET role = 'member' WHERE role = 'student';
UPDATE public.gw_role_module_permissions SET role = 'member' WHERE role = 'student';

-- 3. Merge the duplicated nav-pref rows.
--
-- Both spellings have live rows. Where a tenant configured BOTH, the
-- 'student' row is the one that has been in effect (every real account was
-- 'student'), so it wins and the 'member' row is discarded — matching the
-- exact-match-first fallback useTenantNavPrefs shipped in phase 1. Only demo
-- tenants have both, so nothing a customer configured is lost.
DELETE FROM public.gw_tenant_nav_prefs m
WHERE m.role = 'member'
  AND EXISTS (
    SELECT 1 FROM public.gw_tenant_nav_prefs s
    WHERE s.role = 'student' AND s.tenant_id IS NOT DISTINCT FROM m.tenant_id
  );

UPDATE public.gw_tenant_nav_prefs SET role = 'member' WHERE role = 'student';

-- 4. New accounts must be minted as members.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.gw_profiles (user_id, email, full_name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'member',
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate entries
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_academy_student_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_roles WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.app_roles (user_id, role, is_active)
    VALUES (NEW.id, 'member', true);
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. The JWT fallback role for a request with no role claim.
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'role'),
    'member'
  );
$function$;

-- 6. Plan-cap enforcement counts the member audience.
--
-- This one matters more than it looks: gw-invite-student calls it to decide
-- whether a tenant may add another seat. Left counting only 'student' it
-- would return 0 after step 2 and silently stop enforcing every paid cap.
-- Accepts BOTH spellings so the count is right whichever order this
-- migration and the deploys land in.
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
    WHERE tenant_id = p_tenant_id AND role IN ('student', 'member')
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

-- 7. Self-registration RLS.
--
-- The only policy in the database that tests the role LITERAL (the other 56
-- policies mentioning "student" reference student_id COLUMNS and are
-- unaffected). It permitted INSERT only when role = 'student', so the moment
-- the app starts writing 'member' every self-registration would be denied by
-- RLS. Accepts both spellings; it still cannot be used to grant anything
-- above the member audience, which is the point of the check.
DROP POLICY IF EXISTS "Users can self-register as students" ON public.user_roles_multi;
CREATE POLICY "Users can self-register as members"
  ON public.user_roles_multi
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role IN ('student', 'member'));

COMMIT;
