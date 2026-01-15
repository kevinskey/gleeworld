-- Add semester column to gw_course_enrollments for consistency with legacy table
ALTER TABLE public.gw_course_enrollments 
ADD COLUMN IF NOT EXISTS semester TEXT;

-- Add semester column to glee_academy_tests for filtering by term
ALTER TABLE public.glee_academy_tests 
ADD COLUMN IF NOT EXISTS semester TEXT;

-- Add is_archived column to class_journal_sessions for archive functionality
ALTER TABLE public.class_journal_sessions 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add is_archived column to class_session_journals (student submissions)
ALTER TABLE public.class_session_journals 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Migrate the 2 legacy records from mus240_enrollments to gw_course_enrollments
-- First: ae0fbced-4a8f-4453-86f4-e22d2ca43e6e with semester 2025_FALL
INSERT INTO public.gw_course_enrollments (course_id, user_id, role, enrollment_status, semester, enrolled_at, created_at, updated_at)
SELECT 
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid,
  'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e'::uuid,
  'student',
  'enrolled',
  '2025_FALL',
  '2025-12-19 17:30:07.142887+00',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_course_enrollments 
  WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid 
  AND user_id = 'ae0fbced-4a8f-4453-86f4-e22d2ca43e6e'::uuid
);

-- Second: 44a30d6c-eefd-4144-a0b0-b3618ec1b7a5 with semester Spring 2026
INSERT INTO public.gw_course_enrollments (course_id, user_id, role, enrollment_status, semester, enrolled_at, created_at, updated_at)
SELECT 
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid,
  '44a30d6c-eefd-4144-a0b0-b3618ec1b7a5'::uuid,
  'student',
  'enrolled',
  'Spring 2026',
  '2026-01-14 17:14:15.260322+00',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_course_enrollments 
  WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'::uuid 
  AND user_id = '44a30d6c-eefd-4144-a0b0-b3618ec1b7a5'::uuid
);

-- Update semester for existing MUS 240 enrollments that don't have one
UPDATE public.gw_course_enrollments
SET semester = 'Spring 2026'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND semester IS NULL;

-- Update existing MUS 240 tests to have semester (Midterm 2 and Final Exam are Fall 2025 tests)
UPDATE public.glee_academy_tests
SET semester = '2025_FALL'
WHERE course_id = 'mus240' AND semester IS NULL;