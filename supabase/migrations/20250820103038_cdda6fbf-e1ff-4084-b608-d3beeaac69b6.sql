-- Add missing consent columns to gw_profiles table
ALTER TABLE gw_profiles 
ADD COLUMN IF NOT EXISTS photo_consent boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_consent boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_consent boolean DEFAULT NULL;