
-- Fix MUS 240 roster: Remove all incorrect enrollments and add only the 19 correct students
-- Step 1: Delete all current (wrong) enrollments for MUS 240
DELETE FROM gw_course_enrollments
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

-- Step 2: Insert the 19 correct MUS 240 students
-- Students with user_id (from gw_profiles)
INSERT INTO gw_course_enrollments (course_id, user_id, student_profile_id, enrollment_status, semester, enrolled_at)
VALUES
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '2e6ec3eb-d88e-4652-aa27-7f61f91fcfa5', NULL, 'enrolled', 'Spring 2026', now()), -- Adams, Karrington R.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '1b8ee391-118e-4641-b166-0476fd8009cb', NULL, 'enrolled', 'Spring 2026', now()), -- Armstrong, Arianna A.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'd241e142-999a-4cd9-9bab-c9f441218219', NULL, 'enrolled', 'Spring 2026', now()), -- Brown, Sarah L.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'ed4d889e-bfe1-47ad-a0d2-77f063a4a9fd', NULL, 'enrolled', 'Spring 2026', now()), -- Clifton, Zion G.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'd7bf4334-3299-4727-9fc5-85743227a011', NULL, 'enrolled', 'Spring 2026', now()), -- Gaddis, Tolani
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '4f80e495-c2ab-4e9e-ab70-1f2ec82071b5', NULL, 'enrolled', 'Spring 2026', now()), -- Henderson, Kennedi J.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '3e5fb93a-b7e4-4320-98ca-9caadce3f0c9', NULL, 'enrolled', 'Spring 2026', now()), -- Herring, Raven R.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '9e747a40-a4cc-4e5f-8f33-01940d480f3d', NULL, 'enrolled', 'Spring 2026', now()), -- Lawson, Rebekah G.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '85c0fa57-270a-443f-b556-9e2a7806169d', NULL, 'enrolled', 'Spring 2026', now()), -- Morris, Lorna
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'fbde4a03-7b28-4f0a-9fe7-5733aada935b', NULL, 'enrolled', 'Spring 2026', now()), -- Rawles, Skye E.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '7b52dc2c-4d45-458c-8c3d-b7db28a20f52', NULL, 'enrolled', 'Spring 2026', now()), -- Robinson, Journi M.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'e62179be-b434-44fa-86c0-7242253bda27', NULL, 'enrolled', 'Spring 2026', now()), -- Terry, Morgan A.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'aee6dc11-65fb-4b40-bc55-0f1711336bb8', NULL, 'enrolled', 'Spring 2026', now()), -- Tinsley, Rachael N.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '5982b188-02c6-48dd-ba12-56221d6c19a5', NULL, 'enrolled', 'Spring 2026', now()), -- Williams, Ainka-Amara M.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '7a595540-d0d0-463f-aedb-80275d4beca6', NULL, 'enrolled', 'Spring 2026', now()), -- Wilson, Nia M.
  -- Students with student_profile_id only (CSV imports, no user account)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', NULL, '81473365-1677-4339-a6ca-43e9045a1d69', 'enrolled', 'Spring 2026', now()), -- Dacus, Leilani P.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', NULL, '4d2a5fea-0fd0-4e85-9f31-477885de1186', 'enrolled', 'Spring 2026', now()), -- Gamble, Taylor N.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', NULL, 'aaea3a15-da78-4bdf-bae4-49da00383c62', 'enrolled', 'Spring 2026', now()), -- McGee, Rylee B.
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', NULL, '77e6f50f-365d-4cf6-bcc9-a4044bfa2a37', 'enrolled', 'Spring 2026', now());  -- Wilson, Khiara R.
