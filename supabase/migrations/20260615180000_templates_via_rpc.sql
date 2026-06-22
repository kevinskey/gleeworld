-- Cross-tenant templates via RPC instead of relaxed RLS.
--
-- The previous approach relaxed the SELECT RLS policy on gw_courses to
-- allow any tenant to read template rows. That worked for the Course
-- Store but caused templates to leak into every other tenant-scoped
-- gw_courses query in the app (43 call sites) — they showed up in
-- "Your Courses", calendar feeds, dashboards, etc.
--
-- The clean fix: restore strict tenant isolation on SELECT, and expose
-- the template catalog via a SECURITY DEFINER RPC that the Course Store
-- calls explicitly.

-- Revert the SELECT policy to strict tenant isolation.
DROP POLICY IF EXISTS tenant_isolation_select ON public.gw_courses;

CREATE POLICY tenant_isolation_select ON public.gw_courses
  AS RESTRICTIVE
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- list_course_templates: returns active templates from any tenant.
-- Read-only, so safe to expose via SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.list_course_templates()
RETURNS TABLE (
  id uuid,
  course_code text,
  title text,
  description text,
  instructor_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.course_code::text, c.title, c.description, c.instructor_name::text
  FROM public.gw_courses c
  WHERE c.is_template = true AND c.is_active = true
  ORDER BY c.title;
$$;

GRANT EXECUTE ON FUNCTION public.list_course_templates() TO authenticated, anon;
