-- Drop the old valid_theme_preference constraint and add updated one with 'hbcu'
ALTER TABLE public.gw_profiles DROP CONSTRAINT IF EXISTS valid_theme_preference;

ALTER TABLE public.gw_profiles ADD CONSTRAINT valid_theme_preference 
CHECK (theme_preference IS NULL OR theme_preference IN ('glee-world', 'spelman-blue', 'spelhouse', 'music', 'hbcu'));