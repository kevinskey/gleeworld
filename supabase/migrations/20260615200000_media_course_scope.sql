-- Media is becoming course-aware.
--
-- Today: gw_media_library and gw_sheet_music are tenant-scoped only. Any
-- member of a tenant can see every file. That doesn't match the
-- product model — Chamber Singers shouldn't see Men's Glee's media.
--
-- New model:
--   course_id IS NULL  → platform-level (visible across the tenant)
--   course_id = X      → belongs to course X; only members of X see it
--
-- Visibility rule (enforced by RLS):
--   - Admins / super-admins see everything in the tenant.
--   - Other users see platform-level rows + rows for courses they
--     instruct or are enrolled in.

-- ── 1. Schema ───────────────────────────────────────────────────────────────

ALTER TABLE public.gw_media_library
  ADD COLUMN IF NOT EXISTS course_id uuid
  REFERENCES public.gw_courses(id) ON DELETE CASCADE;

ALTER TABLE public.gw_sheet_music
  ADD COLUMN IF NOT EXISTS course_id uuid
  REFERENCES public.gw_courses(id) ON DELETE CASCADE;

ALTER TABLE public.gw_media_folders
  ADD COLUMN IF NOT EXISTS course_id uuid
  REFERENCES public.gw_courses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS gw_media_library_course_id_idx
  ON public.gw_media_library (course_id);
CREATE INDEX IF NOT EXISTS gw_sheet_music_course_id_idx
  ON public.gw_sheet_music (course_id);
CREATE INDEX IF NOT EXISTS gw_media_folders_course_id_idx
  ON public.gw_media_folders (course_id);

-- ── 2. Access helper ───────────────────────────────────────────────────────
-- Returns true if the calling user is an admin, the course instructor, or
-- an enrolled student of the given course.

CREATE OR REPLACE FUNCTION public.user_can_access_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    -- Admin or super-admin on any tenant sees everything tenant-scoped.
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
      AND (is_admin OR is_super_admin)
  ) OR EXISTS (
    -- Instructor of the course.
    SELECT 1 FROM public.gw_courses
    WHERE id = p_course_id
      AND instructor_id = auth.uid()
  ) OR EXISTS (
    -- Enrolled student.
    SELECT 1 FROM public.gw_course_enrollments
    WHERE course_id = p_course_id
      AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_course(uuid) TO authenticated, anon;

-- ── 3. Course leak protection (RESTRICTIVE on top of tenant isolation) ─────
-- These layer ON TOP of the existing tenant_isolation_restrict policies.
-- A row passes if it has no course tag (platform-level) OR the caller has
-- access to the tagged course.

CREATE POLICY course_access_select_media_library ON public.gw_media_library
  AS RESTRICTIVE FOR SELECT
  USING (course_id IS NULL OR public.user_can_access_course(course_id));

CREATE POLICY course_access_select_sheet_music ON public.gw_sheet_music
  AS RESTRICTIVE FOR SELECT
  USING (course_id IS NULL OR public.user_can_access_course(course_id));

CREATE POLICY course_access_select_media_folders ON public.gw_media_folders
  AS RESTRICTIVE FOR SELECT
  USING (course_id IS NULL OR public.user_can_access_course(course_id));
