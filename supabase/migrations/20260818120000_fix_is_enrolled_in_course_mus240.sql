-- is_enrolled_in_course() threw 42P01 on EVERY call.
--
-- Its final branch was a "legacy mus240_enrollments fallback" for one
-- hardcoded course id. That table has since been dropped (the retired MUS240
-- course — see the comment in src/hooks/useDiscussionAnalytics.ts). Because
-- the function is LANGUAGE sql, the missing relation is resolved when the
-- body runs rather than when it is created, so the dead branch did not fail
-- loudly at deploy time — it failed at every call site, forever after:
--
--   relation "mus240_enrollments" does not exist  (SQLSTATE 42P01)
--
-- Blast radius (both are RLS policies, so the error surfaced as a flat
-- permission-shaped failure rather than anything naming the real cause):
--   * gw_course_assignments "Enrolled students can view published
--     assignments" (SELECT) — students could not read assignments at all,
--     and ANY `INSERT ... RETURNING` on the table errored, because RETURNING
--     evaluates the SELECT policies. That is what surfaced this: creating an
--     assignment reported only "Failed to create assignment".
--   * discussion_prompts "disc_prompts_student_select" (SELECT).
--
-- Fix: drop the dead branch. Every other branch is preserved byte-for-byte
-- from the live definition (direct user_id match, normalized-email match,
-- and the CSV-import student_profile_id match).

CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(p_user_id uuid, p_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Direct match by user_id in gw_course_enrollments
  SELECT EXISTS (
    SELECT 1 FROM gw_course_enrollments
    WHERE user_id = p_user_id
      AND course_id = p_course_id
      AND enrollment_status = 'enrolled'
  )
  OR EXISTS (
    -- Match by normalized email: strip dots/hyphens from local part
    -- Handles firstname.lastname vs firstnamelastname
    SELECT 1 FROM gw_course_enrollments e
    JOIN gw_profiles ep ON ep.user_id = e.user_id
    JOIN gw_profiles up ON up.user_id = p_user_id
    WHERE e.course_id = p_course_id
      AND e.enrollment_status = 'enrolled'
      AND LOWER(REPLACE(REPLACE(SPLIT_PART(ep.email, '@', 1), '.', ''), '-', ''))
        = LOWER(REPLACE(REPLACE(SPLIT_PART(up.email, '@', 1), '.', ''), '-', ''))
      AND LOWER(SPLIT_PART(ep.email, '@', 2)) = LOWER(SPLIT_PART(up.email, '@', 2))
  )
  OR EXISTS (
    -- Match via student_profile_id (CSV imports) by normalized email
    SELECT 1 FROM gw_course_enrollments e
    JOIN gw_student_profiles sp ON sp.id = e.student_profile_id
    JOIN gw_profiles up ON up.user_id = p_user_id
    WHERE e.course_id = p_course_id
      AND e.enrollment_status = 'enrolled'
      AND e.user_id IS NULL
      AND LOWER(REPLACE(REPLACE(SPLIT_PART(sp.email, '@', 1), '.', ''), '-', ''))
        = LOWER(REPLACE(REPLACE(SPLIT_PART(up.email, '@', 1), '.', ''), '-', ''))
      AND LOWER(SPLIT_PART(sp.email, '@', 2)) = LOWER(SPLIT_PART(up.email, '@', 2))
  );
$function$;
