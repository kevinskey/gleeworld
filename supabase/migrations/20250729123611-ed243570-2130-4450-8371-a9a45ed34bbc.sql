-- Update the existing table to match our requirements
ALTER TABLE public.gw_spiritual_reflections 
ADD COLUMN IF NOT EXISTS scripture_reference TEXT,
ADD COLUMN IF NOT EXISTS reflection_type TEXT DEFAULT 'daily_devotional',
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_shared_to_members BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE;

-- Update the function to handle the new schema
CREATE OR REPLACE FUNCTION public.update_spiritual_reflections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set shared_at when is_shared_to_members becomes true
  IF OLD.is_shared_to_members IS DISTINCT FROM NEW.is_shared_to_members THEN
    IF NEW.is_shared_to_members = true THEN
      NEW.shared_at = now();
    ELSE
      NEW.shared_at = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;