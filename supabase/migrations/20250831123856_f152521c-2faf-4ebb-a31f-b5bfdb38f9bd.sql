-- Update all enrolled MUS 240 students to have role 'student'
UPDATE gw_profiles 
SET role = 'student', updated_at = now()
WHERE user_id IN (
  SELECT student_id 
  FROM mus240_grade_summaries 
  WHERE semester = 'Fall 2024'
);