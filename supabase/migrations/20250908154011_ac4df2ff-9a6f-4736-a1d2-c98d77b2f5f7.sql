-- Enable real-time updates for journal entries
ALTER TABLE public.mus240_journal_entries REPLICA IDENTITY FULL;

-- Add the journal entries table to the realtime publication
BEGIN;
  -- Remove the table first if it exists
  SELECT 'ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.mus240_journal_entries;'
  WHERE EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'mus240_journal_entries'
  );
  
  -- Add the table to the publication
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mus240_journal_entries;
COMMIT;