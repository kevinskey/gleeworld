-- Migration to merge profiles and gw_profiles tables
-- Step 1: Link existing gw_profiles to auth users by email matching
UPDATE public.gw_profiles 
SET user_id = auth_users.id
FROM auth.users AS auth_users
WHERE gw_profiles.email = auth_users.email 
AND gw_profiles.user_id IS NULL;

-- Step 2: For gw_profiles without matching auth users, we'll handle them separately
-- First, let's see what data we're working with
-- This query will show us unmatched gw_profiles
-- SELECT email, full_name FROM public.gw_profiles WHERE user_id IS NULL;

-- Step 3: Merge profile data from profiles table to gw_profiles where both exist
UPDATE public.gw_profiles
SET 
  full_name = COALESCE(gw_profiles.full_name, profiles.full_name),
  first_name = COALESCE(gw_profiles.first_name, SPLIT_PART(profiles.full_name, ' ', 1)),
  last_name = COALESCE(gw_profiles.last_name, SPLIT_PART(profiles.full_name, ' ', 2)),
  phone = COALESCE(gw_profiles.phone, profiles.phone_number),
  updated_at = now()
FROM public.profiles
WHERE gw_profiles.user_id = profiles.id;

-- Step 4: Create missing gw_profiles for users who only exist in profiles table
INSERT INTO public.gw_profiles (
  user_id, 
  email, 
  full_name, 
  first_name, 
  last_name, 
  phone,
  created_at,
  updated_at
)
SELECT 
  p.id,
  p.email,
  p.full_name,
  SPLIT_PART(p.full_name, ' ', 1) as first_name,
  SPLIT_PART(p.full_name, ' ', 2) as last_name,
  p.phone_number,
  p.created_at,
  now()
FROM public.profiles p
LEFT JOIN public.gw_profiles gw ON p.id = gw.user_id
WHERE gw.user_id IS NULL;

-- Step 5: Update the profiles table role information from gw_profiles where available
UPDATE public.profiles
SET 
  role = CASE 
    WHEN gw_profiles.is_super_admin = true THEN 'super-admin'
    WHEN gw_profiles.is_admin = true THEN 'admin' 
    ELSE profiles.role
  END,
  updated_at = now()
FROM public.gw_profiles
WHERE profiles.id = gw_profiles.user_id;

-- Step 6: Create a function to keep profiles synchronized
CREATE OR REPLACE FUNCTION sync_profile_to_gw_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert into gw_profiles when profiles changes
  INSERT INTO public.gw_profiles (
    user_id, email, full_name, first_name, last_name, phone, created_at, updated_at
  ) VALUES (
    NEW.id, 
    NEW.email, 
    NEW.full_name,
    SPLIT_PART(NEW.full_name, ' ', 1),
    SPLIT_PART(NEW.full_name, ' ', 2),
    NEW.phone_number,
    NEW.created_at,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to keep profiles synchronized
DROP TRIGGER IF EXISTS sync_profiles_trigger ON public.profiles;
CREATE TRIGGER sync_profiles_trigger
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_to_gw_profile();

-- Step 8: Create a function to sync gw_profiles back to profiles
CREATE OR REPLACE FUNCTION sync_gw_profile_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table when gw_profiles changes
  UPDATE public.profiles SET
    full_name = NEW.full_name,
    phone_number = NEW.phone,
    role = CASE 
      WHEN NEW.is_super_admin = true THEN 'super-admin'
      WHEN NEW.is_admin = true THEN 'admin'
      ELSE profiles.role
    END,
    updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for reverse sync
DROP TRIGGER IF EXISTS sync_gw_profiles_reverse_trigger ON public.gw_profiles;
CREATE TRIGGER sync_gw_profiles_reverse_trigger
  AFTER UPDATE ON public.gw_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_gw_profile_to_profile();