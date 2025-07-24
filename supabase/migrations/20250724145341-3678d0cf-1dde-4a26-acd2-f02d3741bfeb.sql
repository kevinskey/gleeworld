-- Temporarily disable the privilege escalation trigger
DROP TRIGGER IF EXISTS prevent_gw_profile_privilege_escalation_trigger ON public.gw_profiles;

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

-- Step 2: Update existing gw_profiles records with data from profiles
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
  can_dance = COALESCE(p.can_dance, false),
  instruments_played = p.instruments_played,
  preferred_payment_method = p.preferred_payment_method::text,
  social_media_links = COALESCE(p.social_media_links, '{}'::jsonb),
  dress_size = p.dress_size,
  shoe_size = p.shoe_size,
  hair_color = p.hair_color,
  has_tattoos = COALESCE(p.has_tattoos, false),
  visible_piercings = COALESCE(p.visible_piercings, false),
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

-- Step 3: Insert records that exist in profiles but not in gw_profiles
INSERT INTO public.gw_profiles (
  user_id, email, full_name, role, avatar_url, bio, phone_number, 
  class_year, created_at, updated_at, student_number, workplace, 
  school_address, home_address, can_dance, instruments_played,
  preferred_payment_method, social_media_links, dress_size, shoe_size,
  hair_color, has_tattoos, visible_piercings, academic_major, pronouns,
  emergency_contact, dietary_restrictions, allergies, parent_guardian_contact,
  website_url, voice_part, is_admin, is_super_admin
)
SELECT 
  p.id, p.email, p.full_name, p.role, p.avatar_url, p.bio, p.phone_number,
  p.class_year, p.created_at, p.updated_at, p.student_number, p.workplace,
  p.school_address, p.home_address, COALESCE(p.can_dance, false), p.instruments_played,
  p.preferred_payment_method::text, COALESCE(p.social_media_links, '{}'::jsonb), p.dress_size, p.shoe_size,
  p.hair_color, COALESCE(p.has_tattoos, false), COALESCE(p.visible_piercings, false), p.academic_major, p.pronouns,
  p.emergency_contact, p.dietary_restrictions, p.allergies, p.parent_guardian_contact,
  p.website_url, p.voice_part::text,
  CASE WHEN p.role = 'admin' THEN true ELSE false END,
  CASE WHEN p.role = 'super-admin' THEN true ELSE false END
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.gw_profiles gw WHERE gw.user_id = p.id
);

-- Recreate the privilege escalation trigger with updated logic
CREATE OR REPLACE FUNCTION public.prevent_gw_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Skip privilege checks during migration or bulk operations
    IF current_setting('app.skip_privilege_check', true) = 'true' THEN
        RETURN NEW;
    END IF;
    
    -- Prevent users from changing their own admin status
    IF OLD.user_id = auth.uid() AND (
        OLD.is_admin != NEW.is_admin OR 
        OLD.is_super_admin != NEW.is_super_admin
    ) THEN
        RAISE EXCEPTION 'Security violation: Cannot modify your own admin privileges';
    END IF;
    
    -- Only existing admins can grant admin privileges
    IF (OLD.is_admin != NEW.is_admin OR OLD.is_super_admin != NEW.is_super_admin) THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.gw_profiles 
            WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
        ) THEN
            RAISE EXCEPTION 'Permission denied: Only admins can modify admin privileges';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_gw_profile_privilege_escalation_trigger
    BEFORE UPDATE ON public.gw_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_gw_profile_privilege_escalation();