-- Give all students 100% on research projects
UPDATE assignment_submissions
SET 
  grade = 100,
  graded_at = NOW(),
  updated_at = NOW()
WHERE 
  (
    assignment_id ILIKE '%research%' 
    OR file_name ILIKE '%research%'
  )
  AND grade IS NULL OR grade < 100;