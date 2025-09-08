-- Check which tables are missing from realtime
SELECT schemaname, tablename
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('mus240_journal_entries', 'mus240_journal_grades', 'mus240_journal_comments')
AND tablename NOT IN (
  SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
);

-- Add only missing tables to realtime
DO $$
BEGIN
  -- Add mus240_journal_grades if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'mus240_journal_grades'
  ) THEN
    ALTER TABLE public.mus240_journal_grades REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mus240_journal_grades;
    RAISE NOTICE 'Added mus240_journal_grades to realtime';
  END IF;

  -- Add mus240_journal_comments if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'mus240_journal_comments'
  ) THEN
    ALTER TABLE public.mus240_journal_comments REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mus240_journal_comments;
    RAISE NOTICE 'Added mus240_journal_comments to realtime';
  END IF;
END $$;