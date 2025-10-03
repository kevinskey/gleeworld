-- Enable realtime for mus240_polls table
ALTER TABLE mus240_polls REPLICA IDENTITY FULL;

-- Add table to realtime publication if not already added
DO $$
BEGIN
  -- Check if the table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'mus240_polls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mus240_polls;
  END IF;
END $$;

-- Also enable realtime for poll responses table
ALTER TABLE mus240_poll_responses REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'mus240_poll_responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mus240_poll_responses;
  END IF;
END $$;