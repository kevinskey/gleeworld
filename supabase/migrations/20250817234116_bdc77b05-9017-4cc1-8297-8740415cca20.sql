-- Update the database entry to match the expected module key format
UPDATE public.gw_app_functions 
SET module = 'member-sight-reading-studio',
    name = 'member-sight-reading-studio'
WHERE module = 'member-sight-reading-studio' OR name = 'member_sight_reading_studio';