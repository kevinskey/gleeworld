
-- ============================================================
-- FIX: Enrollment-to-Access Pipeline
-- Root cause: Students have duplicate accounts (dot vs no-dot emails)
-- Enrollment records point to provisioned accounts, but students
-- log in with self-created accounts, so RLS denies access.
-- ============================================================

-- 1. UPDATE is_enrolled_in_course to also match by normalized email
-- This is SECURITY DEFINER so it can read gw_profiles without RLS interference
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(p_user_id uuid, p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  )
  OR EXISTS (
    -- Legacy mus240_enrollments fallback
    SELECT 1 FROM mus240_enrollments
    WHERE student_id = p_user_id
      AND enrollment_status = 'enrolled'
      AND p_course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid
  );
$$;

-- 2. UPDATE discussion_prompts RLS to use the function (currently does direct check)
DROP POLICY IF EXISTS "disc_prompts_student_select" ON discussion_prompts;
CREATE POLICY "disc_prompts_student_select" ON discussion_prompts
FOR SELECT TO authenticated
USING (is_enrolled_in_course(auth.uid(), course_id));

-- 3. FIX MUS 240 enrollment data - update to the user_ids students actually use
-- Students with submissions (known correct user_ids)
UPDATE gw_course_enrollments SET user_id = '6b1a1056-df44-4852-b793-db58c39c93ce'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND user_id = '2e6ec3eb-d88e-4652-aa27-7f61f91fcfa5'; -- Adams

UPDATE gw_course_enrollments SET user_id = '1e4cd252-1f8d-4067-b640-64f376f4f716'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND user_id = '1b8ee391-118e-4641-b166-0476fd8009cb'; -- Armstrong

UPDATE gw_course_enrollments SET user_id = '6424a5e7-26be-477d-a8aa-7cb8e172b0d9'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND user_id = 'd7bf4334-3299-4727-9fc5-85743227a011'; -- Gaddis

UPDATE gw_course_enrollments SET user_id = '763aee24-4e37-49a3-9e8b-6539ce6360a9'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND user_id = '4f80e495-c2ab-4e9e-ab70-1f2ec82071b5'; -- Henderson

UPDATE gw_course_enrollments SET user_id = '48bfd39c-5695-4522-a231-c927ecdf01b4'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND user_id = '7b52dc2c-4d45-458c-8c3d-b7db28a20f52'; -- Robinson

UPDATE gw_course_enrollments SET user_id = '3bfda5a4-816c-487b-b6d6-1601f0c9cfcd'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND user_id = 'e62179be-b434-44fa-86c0-7242253bda27'; -- Terry

UPDATE gw_course_enrollments SET user_id = '30165b3c-68c0-478c-aac8-7acc36901572'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND user_id = 'aee6dc11-65fb-4b40-bc55-0f1711336bb8'; -- Tinsley

UPDATE gw_course_enrollments SET user_id = '57c3af54-155e-4aee-8e74-f1793f60c26b'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND user_id = '7a595540-d0d0-463f-aedb-80275d4beca6'; -- Wilson Nia

-- Students enrolled via student_profile_id who have actual auth accounts
UPDATE gw_course_enrollments SET user_id = 'a7191de0-cec2-4e31-bc4a-d0895cb9b0c9'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND student_profile_id = '81473365-1677-4339-a6ca-43e9045a1d69' AND user_id IS NULL; -- Dacus

UPDATE gw_course_enrollments SET user_id = '8fd32cb1-8e22-4411-bf6d-6c5a5939a9ba'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND student_profile_id = '4d2a5fea-0fd0-4e85-9f31-477885de1186' AND user_id IS NULL; -- Gamble

UPDATE gw_course_enrollments SET user_id = 'ce444469-f2ef-481a-838b-1c832381503f'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND student_profile_id = 'aaea3a15-da78-4bdf-bae4-49da00383c62' AND user_id IS NULL; -- McGee

UPDATE gw_course_enrollments SET user_id = '9d83bd8f-b702-447d-96d4-30d99cc5529c'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND student_profile_id = '77e6f50f-365d-4cf6-bcc9-a4044bfa2a37' AND user_id IS NULL; -- Wilson Khiara

-- 4. AUTO-LINKING TRIGGER: When a new profile is created, automatically link
-- any existing enrollments that match by normalized email
CREATE OR REPLACE FUNCTION public.auto_link_enrollment_on_profile_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_local text;
  v_domain text;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  
  v_normalized_local := LOWER(REPLACE(REPLACE(SPLIT_PART(NEW.email, '@', 1), '.', ''), '-', ''));
  v_domain := LOWER(SPLIT_PART(NEW.email, '@', 2));
  
  -- Link enrollments that have a different user_id but matching normalized email
  UPDATE gw_course_enrollments e
  SET user_id = NEW.user_id
  FROM gw_profiles p
  WHERE e.user_id = p.user_id
    AND e.user_id != NEW.user_id
    AND LOWER(REPLACE(REPLACE(SPLIT_PART(p.email, '@', 1), '.', ''), '-', '')) = v_normalized_local
    AND LOWER(SPLIT_PART(p.email, '@', 2)) = v_domain
    AND e.enrollment_status = 'enrolled'
    -- Only link if the new user doesn't already have an enrollment for this course
    AND NOT EXISTS (
      SELECT 1 FROM gw_course_enrollments ex
      WHERE ex.user_id = NEW.user_id AND ex.course_id = e.course_id
    );
  
  -- Also link enrollments via student_profile_id matching by email
  UPDATE gw_course_enrollments e
  SET user_id = NEW.user_id
  FROM gw_student_profiles sp
  WHERE e.student_profile_id = sp.id
    AND e.user_id IS NULL
    AND LOWER(REPLACE(REPLACE(SPLIT_PART(sp.email, '@', 1), '.', ''), '-', '')) = v_normalized_local
    AND LOWER(SPLIT_PART(sp.email, '@', 2)) = v_domain
    AND e.enrollment_status = 'enrolled';
  
  RETURN NEW;
END;
$$;

-- Attach to gw_profiles
DROP TRIGGER IF EXISTS auto_link_enrollment_trigger ON gw_profiles;
CREATE TRIGGER auto_link_enrollment_trigger
AFTER INSERT ON gw_profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_enrollment_on_profile_create();
