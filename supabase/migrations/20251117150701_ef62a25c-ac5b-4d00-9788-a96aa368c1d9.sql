-- Clean slate: Remove all grading data, submissions, comments, exams, and polls from new grading system

-- 1. Delete all assignment submissions from new grading system
DELETE FROM public.gw_assignment_submissions;
DELETE FROM public.gw_submissions;
DELETE FROM public.assignment_submissions;

-- 2. Delete all grades from new grading system
DELETE FROM public.gw_grades;
DELETE FROM public.gw_semester_grades;

-- 3. Delete all journal entries and related data
DELETE FROM public.mus240_journal_comments;
DELETE FROM public.mus240_journal_reads;
DELETE FROM public.mus240_journal_grades;
DELETE FROM public.mus240_journal_entries;

-- 4. Delete all midterm submissions
DELETE FROM public.mus240_midterm_submissions;

-- 5. Delete all submission grades
DELETE FROM public.mus240_submission_grades;

-- 6. Delete all participation grades
DELETE FROM public.mus240_participation_grades;

-- 7. Delete all grade summaries
DELETE FROM public.mus240_grade_summaries;

-- 8. Delete all polls and poll responses
DELETE FROM public.mus240_poll_responses;
DELETE FROM public.mus240_polls;
DELETE FROM public.theory_poll_responses;
DELETE FROM public.theory_poll_questions;
DELETE FROM public.theory_poll_sessions;

-- All student work, grades, comments, exams, and polls cleared - fresh start!