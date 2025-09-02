-- Check what triggers exist on mus240_journal_grades table first
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'mus240_journal_grades';

-- Drop and recreate the trigger function to fix the updated_at issue
DROP TRIGGER IF EXISTS update_mus240_journal_grades_updated_at_trigger ON public.mus240_journal_grades;
DROP FUNCTION IF EXISTS public.update_mus240_journal_grades_updated_at();

-- Create a new trigger function that only works on UPDATE operations
CREATE OR REPLACE FUNCTION public.update_mus240_journal_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update the timestamp, don't try to access NEW.updated_at
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that only fires on UPDATE, not INSERT
CREATE TRIGGER update_mus240_journal_grades_updated_at_trigger
  BEFORE UPDATE ON public.mus240_journal_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_journal_grades_updated_at();