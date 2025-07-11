-- Add slide timing configuration to hero slides if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gw_hero_slides' 
                 AND column_name = 'slide_duration_seconds') THEN
    ALTER TABLE gw_hero_slides 
    ADD COLUMN slide_duration_seconds integer DEFAULT 5;
  END IF;
END $$;