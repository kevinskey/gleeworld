-- Update the theme_preference constraint to include the new 'hbcu' theme
-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
    -- Try to drop the constraint (ignore error if it doesn't exist)
    ALTER TABLE public.gw_profiles DROP CONSTRAINT IF EXISTS gw_profiles_theme_preference_check;
    EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Add the updated constraint with the new 'hbcu' theme option
ALTER TABLE public.gw_profiles ADD CONSTRAINT gw_profiles_theme_preference_check 
CHECK (theme_preference IS NULL OR theme_preference IN ('glee-world', 'spelman-blue', 'spelhouse', 'music', 'hbcu'));