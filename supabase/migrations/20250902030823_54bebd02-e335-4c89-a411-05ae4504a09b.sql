-- Remove all problematic updated_at triggers that are causing conflicts
DROP TRIGGER IF EXISTS trg_mus240_journal_grades_updated_at ON public.mus240_journal_grades;
DROP TRIGGER IF EXISTS update_mus240_journal_grades_updated_at_trigger ON public.mus240_journal_grades;

-- Create a single, clean updated_at trigger that only fires on UPDATE
CREATE TRIGGER update_mus240_journal_grades_updated_at_trigger
  BEFORE UPDATE ON public.mus240_journal_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_journal_grades_updated_at();