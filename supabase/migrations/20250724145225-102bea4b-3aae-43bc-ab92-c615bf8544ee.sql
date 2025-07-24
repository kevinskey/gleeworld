-- Step 1: Add missing fields from profiles table to gw_profiles table
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

-- Step 2: Migrate data from profiles to gw_profiles where gw_profiles doesn't have a record
INSERT INTO public.gw_profiles (
  user_id, email, full_name, role, avatar_url, bio, phone_number, 
  class_year, created_at, updated_at, student_number, workplace, 
  school_address, home_address, can_dance, instruments_played,
  preferred_payment_method, social_media_links, dress_size, shoe_size,
  hair_color, has_tattoos, visible_piercings, academic_major, pronouns,
  emergency_contact, dietary_restrictions, allergies, parent_guardian_contact,
  website_url, voice_part
)
SELECT 
  p.id, p.email, p.full_name, p.role, p.avatar_url, p.bio, p.phone_number,
  p.class_year, p.created_at, p.updated_at, p.student_number, p.workplace,
  p.school_address, p.home_address, p.can_dance, p.instruments_played,
  p.preferred_payment_method::text, p.social_media_links, p.dress_size, p.shoe_size,
  p.hair_color, p.has_tattoos, p.visible_piercings, p.academic_major, p.pronouns,
  p.emergency_contact, p.dietary_restrictions, p.allergies, p.parent_guardian_contact,
  p.website_url, p.voice_part::text
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_profiles gw WHERE gw.user_id = p.id
);

-- Step 3: Update existing gw_profiles records with data from profiles where profiles has more recent data
UPDATE public.gw_profiles 
SET 
  email = COALESCE(p.email, gw_profiles.email),
  full_name = COALESCE(p.full_name, gw_profiles.full_name),
  avatar_url = COALESCE(p.avatar_url, gw_profiles.avatar_url),
  bio = COALESCE(p.bio, gw_profiles.bio),
  phone_number = COALESCE(p.phone_number, gw_profiles.phone),
  class_year = COALESCE(p.class_year, gw_profiles.class_year),
  updated_at = GREATEST(p.updated_at, gw_profiles.updated_at),
  student_number = p.student_number,
  workplace = p.workplace,
  school_address = p.school_address,
  home_address = COALESCE(p.home_address, gw_profiles.address),
  can_dance = p.can_dance,
  instruments_played = p.instruments_played,
  preferred_payment_method = p.preferred_payment_method::text,
  social_media_links = p.social_media_links,
  dress_size = p.dress_size,
  shoe_size = p.shoe_size,
  hair_color = p.hair_color,
  has_tattoos = p.has_tattoos,
  visible_piercings = p.visible_piercings,
  academic_major = p.academic_major,
  pronouns = p.pronouns,
  emergency_contact = p.emergency_contact,
  dietary_restrictions = p.dietary_restrictions,
  allergies = p.allergies,
  parent_guardian_contact = p.parent_guardian_contact,
  website_url = p.website_url,
  voice_part = COALESCE(p.voice_part::text, gw_profiles.voice_part),
  -- Set admin flags based on role
  is_admin = CASE WHEN p.role = 'admin' THEN true ELSE gw_profiles.is_admin END,
  is_super_admin = CASE WHEN p.role = 'super-admin' THEN true ELSE gw_profiles.is_super_admin END,
  role = COALESCE(p.role, gw_profiles.role)
FROM public.profiles p
WHERE gw_profiles.user_id = p.id;

-- Step 4: Create a function to sync profile changes to maintain consistency
CREATE OR REPLACE FUNCTION public.sync_unified_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Update display_name when first_name or last_name changes
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name = COALESCE(NEW.first_name, '') || 
                   CASE WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN ' ' ELSE '' END || 
                   COALESCE(NEW.last_name, '');
  END IF;
  
  -- Set display_name
  NEW.display_name = COALESCE(NEW.full_name, NEW.first_name || ' ' || NEW.last_name, NEW.email, 'User');
  
  RETURN NEW;
END;
$$;

-- Create trigger for the sync function
DROP TRIGGER IF EXISTS sync_unified_profile_trigger ON public.gw_profiles;
CREATE TRIGGER sync_unified_profile_trigger
  BEFORE INSERT OR UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_unified_profile();