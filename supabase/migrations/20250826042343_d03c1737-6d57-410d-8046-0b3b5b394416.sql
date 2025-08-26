-- Fix the voice_part check constraint that's preventing profile updates
-- First, let's drop the existing problematic constraint
ALTER TABLE gw_profiles DROP CONSTRAINT IF EXISTS gw_profiles_voice_part_check;

-- Add a proper check constraint that allows valid voice parts and NULL
ALTER TABLE gw_profiles ADD CONSTRAINT gw_profiles_voice_part_check 
CHECK (voice_part IS NULL OR voice_part IN ('S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'));