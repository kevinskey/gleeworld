-- Enable realtime for mus240_journal_entries table
ALTER TABLE public.mus240_journal_entries REPLICA IDENTITY FULL;

-- Add mus240_journal_entries to the realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.mus240_journal_entries;

-- Also add mus240_journal_grades table for grade syncing
ALTER TABLE public.mus240_journal_grades REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mus240_journal_grades;

-- Add mus240_journal_comments for comment syncing
ALTER TABLE public.mus240_journal_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mus240_journal_comments;