-- Add missing columns to polls table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'mus240_polls' AND column_name = 'current_question_index') THEN
    ALTER TABLE mus240_polls ADD COLUMN current_question_index INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'mus240_polls' AND column_name = 'is_live_session') THEN
    ALTER TABLE mus240_polls ADD COLUMN is_live_session BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'mus240_polls' AND column_name = 'show_results') THEN
    ALTER TABLE mus240_polls ADD COLUMN show_results BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable realtime for polls table updates
ALTER TABLE mus240_polls REPLICA IDENTITY FULL;

-- Add polls table to realtime publication if not already added
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE mus240_polls;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication, continue
  END;
END $$;