-- Fix critical RLS issues for authentication and core tables

-- First, enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.gw_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mus240_video_edits ENABLE ROW LEVEL SECURITY;

-- Add missing basic RLS policies for gw_roles (admin-only access)
DROP POLICY IF EXISTS "Only admins can view roles" ON public.gw_roles;
CREATE POLICY "Only admins can view roles" 
ON public.gw_roles 
FOR SELECT 
TO authenticated 
USING (public.is_current_user_admin_safe());

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.gw_roles;
CREATE POLICY "Only admins can manage roles" 
ON public.gw_roles 
FOR ALL 
TO authenticated 
USING (public.is_current_user_admin_safe())
WITH CHECK (public.is_current_user_admin_safe());

-- Add basic RLS policy for mus240_video_edits
DROP POLICY IF EXISTS "Users can view their own video edits" ON public.mus240_video_edits;
CREATE POLICY "Users can view their own video edits" 
ON public.mus240_video_edits 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR public.is_current_user_admin_safe());

DROP POLICY IF EXISTS "Users can manage their own video edits" ON public.mus240_video_edits;
CREATE POLICY "Users can manage their own video edits" 
ON public.mus240_video_edits 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id OR public.is_current_user_admin_safe())
WITH CHECK (auth.uid() = user_id OR public.is_current_user_admin_safe());

-- Fix authentication trigger issues
-- Ensure gw_profiles trigger exists and works properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role TEXT := 'user';
  user_email TEXT;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Set default role based on email or metadata
  IF user_email LIKE '%@spelman.edu' THEN
    new_role := 'member';
  ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    new_role := NEW.raw_user_meta_data->>'role';
  END IF;
  
  -- Insert into gw_profiles
  INSERT INTO public.gw_profiles (
    user_id,
    email,
    full_name,
    first_name,
    last_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(user_email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(user_email, '@', 1)), ' ', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 2)),
    new_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, gw_profiles.full_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Fix password reset functionality
-- Update auth settings to ensure password reset works properly
UPDATE auth.config 
SET 
  site_url = 'https://gleeworld.org',
  password_min_length = 8
WHERE true;

-- Clean up any corrupted sessions or rate limit entries
DELETE FROM public.security_rate_limits WHERE created_at < NOW() - INTERVAL '1 hour';

-- Ensure admin user profile is correct
UPDATE public.gw_profiles 
SET 
  is_admin = true,
  is_super_admin = true,
  role = 'super-admin'
WHERE user_id = '4e6c2ec0-1f83-449a-a984-8920f6056ab5';