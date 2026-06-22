-- Phase 23: per-course part tracks. One row per piece + voice part.
-- Students see their voice part highlighted; can play any track.

CREATE TABLE IF NOT EXISTS public.gw_course_part_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.gw_courses(id) ON DELETE CASCADE,
  piece_title text NOT NULL,
  voice_part text,  -- 'S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2', or 'all' for a piano/conductor reduction
  audio_url text NOT NULL,
  notes text,
  position int NOT NULL DEFAULT 0,
  tenant_id uuid DEFAULT current_tenant_id(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gw_course_part_tracks_course_idx
  ON public.gw_course_part_tracks(course_id, piece_title, voice_part);

ALTER TABLE public.gw_course_part_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_restrict ON public.gw_course_part_tracks;
CREATE POLICY tenant_isolation_restrict ON public.gw_course_part_tracks
  AS RESTRICTIVE
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS "Instructor manages part tracks" ON public.gw_course_part_tracks;
CREATE POLICY "Instructor manages part tracks" ON public.gw_course_part_tracks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_part_tracks.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gw_courses c
      WHERE c.id = gw_course_part_tracks.course_id
        AND (c.instructor_id = auth.uid() OR c.created_by = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.gw_profiles p WHERE p.user_id = auth.uid() AND (p.is_admin OR p.is_super_admin))
  );

DROP POLICY IF EXISTS "Enrolled students read part tracks" ON public.gw_course_part_tracks;
CREATE POLICY "Enrolled students read part tracks" ON public.gw_course_part_tracks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_course_enrollments e
      WHERE e.course_id = gw_course_part_tracks.course_id
        AND e.user_id = auth.uid()
        AND e.enrollment_status IN ('enrolled','active','in_progress','registered')
    )
  );
