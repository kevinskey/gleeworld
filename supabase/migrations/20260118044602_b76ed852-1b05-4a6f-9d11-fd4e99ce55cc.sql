-- Delete old Fall 2025 unpublished assignments from gw_course_assignments
-- Keep only the "Fourth Turning Music Essay" (id: 5559760b-3e8d-4615-9000-488c3ad646f5)
DELETE FROM gw_course_assignments 
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
  AND id != '5559760b-3e8d-4615-9000-488c3ad646f5';