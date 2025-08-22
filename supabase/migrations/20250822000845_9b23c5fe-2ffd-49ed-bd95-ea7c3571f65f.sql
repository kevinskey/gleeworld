-- Add media_release_signed_at column to gw_profiles table
ALTER TABLE public.gw_profiles 
ADD COLUMN IF NOT EXISTS media_release_signed_at TIMESTAMP WITH TIME ZONE;