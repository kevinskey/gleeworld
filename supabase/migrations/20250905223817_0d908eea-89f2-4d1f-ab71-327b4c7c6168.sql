-- Fix the foreign key constraint for gw_sheet_music table
-- Remove the existing foreign key constraint to auth.users and update to reference gw_profiles

-- First, drop the existing foreign key constraint
ALTER TABLE public.gw_sheet_music 
DROP CONSTRAINT IF EXISTS gw_sheet_music_created_by_fkey;

-- Add a new foreign key constraint that references gw_profiles.user_id
ALTER TABLE public.gw_sheet_music 
ADD CONSTRAINT gw_sheet_music_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.gw_profiles(user_id) ON DELETE SET NULL;