
-- Enroll all duplicate/alternate accounts for MUS-240 students
-- These are students who registered with a different email variation (dots/hyphens)
INSERT INTO gw_course_enrollments (course_id, user_id, enrollment_status, semester, role)
VALUES 
  -- Arianna Armstrong (arianna.armstrong@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '1b8ee391-118e-4641-b166-0476fd8009cb', 'enrolled', 'Spring 2026', 'student'),
  -- Zion Clifton (zionclifton@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'aea7103b-28f9-4532-82c1-c4c143e824f8', 'enrolled', 'Spring 2026', 'student'),
  -- Journi Robinson (journi.robinson@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '7b52dc2c-4d45-458c-8c3d-b7db28a20f52', 'enrolled', 'Spring 2026', 'student'),
  -- Karrington Adams (karrington.adams@ - two accounts)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '547181d2-d917-4eb8-baf7-725de2f518f2', 'enrolled', 'Spring 2026', 'student'),
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '2e6ec3eb-d88e-4652-aa27-7f61f91fcfa5', 'enrolled', 'Spring 2026', 'student'),
  -- Kennedi Henderson (kennedi.henderson@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', '4f80e495-c2ab-4e9e-ab70-1f2ec82071b5', 'enrolled', 'Spring 2026', 'student'),
  -- Rebekah Lawson (rebekahlawson@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'ab7c4b3b-532e-41dc-9256-d16ab346a5fa', 'enrolled', 'Spring 2026', 'student'),
  -- Morgan Terry (morgan.terry@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'e62179be-b434-44fa-86c0-7242253bda27', 'enrolled', 'Spring 2026', 'student'),
  -- Rachael Tinsley (rachael.tinsley@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'aee6dc11-65fb-4b40-bc55-0f1711336bb8', 'enrolled', 'Spring 2026', 'student'),
  -- Skye Rawles (skyerawles@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'de99b032-075d-42bf-a57a-888b8edcd715', 'enrolled', 'Spring 2026', 'student'),
  -- Tolani Gaddis (tolani.gaddis@)
  ('23c4ee3c-7bbb-4534-8c0a-eecd88298d37', 'd7bf4334-3299-4727-9fc5-85743227a011', 'enrolled', 'Spring 2026', 'student')
ON CONFLICT DO NOTHING;
