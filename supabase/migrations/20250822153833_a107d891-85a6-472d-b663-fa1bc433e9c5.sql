-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_mus240_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_mus240_journal_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.update_mus240_reading_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_mus240_journal_entries_updated_at ON public.mus240_journal_entries;
DROP TRIGGER IF EXISTS update_mus240_journal_comments_updated_at ON public.mus240_journal_comments;
DROP TRIGGER IF EXISTS update_mus240_reading_requirements_updated_at ON public.mus240_reading_requirements;

-- Create the triggers
CREATE TRIGGER update_mus240_journal_entries_updated_at
BEFORE UPDATE ON public.mus240_journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_mus240_journal_entries_updated_at();

CREATE TRIGGER update_mus240_journal_comments_updated_at
BEFORE UPDATE ON public.mus240_journal_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_mus240_journal_comments_updated_at();

CREATE TRIGGER update_mus240_reading_requirements_updated_at
BEFORE UPDATE ON public.mus240_reading_requirements
FOR EACH ROW
EXECUTE FUNCTION public.update_mus240_reading_requirements_updated_at();

-- Function to update reading progress when someone reads a journal
CREATE OR REPLACE FUNCTION public.update_reading_progress()
RETURNS TRIGGER AS $$
DECLARE
  assignment_id_val TEXT;
  current_count INTEGER;
BEGIN
  -- Get the assignment_id from the journal entry
  SELECT assignment_id INTO assignment_id_val
  FROM public.mus240_journal_entries
  WHERE id = NEW.journal_id;
  
  -- Count current reads for this assignment by this reader
  SELECT COUNT(*) INTO current_count
  FROM public.mus240_journal_reads jr
  JOIN public.mus240_journal_entries je ON jr.journal_id = je.id
  WHERE jr.reader_id = NEW.reader_id 
  AND je.assignment_id = assignment_id_val;
  
  -- Insert or update reading requirements
  INSERT INTO public.mus240_reading_requirements (
    assignment_id, student_id, journals_read, completed_at
  ) VALUES (
    assignment_id_val, NEW.reader_id, current_count,
    CASE WHEN current_count >= 2 THEN now() ELSE NULL END
  )
  ON CONFLICT (assignment_id, student_id)
  DO UPDATE SET
    journals_read = current_count,
    completed_at = CASE WHEN current_count >= 2 THEN now() ELSE NULL END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_reading_progress_trigger ON public.mus240_journal_reads;

-- Create the trigger
CREATE TRIGGER update_reading_progress_trigger
AFTER INSERT ON public.mus240_journal_reads
FOR EACH ROW
EXECUTE FUNCTION public.update_reading_progress();