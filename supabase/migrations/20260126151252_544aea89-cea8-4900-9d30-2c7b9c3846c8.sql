-- Part 1: Automatic matching for students (excluding those who already have enrollments)
WITH matched_enrollments AS (
  SELECT DISTINCT ON (e.id)
    e.id as enrollment_id,
    p.user_id
  FROM gw_course_enrollments e
  JOIN gw_student_profiles sp ON e.student_profile_id = sp.id
  JOIN gw_profiles p ON p.full_name ILIKE 
    TRIM(REGEXP_REPLACE(SPLIT_PART(sp.full_name, ',', 2), '\s+[A-Z]\.?$', '')) 
    || '%' 
    || TRIM(SPLIT_PART(sp.full_name, ',', 1))
  WHERE e.course_id = 'a0000000-0000-0000-0000-000000000070'
    AND e.user_id IS NULL
    AND p.user_id IS NOT NULL
    AND p.user_id NOT IN (
      SELECT user_id FROM gw_course_enrollments 
      WHERE course_id = 'a0000000-0000-0000-0000-000000000070' 
      AND user_id IS NOT NULL
    )
)
UPDATE gw_course_enrollments e
SET user_id = m.user_id
FROM matched_enrollments m
WHERE e.id = m.enrollment_id;

-- Part 2: Manual matching for 7 edge cases with UUID casting
UPDATE gw_course_enrollments e
SET user_id = CASE
  WHEN sp.full_name = 'Coleman, Kaylen A.' THEN '20335166-9e72-4d98-a7a8-265d9d5e8887'::uuid
  WHEN sp.full_name = 'Dent, Charity J.' THEN '6d44a9d0-70df-4a74-9623-002f4365253c'::uuid
  WHEN sp.full_name = 'Henderson, Kennedi J.' THEN '763aee24-4e37-49a3-9e8b-6539ce6360a9'::uuid
  WHEN sp.full_name = 'Johnson, Michelle A.' THEN 'c5b54bf0-30cf-4f72-9ad6-e11005565426'::uuid
  WHEN sp.full_name = 'Nashe, Shelby A.' THEN '5e6e5171-dc0b-418c-9b5f-236b05990dd0'::uuid
  WHEN sp.full_name = 'Petty, T''yara I.' THEN '799ae001-0cd5-438d-87f2-1cbf5434ddf0'::uuid
  WHEN sp.full_name = 'Williams, Ainka-Amara M.' THEN '04f14d47-25ba-4632-9d4e-2407d2c3797b'::uuid
END
FROM gw_student_profiles sp
WHERE e.student_profile_id = sp.id
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.user_id IS NULL
  AND sp.full_name IN ('Coleman, Kaylen A.', 'Dent, Charity J.', 'Henderson, Kennedi J.', 'Johnson, Michelle A.', 'Nashe, Shelby A.', 'Petty, T''yara I.', 'Williams, Ainka-Amara M.')
  AND CASE
    WHEN sp.full_name = 'Coleman, Kaylen A.' THEN '20335166-9e72-4d98-a7a8-265d9d5e8887'::uuid
    WHEN sp.full_name = 'Dent, Charity J.' THEN '6d44a9d0-70df-4a74-9623-002f4365253c'::uuid
    WHEN sp.full_name = 'Henderson, Kennedi J.' THEN '763aee24-4e37-49a3-9e8b-6539ce6360a9'::uuid
    WHEN sp.full_name = 'Johnson, Michelle A.' THEN 'c5b54bf0-30cf-4f72-9ad6-e11005565426'::uuid
    WHEN sp.full_name = 'Nashe, Shelby A.' THEN '5e6e5171-dc0b-418c-9b5f-236b05990dd0'::uuid
    WHEN sp.full_name = 'Petty, T''yara I.' THEN '799ae001-0cd5-438d-87f2-1cbf5434ddf0'::uuid
    WHEN sp.full_name = 'Williams, Ainka-Amara M.' THEN '04f14d47-25ba-4632-9d4e-2407d2c3797b'::uuid
  END NOT IN (SELECT user_id FROM gw_course_enrollments WHERE course_id = 'a0000000-0000-0000-0000-000000000070' AND user_id IS NOT NULL);

-- Part 3: Delete duplicate enrollments that couldn't be linked
DELETE FROM gw_course_enrollments e
USING gw_student_profiles sp
WHERE e.student_profile_id = sp.id
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.user_id IS NULL;

-- Part 4: Update gw_student_profiles with user_id for consistency
UPDATE gw_student_profiles sp
SET user_id = e.user_id
FROM gw_course_enrollments e
WHERE e.student_profile_id = sp.id
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.user_id IS NOT NULL
  AND sp.user_id IS NULL;

-- Part 5: Backfill attendance for all enrolled students
INSERT INTO gw_attendance_records (attendance_session_id, student_profile_id, status, check_in_method, note)
SELECT s.id, e.user_id, 'present', 'manual', 'Retroactive attendance - backfilled after enrollment link'
FROM gw_attendance_sessions s
CROSS JOIN gw_course_enrollments e
WHERE s.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.course_id = 'a0000000-0000-0000-0000-000000000070'
  AND e.user_id IS NOT NULL
  AND s.opens_at::date < '2026-01-28'
ON CONFLICT (attendance_session_id, student_profile_id) DO NOTHING;