-- Delete stale listening journal assignments from gw_assignments for MUS-240
-- These are legacy entries that are no longer used
DELETE FROM gw_assignments 
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND assignment_type = 'listening_journal';

-- Also clean up the old AI Group Project entry from 2024
DELETE FROM gw_assignments 
WHERE course_id = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37'
AND due_at < '2026-01-01';