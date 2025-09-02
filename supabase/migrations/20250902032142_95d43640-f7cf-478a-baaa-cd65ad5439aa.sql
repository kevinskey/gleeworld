-- Fix the sync function to not reference NEW.updated_at
CREATE OR REPLACE FUNCTION public.sync_assignment_submission_from_journal_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
BEGIN
  -- Try to update an existing submission for this student + assignment
  UPDATE public.assignment_submissions
  SET
    grade = NEW.overall_score,
    feedback = COALESCE(NEW.feedback, feedback),
    status = 'graded',
    graded_at = NEW.graded_at,
    graded_by = COALESCE(NEW.graded_by, graded_by),
    updated_at = now()
  WHERE student_id = NEW.student_id
    AND assignment_id = NEW.assignment_id
  RETURNING id INTO existing_id;

  -- If none exists, create one so cards/gradebook show the grade
  IF existing_id IS NULL THEN
    INSERT INTO public.assignment_submissions (
      student_id, assignment_id, status, submitted_at, submission_date,
      grade, feedback, graded_at, graded_by, created_at, updated_at
    ) VALUES (
      NEW.student_id, NEW.assignment_id, 'graded', now(), now(),
      NEW.overall_score, NEW.feedback, NEW.graded_at, NEW.graded_by, now(), now()
    );
  END IF;

  RETURN NEW;
END;
$function$;