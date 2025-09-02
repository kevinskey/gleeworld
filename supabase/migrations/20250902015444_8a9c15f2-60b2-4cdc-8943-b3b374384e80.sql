-- Create trigger function for mus240_journal_grades if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_mus240_journal_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_mus240_journal_grades_updated_at_trigger ON public.mus240_journal_grades;

-- Create the trigger
CREATE TRIGGER update_mus240_journal_grades_updated_at_trigger
  BEFORE UPDATE ON public.mus240_journal_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_journal_grades_updated_at();