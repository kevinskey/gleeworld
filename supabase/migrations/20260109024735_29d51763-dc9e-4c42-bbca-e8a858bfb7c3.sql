-- Set start and end dates for MUS 070 course (Spring 2026 semester)
UPDATE gw_courses 
SET start_date = '2026-01-13', end_date = '2026-05-01'
WHERE id = 'a0000000-0000-0000-0000-000000000070';

-- Also set dates for MUS 240 if missing
UPDATE gw_courses 
SET start_date = '2026-01-13', end_date = '2026-05-01'
WHERE id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37' AND start_date IS NULL;