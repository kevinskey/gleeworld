-- Retire MUS-240 (Survey of African American Music).
--
-- The course is no longer offered. Every one of the 29 mus240 tables was
-- verified EMPTY (0 rows) before this migration was written, and the course
-- row it belonged to had 0 enrollments — so this drops machinery, not data.
--
-- The application code that read these tables was removed in the same change:
-- src/pages/mus240/, src/components/mus240/, the mus240 hooks, and the
-- journal/midterm/peer-review edge functions. Course-agnostic pieces that
-- merely lived under those paths (the PowerPoint viewer, TikTok player,
-- rubric manager, instructor AI assistant, semester context) were MOVED out
-- rather than deleted, and are still in use.
--
-- Ordering matters: tables first (that removes their policies and triggers),
-- then the trigger/helper functions, then the catalog row.

BEGIN;

-- 1. Tables. CASCADE clears the FKs between them; nothing outside this set
--    references them (checked via pg_policies and information_schema).
DROP TABLE IF EXISTS
  public.group_updates_mus240,
  public.mus240_assignments,
  public.mus240_audio_resources,
  public.mus240_course_analytics,
  public.mus240_enrollments,
  public.mus240_grade_summaries,
  public.mus240_group_applications,
  public.mus240_group_links,
  public.mus240_group_memberships,
  public.mus240_group_notes,
  public.mus240_group_sandboxes,
  public.mus240_journal_comments,
  public.mus240_journal_entries,
  public.mus240_journal_grades,
  public.mus240_midterm_config,
  public.mus240_midterm_submissions,
  public.mus240_module_resources,
  public.mus240_module_settings,
  public.mus240_participation_grades,
  public.mus240_peer_reviews,
  public.mus240_poll_responses,
  public.mus240_polls,
  public.mus240_project_groups,
  public.mus240_resources,
  public.mus240_rubric_criteria,
  public.mus240_session_analytics,
  public.mus240_submission_grades,
  public.mus240_test_analytics,
  public.mus240_video_edits
CASCADE;

-- 2. Trigger and helper functions that existed only for those tables.
DROP FUNCTION IF EXISTS public.calculate_mus240_grade_summary(uuid,text) CASCADE;
DROP FUNCTION IF EXISTS public.enforce_mus240_group_capacity() CASCADE;
DROP FUNCTION IF EXISTS public.is_enrolled_in_mus240(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_mus240_student(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.leave_mus240_group(uuid,uuid) CASCADE;
DROP FUNCTION IF EXISTS public.mus240_after_membership_change() CASCADE;
DROP FUNCTION IF EXISTS public.recalc_mus240_group_member_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_mus240_journal_grades_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_mus240_grade_recalc() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_grading_rubrics_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_group_content_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_journal_comments_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_journal_entries_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_journal_grades_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_member_role(uuid,uuid,text,uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_reading_requirements_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_resources_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_student_roles() CASCADE;
DROP FUNCTION IF EXISTS public.update_mus240_submission_grades_updated_at() CASCADE;

-- 3. The catalog row itself (Fall 2026, 0 enrollments).
DELETE FROM public.gw_courses
WHERE id = '253e52aa-61fb-421b-96ed-48f36de46d6b'
  AND course_code = 'MUS-240';

COMMIT;
