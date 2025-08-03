-- Add middle_name field to gw_profiles table
ALTER TABLE public.gw_profiles 
ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- Update the sync function to handle middle name
CREATE OR REPLACE FUNCTION public.sync_gw_profile_full_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.middle_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name = COALESCE(NEW.first_name, '') || 
                   CASE 
                     WHEN NEW.first_name IS NOT NULL AND NEW.middle_name IS NOT NULL THEN ' ' 
                     ELSE '' 
                   END || 
                   COALESCE(NEW.middle_name, '') ||
                   CASE 
                     WHEN (NEW.first_name IS NOT NULL OR NEW.middle_name IS NOT NULL) AND NEW.last_name IS NOT NULL THEN ' ' 
                     ELSE '' 
                   END || 
                   COALESCE(NEW.last_name, '');
  END IF;
  RETURN NEW;
END;
$$;