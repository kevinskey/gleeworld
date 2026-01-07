-- Add available_from and due_date columns to glee_academy_tests
ALTER TABLE glee_academy_tests 
ADD COLUMN IF NOT EXISTS available_from TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Update the 4 glossary quizzes with dates based on course weeks
-- Assuming semester starts January 13, 2026 (Monday)
-- Week 3 = Jan 27, Week 6 = Feb 17, Week 9 = Mar 10, Week 13 = Apr 7

UPDATE glee_academy_tests 
SET available_from = '2026-01-27 08:00:00+00', 
    due_date = '2026-02-02 23:59:00+00'
WHERE title = 'Glossary Quiz 1: Fundamental Tempo & Dynamics' 
AND course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';

UPDATE glee_academy_tests 
SET available_from = '2026-02-17 08:00:00+00', 
    due_date = '2026-02-23 23:59:00+00'
WHERE title = 'Glossary Quiz 2: Advanced Tempo Changes, Dynamics & Articulation' 
AND course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';

UPDATE glee_academy_tests 
SET available_from = '2026-03-10 08:00:00+00', 
    due_date = '2026-03-16 23:59:00+00'
WHERE title = 'Glossary Quiz 3: Expression, Character & Navigation' 
AND course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';

UPDATE glee_academy_tests 
SET available_from = '2026-04-07 08:00:00+00', 
    due_date = '2026-04-13 23:59:00+00'
WHERE title = 'Glossary Quiz 4: German & French Vocabulary' 
AND course_id = '2026c613-bda7-487a-a5d9-91e57c26a741';