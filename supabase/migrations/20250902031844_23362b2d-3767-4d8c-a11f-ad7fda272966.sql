-- First, drop and recreate the trigger function to ensure it's correct
DROP FUNCTION IF EXISTS public.update_mus240_journal_grades_updated_at() CASCADE;

-- Create the correct trigger function
CREATE OR REPLACE FUNCTION public.update_mus240_journal_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop any existing triggers
DROP TRIGGER IF EXISTS update_mus240_journal_grades_updated_at_trigger ON public.mus240_journal_grades;

-- Create a clean trigger that only fires on UPDATE
CREATE TRIGGER update_mus240_journal_grades_updated_at_trigger
  BEFORE UPDATE ON public.mus240_journal_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_journal_grades_updated_at();