-- Ensure updated_at exists and is nullable
ALTER TABLE public.mus240_journal_grades
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.mus240_journal_grades
  ALTER COLUMN updated_at DROP NOT NULL;

-- BEFORE UPDATE trigger that only sets updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.set_mus240_journal_grades_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mus240_journal_grades_updated_at ON public.mus240_journal_grades;
CREATE TRIGGER trg_mus240_journal_grades_updated_at
BEFORE UPDATE ON public.mus240_journal_grades
FOR EACH ROW EXECUTE FUNCTION public.set_mus240_journal_grades_updated_at();

-- Sync to assignment_submissions. Do not read NEW.updated_at from grades on INSERT.
CREATE OR REPLACE FUNCTION public.sync_assignment_submission_from_journal_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE existing_id uuid;
BEGIN
  IF NEW.assignment_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.assignment_submissions
     SET grade = NEW.overall_score,
         feedback = COALESCE(NEW.feedback, feedback),
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
      NEW.overall_score, NEW.feedback, COALESCE(NEW.graded_at, now()), NEW.graded_by, now(), now()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger if needed
DROP TRIGGER IF EXISTS trg_sync_assignment_submission_from_journal_grade ON public.mus240_journal_grades;
CREATE TRIGGER trg_sync_assignment_submission_from_journal_grade
AFTER INSERT OR UPDATE ON public.mus240_journal_grades
FOR EACH ROW EXECUTE FUNCTION public.sync_assignment_submission_from_journal_grade();