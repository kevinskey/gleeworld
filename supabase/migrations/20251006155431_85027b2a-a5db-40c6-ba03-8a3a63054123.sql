-- Update the Midterm test to be assigned to MUS 240
UPDATE glee_academy_tests 
SET course_id = 'mus240'
WHERE title ILIKE '%midterm%' AND course_id = 'all';