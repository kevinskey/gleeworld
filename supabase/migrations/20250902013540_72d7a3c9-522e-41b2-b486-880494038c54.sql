-- Add missing updated_at column to mus240_journal_grades table
ALTER TABLE public.mus240_journal_grades 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_mus240_journal_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updating updated_at
DROP TRIGGER IF EXISTS update_mus240_journal_grades_updated_at_trigger ON public.mus240_journal_grades;
CREATE TRIGGER update_mus240_journal_grades_updated_at_trigger
  BEFORE UPDATE ON public.mus240_journal_grades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mus240_journal_grades_updated_at();