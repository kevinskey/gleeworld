-- Sharing granularity beyond the tenant-wide `shared_with_members` flag.
--
-- New columns:
--   shared_with_users   uuid[] — auth.uid()s to grant read access
--   shared_with_courses uuid[] — gw_courses.id values whose enrolled
--                                students can read the score
--
-- Defaults to empty arrays so the Music Library share dialog can just
-- overwrite the column without null-vs-empty gymnastics. NOT NULL so
-- reads never have to handle NULL as a special case.
--
-- The client visibility query in MusicLibraryPage combines these with
-- shared_with_members via an OR:
--   shared_with_members = true
--   OR auth.uid() = ANY(shared_with_users)
--   OR EXISTS (SELECT 1 FROM gw_course_enrollments ce
--              WHERE ce.course_id = ANY(shared_with_courses)
--                AND (ce.user_id = auth.uid() OR ce.student_profile_id = auth.uid())
--                AND ce.enrollment_status = 'enrolled')
--
-- Server RLS is unchanged in this migration — the existing tenant-scope
-- policy on gw_sheet_music already gates cross-tenant reads. These
-- columns are used purely as an intra-tenant *visibility* filter today.
-- If a stricter RLS pass is needed later it can layer these arrays into
-- the SELECT USING clause.

ALTER TABLE public.gw_sheet_music
  ADD COLUMN IF NOT EXISTS shared_with_users   uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS shared_with_courses uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- GIN indexes so `= ANY(...)`, `@>`, and `&&` operators used by the
-- visibility query hit an index instead of scanning every row.
CREATE INDEX IF NOT EXISTS gw_sheet_music_shared_with_users_gin
  ON public.gw_sheet_music USING gin (shared_with_users);
CREATE INDEX IF NOT EXISTS gw_sheet_music_shared_with_courses_gin
  ON public.gw_sheet_music USING gin (shared_with_courses);
