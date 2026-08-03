-- Voice-part sharing lane for sheet music.
--
-- Librarians can now share a score with whole sections ("all Soprano 1s")
-- instead of picking members one by one. Values match the CHECK constraint
-- on gw_profiles.voice_part: soprano_1, soprano_2, alto_1, alto_2,
-- tenor_1, tenor_2, bass_1, bass_2.
--
-- The browse view (20260803140000_sheet_music_browse_view.sql) gains a
-- matching lane. CREATE OR REPLACE VIEW is legal here because the new
-- column lands at the END of the select list (append-only rule).

ALTER TABLE public.gw_sheet_music
  ADD COLUMN IF NOT EXISTS shared_with_voice_parts text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS gw_sheet_music_shared_with_voice_parts_gin
  ON public.gw_sheet_music USING gin (shared_with_voice_parts);

-- Re-issue the view with the extra lane. Same MULTI-TENANT SAFETY posture
-- as the original migration: security_invoker, no base-table grants, and
-- the REVOKE below stays load-bearing.
CREATE OR REPLACE VIEW public.gw_sheet_music_browse
WITH (security_invoker = on) AS
SELECT sm.*
FROM public.gw_sheet_music sm
WHERE sm.is_archived = false
  AND (
    public.can_edit_music_library()
    OR sm.shared_with_members = true
    OR sm.created_by = auth.uid()
    OR auth.uid() = ANY (sm.shared_with_users)
    OR EXISTS (
      SELECT 1 FROM public.gw_course_enrollments ce
      WHERE ce.course_id = ANY (sm.shared_with_courses)
        AND ce.enrollment_status = 'enrolled'
        AND (ce.user_id = auth.uid() OR ce.student_profile_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.gw_profiles p
      WHERE p.user_id = auth.uid()
        AND p.voice_part = ANY (sm.shared_with_voice_parts)
    )
  );

REVOKE ALL ON public.gw_sheet_music_browse FROM PUBLIC, anon;
GRANT SELECT ON public.gw_sheet_music_browse TO authenticated;
