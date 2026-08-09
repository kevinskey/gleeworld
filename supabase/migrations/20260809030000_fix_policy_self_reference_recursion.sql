-- Two more policies with the same defect as gw_profiles_update_policy (#569):
-- a policy that scans the very table it protects. Evaluating the subquery
-- re-enters RLS on that table and Postgres aborts the statement with
--
--   ERROR:  infinite recursion detected in policy for relation "<table>"
--
-- Both are SELECT policies, so the affected reads fail outright for the
-- `authenticated` role. Confirmed against production before this migration:
--   SELECT count(*) FROM discussion_group_members  -> 42P17
--   SELECT count(*) FROM gw_course_discussions     -> 42P17
--
-- Fix follows #569: move the self-lookup into a SECURITY DEFINER helper so
-- the inner scan runs without re-entering the caller's RLS. Neither helper
-- widens access -- each is the original subquery, moved verbatim.

-- ── 1. discussion_group_members ─────────────────────────────────────────────
--
-- disc_members_student_select is "I can see the members of groups I belong
-- to", expressed as a self-join:
--
--   EXISTS (SELECT 1 FROM discussion_group_members dgm
--           WHERE dgm.discussion_group_id = discussion_group_members.discussion_group_id
--             AND dgm.user_id = auth.uid())

CREATE OR REPLACE FUNCTION public.is_discussion_group_member(p_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.discussion_group_members dgm
    WHERE dgm.discussion_group_id = p_group_id
      AND dgm.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_discussion_group_member(uuid) IS
  'Is the current user a member of this discussion group? SECURITY DEFINER so '
  'policies on discussion_group_members can ask without re-entering their own '
  'RLS (42P17 infinite recursion).';

DROP POLICY IF EXISTS "disc_members_student_select" ON public.discussion_group_members;

CREATE POLICY "disc_members_student_select" ON public.discussion_group_members
FOR SELECT TO public
USING (public.is_discussion_group_member(discussion_group_id));

-- ── 2. gw_course_discussions ────────────────────────────────────────────────
--
-- Only the last branch of "Students see relevant discussions" self-scans: for
-- a reply (parent_id IS NOT NULL) it walks to the parent post to inherit the
-- parent's cohort visibility. Every other branch (instructor, admin, top-level
-- post) is left exactly as it was.

CREATE OR REPLACE FUNCTION public.can_view_discussion_parent(p_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gw_course_discussions parent
    WHERE parent.id = p_parent_id
      AND (
        parent.cohort_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.gw_course_cohort_members m
          WHERE m.cohort_id = parent.cohort_id
            AND m.user_id = auth.uid()
        )
      )
  );
$$;

COMMENT ON FUNCTION public.can_view_discussion_parent(uuid) IS
  'Does the current user have cohort visibility of this parent discussion post? '
  'SECURITY DEFINER so the replies branch of the gw_course_discussions SELECT '
  'policy can walk to the parent without re-entering its own RLS (42P17).';

DROP POLICY IF EXISTS "Students see relevant discussions" ON public.gw_course_discussions;

CREATE POLICY "Students see relevant discussions" ON public.gw_course_discussions
FOR SELECT TO public
USING (
  -- instructor or creator of the course
  EXISTS (
    SELECT 1 FROM public.gw_courses c
    WHERE c.id = gw_course_discussions.course_id
      AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
  )
  -- platform admins
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
      AND (p.is_admin OR p.is_super_admin)
  )
  -- top-level post: enrolled, and in the cohort if the post is cohort-scoped
  OR (
    parent_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_discussions.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status::text = ANY (ARRAY['enrolled','active','in_progress','registered'])
    )
    AND (
      cohort_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.gw_course_cohort_members m
        WHERE m.cohort_id = gw_course_discussions.cohort_id
          AND m.user_id = auth.uid()
      )
    )
  )
  -- reply: inherits the parent's cohort visibility, and still requires enrollment
  OR (
    parent_id IS NOT NULL
    AND public.can_view_discussion_parent(parent_id)
    AND EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_discussions.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status::text = ANY (ARRAY['enrolled','active','in_progress','registered'])
    )
  )
);
