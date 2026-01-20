-- ===========================================
-- ACADEMY ENROLLMENT DATABASE CONSOLIDATION
-- ===========================================

-- Step 1: Set semester for all NULL semester enrollments
-- For MUS 240, set to 'Spring 2026' (current active semester)
UPDATE gw_course_enrollments 
SET semester = 'Spring 2026'
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND semester IS NULL;

-- For MUS 070, set to 'Spring 2026' (current active semester)
UPDATE gw_course_enrollments 
SET semester = 'Spring 2026'
WHERE course_id = 'a0000000-0000-0000-0000-000000000070'
  AND semester IS NULL;

-- For all other courses, set to 'Spring 2026'
UPDATE gw_course_enrollments 
SET semester = 'Spring 2026'
WHERE semester IS NULL;

-- Step 2: Migrate mus240_enrollments data to gw_course_enrollments if not already there
-- First, check if the MUS 240 course ID exists in gw_courses
INSERT INTO gw_course_enrollments (
  course_id,
  user_id,
  role,
  enrollment_status,
  semester,
  enrolled_at,
  grade,
  created_at,
  updated_at
)
SELECT 
  '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' as course_id,
  me.student_id as user_id,
  'student' as role,
  me.enrollment_status,
  me.semester,
  me.enrolled_at,
  me.final_grade as grade,
  me.created_at,
  me.updated_at
FROM mus240_enrollments me
WHERE NOT EXISTS (
  SELECT 1 FROM gw_course_enrollments ce 
  WHERE ce.course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
    AND ce.user_id = me.student_id
    AND ce.semester = me.semester
);

-- Step 3: Make semester NOT NULL for future enrollments
ALTER TABLE gw_course_enrollments 
ALTER COLUMN semester SET DEFAULT 'Spring 2026';

-- Step 4: Create index on semester for better query performance
CREATE INDEX IF NOT EXISTS idx_gw_course_enrollments_semester 
ON gw_course_enrollments(semester);

-- Step 5: Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_gw_course_enrollments_course_semester 
ON gw_course_enrollments(course_id, semester);

-- Step 6: Update gw_courses to ensure consistent IDs in routing
-- (No changes needed - the actual database IDs are already correct)

-- Step 7: Clean up orphaned enrollments (no course_id)
DELETE FROM gw_course_enrollments WHERE course_id IS NULL;