-- Follow-up to 20260808110000. That migration scoped the SELECT policy on
-- gw_course_grade_categories to the current tenant, which was necessary but
-- NOT sufficient.
--
-- The sibling policy "grade categories writable by course instructors" is
-- FOR ALL, and permissive policies OR together — so it grants SELECT too.
-- Its second branch is:
--
--   EXISTS (SELECT 1 FROM gw_profiles p
--            WHERE p.id = auth.uid()
--              AND p.role = ANY (ARRAY['admin','super_admin']))
--
-- which carries no tenant predicate at all. That is the same unscoped-admin
-- defect the ensemble tables had: any tenant's admin reaches every tenant's
-- rows, and tightening a sibling read policy does nothing about it.
--
-- Rather than rewrite that policy (it also encodes real instructor logic, and
-- editing it risks breaking the gradebook), add a RESTRICTIVE policy. Postgres
-- ANDs restrictive policies with the OR-ed permissive set, so it fences every
-- current and future permissive policy on this table at once. This is the same
-- shape used for the ensemble family and the house pattern documented in
-- migrations/phase2_rls_rollout.sql.
--
-- The table has no tenant_id column, so the fence goes through course_id into
-- the properly-tenanted gw_courses.
--
-- Note the branch above compares gw_profiles.id to auth.uid(); most of the
-- codebase keys profiles by user_id, so that branch may rarely match in
-- practice. It is left as-is — this migration makes it harmless either way.

BEGIN;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_grade_categories;
CREATE POLICY tenant_isolation_restrict
  ON public.gw_course_grade_categories
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.gw_courses c
             WHERE c.id = gw_course_grade_categories.course_id
               AND c.tenant_id = public.current_tenant_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.gw_courses c
             WHERE c.id = gw_course_grade_categories.course_id
               AND c.tenant_id = public.current_tenant_id())
  );

DROP POLICY IF EXISTS anon_tenant_isolation ON public.gw_course_grade_categories;
CREATE POLICY anon_tenant_isolation
  ON public.gw_course_grade_categories
  AS RESTRICTIVE FOR ALL TO anon
  USING (
    EXISTS (SELECT 1 FROM public.gw_courses c
             WHERE c.id = gw_course_grade_categories.course_id
               AND c.tenant_id = public.anon_tenant_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.gw_courses c
             WHERE c.id = gw_course_grade_categories.course_id
               AND c.tenant_id = public.anon_tenant_id())
  );

COMMIT;

\echo ''
\echo '=== expect tenant_isolation_restrict + anon_tenant_isolation, RESTRICTIVE ==='
SELECT policyname, permissive, cmd, roles::text
  FROM pg_policies
 WHERE schemaname='public' AND tablename='gw_course_grade_categories'
   AND permissive='RESTRICTIVE' AND policyname NOT LIKE 'demo_viewer%'
 ORDER BY policyname;

NOTIFY pgrst, 'reload schema';
