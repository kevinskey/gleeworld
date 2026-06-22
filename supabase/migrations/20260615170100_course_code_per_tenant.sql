-- course_code uniqueness should be per-tenant, not global.
--
-- The old constraint was a global UNIQUE on course_code, which (a) is
-- semantically wrong for a multi-tenant SaaS — two unrelated schools
-- can both legitimately offer "MUS101" — and (b) breaks
-- adopt_course_template, whose collision check already scopes by
-- tenant_id, so the INSERT trips over a template's code in `main`.

ALTER TABLE public.gw_courses
  DROP CONSTRAINT IF EXISTS gw_courses_course_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS gw_courses_tenant_course_code_key
  ON public.gw_courses (tenant_id, course_code)
  WHERE course_code IS NOT NULL;
