-- Repoint gw_course_submissions.assignment_id FK to gw_assignments.
--
-- Original FK referenced gw_course_assignments, but every real
-- assignment now lives in gw_assignments (the calendar-sync trigger
-- reads/writes there, and gw_course_assignments has zero rows in
-- production). Combined with gw_assignment_submissions being
-- sight-reading-only (FK to gw_sight_reading_assignments), students
-- had no way to write a submission for a general assignment — every
-- INSERT hit a foreign-key violation.
--
-- Safe: verified zero rows in gw_course_submissions before running,
-- so no orphan handling required.

ALTER TABLE public.gw_course_submissions
  DROP CONSTRAINT IF EXISTS gw_course_submissions_assignment_id_fkey;

ALTER TABLE public.gw_course_submissions
  ADD CONSTRAINT gw_course_submissions_assignment_id_fkey
  FOREIGN KEY (assignment_id) REFERENCES public.gw_assignments(id) ON DELETE CASCADE;
