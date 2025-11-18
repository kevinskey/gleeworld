-- Update journal entries to link to assignments by UUID instead of code
UPDATE public.mus240_journal_entries je
SET assignment_id = a.id
FROM public.mus240_assignments a
WHERE a.assignment_code = je.assignment_id
  AND je.assignment_id LIKE 'lj%';