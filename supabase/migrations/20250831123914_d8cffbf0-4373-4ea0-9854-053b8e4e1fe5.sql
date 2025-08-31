-- Temporarily disable the trigger to allow role updates for MUS 240 students
ALTER TABLE gw_profiles DISABLE TRIGGER ALL;

-- Update all enrolled MUS 240 students to have role 'student'
UPDATE gw_profiles 
SET role = 'student', updated_at = now()
WHERE user_id IN (
  SELECT student_id 
  FROM mus240_grade_summaries 
  WHERE semester = 'Fall 2024'
);

-- Re-enable the triggers
ALTER TABLE gw_profiles ENABLE TRIGGER ALL;