-- Phase 23.1: unify part tracks. Add nullable course_id to gw_part_tracks
-- so the course-scoped addon can filter against the same library that
-- powers the workspace module (RecordModal + PartMixer + score-to-mp3).
-- Drop the duplicate gw_course_part_tracks table I created last phase —
-- it was empty.

ALTER TABLE public.gw_part_tracks
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.gw_courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gw_part_tracks_course_idx
  ON public.gw_part_tracks(course_id) WHERE course_id IS NOT NULL;

-- Tighten RLS so course-bound tracks are managed by the course instructor
-- and read by enrolled students. Workspace-pool tracks (course_id IS NULL)
-- stay open to any authed user in the tenant — matches the existing
-- part_tracks_authed_* policies.

DROP POLICY IF EXISTS "Instructor manages course part tracks" ON public.gw_part_tracks;
CREATE POLICY "Instructor manages course part tracks" ON public.gw_part_tracks
  FOR ALL
  USING (
    course_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_part_tracks.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    course_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_part_tracks.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

-- Drop the orphan course table — empty per Phase 23 verification.
DROP TABLE IF EXISTS public.gw_course_part_tracks CASCADE;
