-- Migration: Consolidate assignment systems into unified grading module

-- Step 1: Create default courses for legacy assignments
INSERT INTO gw_courses (id, code, title, created_by)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'SIGHT-READING', 'Sight Reading Practice', '10daa1a0-7e12-4db5-8124-1906609c2a1b'),
  ('00000000-0000-0000-0000-000000000002', 'MUS-240', 'Music Theory and Analysis', '10daa1a0-7e12-4db5-8124-1906609c2a1b')
ON CONFLICT (id) DO NOTHING;

-- Step 2: Migrate gw_sight_reading_assignments to gw_assignments
INSERT INTO gw_assignments (
  id,
  course_id,
  legacy_source,
  legacy_id,
  title,
  description,
  assignment_type,
  category,
  points,
  due_at,
  is_active,
  created_by,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'sight_reading',
  id::text,
  title,
  description,
  'sight_singing',
  grading_period::text,
  points_possible,
  due_date,
  is_active,
  assigned_by,
  created_at,
  updated_at
FROM gw_sight_reading_assignments
WHERE NOT EXISTS (
  SELECT 1 FROM gw_assignments WHERE legacy_source = 'sight_reading' AND legacy_id = gw_sight_reading_assignments.id::text
);

-- Step 3: Migrate gw_assignment_submissions to gw_submissions
INSERT INTO gw_submissions (
  id,
  assignment_id,
  student_id,
  submitted_at,
  raw_payload,
  content_url,
  status,
  legacy_source,
  legacy_id
)
SELECT 
  gen_random_uuid(),
  ga.id,
  gas.user_id,
  gas.submitted_at,
  jsonb_build_object(
    'recording_url', gas.recording_url,
    'recording_id', gas.recording_id,
    'score_value', gas.score_value,
    'pitch_accuracy', gas.pitch_accuracy,
    'rhythm_accuracy', gas.rhythm_accuracy,
    'overall_performance', gas.overall_performance,
    'notes', gas.notes,
    'feedback', gas.feedback,
    'graded_by', gas.graded_by,
    'graded_at', gas.graded_at,
    'legacy_submission_id', gas.id
  ),
  gas.recording_url,
  gas.status::text,
  'sight_reading',
  gas.id::text
FROM gw_assignment_submissions gas
JOIN gw_assignments ga ON ga.legacy_source = 'sight_reading' AND ga.legacy_id = gas.assignment_id::text
WHERE NOT EXISTS (
  SELECT 1 FROM gw_submissions WHERE legacy_source = 'sight_reading' AND legacy_id = gas.id::text
);

-- Step 4: Create helper function to get legacy assignment info
CREATE OR REPLACE FUNCTION get_legacy_assignment_info(assignment_uuid UUID)
RETURNS TABLE (
  legacy_source TEXT,
  legacy_id TEXT,
  original_table TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ga.legacy_source,
    ga.legacy_id,
    CASE 
      WHEN ga.legacy_source = 'sight_reading' THEN 'gw_sight_reading_assignments'
      WHEN ga.legacy_source = 'mus240' THEN 'assignment_submissions'
      ELSE 'unknown'
    END as original_table
  FROM gw_assignments ga
  WHERE ga.id = assignment_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments explaining migration
COMMENT ON TABLE gw_assignments IS 'Unified assignment table. Legacy assignments migrated from gw_sight_reading_assignments and assignment_submissions with legacy_source and legacy_id preserved.';
COMMENT ON TABLE gw_submissions IS 'Unified submissions table. Legacy submissions migrated from gw_assignment_submissions and assignment_submissions with original data in raw_payload.';