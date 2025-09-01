
-- 1) Table to store AI rubric grades for listening journals
CREATE TABLE IF NOT EXISTS public.mus240_journal_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  assignment_id TEXT NOT NULL, -- matches the assignment card identifier used elsewhere
  journal_id UUID NULL,        -- optional: link to a journal entry record if available
  overall_score NUMERIC(5,2) NOT NULL,
  letter_grade TEXT GENERATED ALWAYS AS (
    CASE
      WHEN overall_score >= 90 THEN 'A'
      WHEN overall_score >= 80 THEN 'B'
      WHEN overall_score >= 70 THEN 'C'
      WHEN overall_score >= 60 THEN 'D'
      ELSE 'F'
    END
  ) STORED,
  rubric JSONB NOT NULL DEFAULT '{}'::jsonb, -- per-criterion scores and notes
  feedback TEXT,
  ai_model TEXT,                             -- e.g., gpt-5-2025-08-07
  graded_by UUID,                            -- instructor who initiated AI grading
  graded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Helpful index for sync/lookups
CREATE INDEX IF NOT EXISTS idx_mus240_journal_grades_student_assignment
  ON public.mus240_journal_grades (student_id, assignment_id);

-- 3) Keep updated_at fresh (reuses existing helper)
CREATE TRIGGER trg_mus240_journal_grades_updated_at
BEFORE UPDATE ON public.mus240_journal_grades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4) Row Level Security
ALTER TABLE public.mus240_journal_grades ENABLE ROW LEVEL SECURITY;

-- Students can view their own grades
CREATE POLICY "Students can view their own journal grades"
  ON public.mus240_journal_grades
  FOR SELECT
  USING (auth.uid() = student_id);

-- Instructors/Admins can manage all journal grades
-- (Admins or roles in ('instructor','staff','director'))
CREATE POLICY "Instructors/Admins manage journal grades"
  ON public.mus240_journal_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('instructor','staff','director'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.gw_profiles p
      WHERE p.user_id = auth.uid()
        AND (p.is_admin = true OR p.is_super_admin = true OR p.role IN ('instructor','staff','director'))
    )
  );

-- 5) Sync function: keep assignment_submissions in step with journal grades
CREATE OR REPLACE FUNCTION public.sync_assignment_submission_from_journal_grade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 6) Attach the sync to INSERT and UPDATE so re-grades are reflected
DROP TRIGGER IF EXISTS trg_sync_assignment_submissions_on_journal_grade_ins ON public.mus240_journal_grades;
CREATE TRIGGER trg_sync_assignment_submissions_on_journal_grade_ins
AFTER INSERT ON public.mus240_journal_grades
FOR EACH ROW EXECUTE FUNCTION public.sync_assignment_submission_from_journal_grade();

DROP TRIGGER IF EXISTS trg_sync_assignment_submissions_on_journal_grade_upd ON public.mus240_journal_grades;
CREATE TRIGGER trg_sync_assignment_submissions_on_journal_grade_upd
AFTER UPDATE OF overall_score, feedback, graded_at, graded_by ON public.mus240_journal_grades
FOR EACH ROW EXECUTE FUNCTION public.sync_assignment_submission_from_journal_grade();
