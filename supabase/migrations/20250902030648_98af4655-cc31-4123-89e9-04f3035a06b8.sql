-- Drop the problematic trigger that's causing the "updated_at" field error
DROP TRIGGER IF EXISTS trg_mus240_journal_grades_updated_at ON public.mus240_journal_grades;

-- Ensure we're using the correct trigger function that only fires on UPDATE
CREATE TRIGGER trg_mus240_journal_grades_updated_at
  BEFORE UPDATE ON public.mus240_journal_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_journal_grades_updated_at();