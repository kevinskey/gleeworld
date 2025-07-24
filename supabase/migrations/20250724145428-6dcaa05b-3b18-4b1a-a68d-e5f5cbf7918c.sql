-- Remove the problematic sync triggers that cause infinite recursion
DROP TRIGGER IF EXISTS sync_gw_profile_to_profile ON public.gw_profiles;
DROP TRIGGER IF EXISTS sync_profile_to_gw_profile ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_gw_profile_to_profile();
DROP FUNCTION IF EXISTS public.sync_profile_to_gw_profile();

-- Add missing fields to gw_profiles
ALTER TABLE public.gw_profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS student_number TEXT,
ADD COLUMN IF NOT EXISTS workplace TEXT,
ADD COLUMN IF NOT EXISTS school_address TEXT,
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS can_dance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS instruments_played TEXT[],
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT,
ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS dress_size TEXT,
ADD COLUMN IF NOT EXISTS shoe_size TEXT,
ADD COLUMN IF NOT EXISTS hair_color TEXT,
ADD COLUMN IF NOT EXISTS has_tattoos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visible_piercings BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS academic_major TEXT,
ADD COLUMN IF NOT EXISTS pronouns TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[],
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS parent_guardian_contact TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Manually update your profile as super admin
UPDATE public.gw_profiles 
SET 
  role = 'super-admin',
  is_super_admin = true,
  is_admin = true,
  updated_at = now()
WHERE email = 'mmolakpa@gmail.com' OR user_id = (SELECT id FROM auth.users WHERE email = 'mmolakpa@gmail.com');