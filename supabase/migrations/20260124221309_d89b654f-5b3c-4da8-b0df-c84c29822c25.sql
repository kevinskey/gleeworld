-- Delete all attendance records
DELETE FROM attendance;

-- Delete all grade summaries
DELETE FROM mus240_grade_summaries;

-- Delete all participation grades  
DELETE FROM mus240_participation_grades;

-- Delete all journal grades
DELETE FROM mus240_journal_grades;

-- Delete assignment submissions BEFORE January 18, 2025
DELETE FROM assignment_submissions 
WHERE submitted_at < '2025-01-18T00:00:00Z';

-- Delete class session journals BEFORE January 18, 2025
DELETE FROM class_session_journals
WHERE created_at < '2025-01-18T00:00:00Z';