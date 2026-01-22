
-- Reset MUS 210: Delete all assignments for course 2026c613-bda7-487a-a5d9-91e57c26a741
DELETE FROM gw_course_assignments 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';

-- Also delete any modules if they exist
DELETE FROM gw_course_modules 
WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';
