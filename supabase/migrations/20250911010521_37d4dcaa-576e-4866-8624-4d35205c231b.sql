CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.mus240_journal_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  assignment_id text NOT NULL,
  journal_id uuid NULL,
  overall_score numeric NULL,
  letter_grade text NULL,
  rubric jsonb NULL,
  feedback text NULL,
  ai_model text NULL,
  graded_by text NULL,
  graded_at timestamptz NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NULL
);

-- Create function to update updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.set_mus240_journal_grades_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at := now(); 
  RETURN NEW; 
END; 
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_mus240_journal_grades_updated_at ON public.mus240_journal_grades;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trg_mus240_journal_grades_updated_at
  BEFORE UPDATE ON public.mus240_journal_grades
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_mus240_journal_grades_updated_at();