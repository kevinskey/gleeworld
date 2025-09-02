-- Fix the trigger for mus240_journal_grades table
-- First drop the problematic trigger
DROP TRIGGER IF EXISTS update_mus240_journal_grades_updated_at_trigger ON public.mus240_journal_grades;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_mus240_journal_grades_updated_at();

-- Create a new trigger function that works with the table structure
CREATE OR REPLACE FUNCTION public.update_mus240_journal_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update updated_at if the column exists and we're doing an UPDATE
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger only for UPDATE operations
CREATE TRIGGER update_mus240_journal_grades_updated_at_trigger
  BEFORE UPDATE ON public.mus240_journal_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_journal_grades_updated_at();