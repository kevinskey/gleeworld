-- Fix the attendance table foreign key constraint to reference gw_profiles instead of auth.users

-- First drop the existing foreign key constraint
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;

-- Add the correct foreign key constraint that references gw_profiles.user_id
ALTER TABLE public.attendance 
ADD CONSTRAINT attendance_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.gw_profiles(user_id) ON DELETE CASCADE;