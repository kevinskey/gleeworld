-- Consolidate profiles and gw_profiles into gw_profiles as single source of truth

-- First, ensure gw_profiles has all necessary fields from profiles table
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS academic_major TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS dress_size TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS shoe_size TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS hair_color TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS has_tattoos BOOLEAN DEFAULT false;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS visible_piercings BOOLEAN DEFAULT false;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[];
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.gw_profiles ADD COLUMN IF NOT EXISTS parent_guardian_contact TEXT;

-- Migrate data from profiles to gw_profiles where missing
UPDATE public.gw_profiles 
SET 
  avatar_url = COALESCE(gw_profiles.avatar_url, profiles.avatar_url),
  phone = COALESCE(gw_profiles.phone, profiles.phone_number),
  academic_major = profiles.academic_major,
  pronouns = profiles.pronouns,
  dress_size = profiles.dress_size,
  shoe_size = profiles.shoe_size,
  hair_color = profiles.hair_color,
  has_tattoos = COALESCE(profiles.has_tattoos, false),
  visible_piercings = COALESCE(profiles.visible_piercings, false),
  emergency_contact = profiles.emergency_contact,
  dietary_restrictions = profiles.dietary_restrictions,
  allergies = profiles.allergies,
  parent_guardian_contact = profiles.parent_guardian_contact,
  updated_at = now()
FROM public.profiles 
WHERE gw_profiles.user_id = profiles.id;

-- Create gw_profiles for any users that exist in profiles but not in gw_profiles
INSERT INTO public.gw_profiles (
  user_id, email, full_name, first_name, last_name, phone, avatar_url,
  academic_major, pronouns, dress_size, shoe_size, hair_color, 
  has_tattoos, visible_piercings, emergency_contact, dietary_restrictions,
  allergies, parent_guardian_contact, created_at, updated_at
)
SELECT 
  p.id, p.email, p.full_name,
  SPLIT_PART(p.full_name, ' ', 1),
  CASE WHEN array_length(string_to_array(p.full_name, ' '), 1) > 1 
       THEN array_to_string(string_to_array(p.full_name, ' ')[2:], ' ')
       ELSE NULL END,
  p.phone_number, p.avatar_url,
  p.academic_major, p.pronouns, p.dress_size, p.shoe_size, p.hair_color,
  COALESCE(p.has_tattoos, false), COALESCE(p.visible_piercings, false),
  p.emergency_contact, p.dietary_restrictions, p.allergies, p.parent_guardian_contact,
  p.created_at, now()
FROM public.profiles p
LEFT JOIN public.gw_profiles gw ON p.id = gw.user_id
WHERE gw.id IS NULL;

-- Update gw_profiles role information based on profiles
UPDATE public.gw_profiles 
SET 
  is_admin = CASE WHEN profiles.role = 'admin' THEN true ELSE gw_profiles.is_admin END,
  is_super_admin = CASE WHEN profiles.role = 'super-admin' THEN true ELSE gw_profiles.is_super_admin END,
  updated_at = now()
FROM public.profiles 
WHERE gw_profiles.user_id = profiles.id;

-- Create function to sync role changes from gw_profiles back to profiles for auth compatibility
CREATE OR REPLACE FUNCTION public.sync_gw_profile_role_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET
    role = CASE 
      WHEN NEW.is_super_admin = true THEN 'super-admin'
      WHEN NEW.is_admin = true THEN 'admin'
      ELSE 'user'
    END,
    full_name = NEW.full_name,
    updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to keep profiles table in sync for auth compatibility
DROP TRIGGER IF EXISTS sync_gw_profile_role_to_profiles_trigger ON public.gw_profiles;
CREATE TRIGGER sync_gw_profile_role_to_profiles_trigger
    AFTER INSERT OR UPDATE ON public.gw_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_gw_profile_role_to_profiles();

-- Update RLS policies for gw_profiles to be primary source
DROP POLICY IF EXISTS "Users can view all gw_profiles" ON public.gw_profiles;
CREATE POLICY "Users can view all gw_profiles" ON public.gw_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own gw_profile" ON public.gw_profiles;
CREATE POLICY "Users can update their own gw_profile" ON public.gw_profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own gw_profile" ON public.gw_profiles;
CREATE POLICY "Users can insert their own gw_profile" ON public.gw_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage all gw_profiles
CREATE POLICY "Admins can manage all gw_profiles" ON public.gw_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.gw_profiles gp 
            WHERE gp.user_id = auth.uid() 
            AND (gp.is_admin = true OR gp.is_super_admin = true)
        )
    );

-- Update the handle_new_user function to create gw_profiles instead of just profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into profiles for auth compatibility
    INSERT INTO public.profiles (id, email, role, full_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, 'user', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.created_at, now())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now();
    
    -- Insert into gw_profiles as primary source
    INSERT INTO public.gw_profiles (
        user_id, email, full_name, first_name, last_name, created_at, updated_at
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.created_at,
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;