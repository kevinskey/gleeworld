-- Link SCGC Rehearsal events to MUS 070 course
UPDATE events 
SET course_id = 'a0000000-0000-0000-0000-000000000070' 
WHERE (title ILIKE '%SCGC%' OR title ILIKE '%glee%') 
AND course_id IS NULL;

-- Also link major performances (Commencement, Baccalaureate, etc.) to MUS 070
UPDATE events 
SET course_id = 'a0000000-0000-0000-0000-000000000070' 
WHERE title IN ('Commencement', 'Baccalaureate', 'Color Purple', 'Final Examinations')
AND course_id IS NULL;