
-- Fix existing tests that use legacy slug 'mus240' instead of the UUID
UPDATE glee_academy_tests 
SET course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
WHERE course_id = 'mus240';
