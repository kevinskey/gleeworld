-- Clear existing MUS 210 modules
DELETE FROM module_items WHERE module_id IN (SELECT id FROM course_modules WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741');
DELETE FROM course_modules WHERE course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';