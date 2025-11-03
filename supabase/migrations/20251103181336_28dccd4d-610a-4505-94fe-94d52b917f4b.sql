-- Fix failing trigger function: replace NEW.feedback with NEW.instructor_feedback/NEW.ai_feedback
CREATE OR REPLACE FUNCTION public.sync_assignment_submission_from_journal_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  feedback_text text;
BEGIN
  IF NEW.assignment_id IS NULL THEN
    RETURN NEW;
  END IF;

  feedback_text := COALESCE(NEW.instructor_feedback, NEW.ai_feedback, NULL);

  UPDATE public.assignment_submissions
     SET grade = NEW.overall_score,
         feedback = COALESCE(feedback_text, feedback),
         status = 'graded',
         graded_at = COALESCE(NEW.graded_at, now()),
         graded_by = COALESCE(NEW.graded_by, graded_by),
         updated_at = now()
   WHERE student_id = NEW.student_id
     AND assignment_id = NEW.assignment_id
   RETURNING id INTO existing_id;

  IF existing_id IS NULL THEN
    INSERT INTO public.assignment_submissions(
      student_id, assignment_id, status, submitted_at, submission_date,
      grade, feedback, graded_at, graded_by, created_at, updated_at
    ) VALUES (
      NEW.student_id, NEW.assignment_id, 'graded', now(), now(),
      NEW.overall_score, feedback_text, COALESCE(NEW.graded_at, now()), NEW.graded_by, now(), now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Optional cleanup: drop duplicate timestamp trigger we added earlier
DROP TRIGGER IF EXISTS update_mus240_journal_grades_timestamp ON public.mus240_journal_grades;