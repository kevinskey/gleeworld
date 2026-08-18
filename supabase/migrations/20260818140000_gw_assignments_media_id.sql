-- Attach a Media Library recording to an Academy assignment.
--
-- #751 added media_id to gw_course_assignments, but that is the WRONG table
-- for the class UI: CourseShell's AssignmentsTab (the /academy/c/:code page)
-- reads gw_assignments, having been deliberately pivoted there so the
-- gw_assignment_sync_event calendar trigger fires. So a recording shared as
-- an assignment was written correctly and then never displayed — the row
-- existed in a table that page does not read.
--
-- Field-name differences vs gw_course_assignments, for anyone writing here:
--   due_date     -> due_at
--   is_published -> is_active
--
-- gw_course_assignments.media_id stays as-is: the legacy UnifiedCoursePage
-- (via CourseAssignments.tsx) and the grading views read that table.

ALTER TABLE public.gw_assignments
  ADD COLUMN IF NOT EXISTS media_id uuid
  REFERENCES public.gw_media_library(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS gw_assignments_media_idx
  ON public.gw_assignments (media_id) WHERE media_id IS NOT NULL;
