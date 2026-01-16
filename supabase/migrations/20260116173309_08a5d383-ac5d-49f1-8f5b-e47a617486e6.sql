-- Deactivate old assignments instead of deleting (due to FK constraints)
UPDATE mus240_assignments 
SET is_active = false 
WHERE id != '5559760b-3e8d-4615-9000-488c3ad646f5';

UPDATE gw_course_assignments 
SET is_published = false 
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' 
AND id != '5559760b-3e8d-4615-9000-488c3ad646f5';