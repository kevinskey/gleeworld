-- Consolidate user system to use only profiles table with proper roles

-- First, add missing columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS voice_part text,
ADD COLUMN IF NOT EXISTS class_year integer,
ADD COLUMN IF NOT EXISTS join_date date,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS dues_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_exec_board boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exec_board_role text,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS graduation_year integer,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- Update role enum to include all needed roles
DO $$ 
BEGIN
    -- Drop existing role enum if it exists and recreate with proper values
    DROP TYPE IF EXISTS user_role CASCADE;
    CREATE TYPE user_role AS ENUM ('fan', 'member', 'admin', 'super-admin');
    
    -- Update the role column to use the enum
    ALTER TABLE public.profiles 
    ALTER COLUMN role TYPE user_role USING role::user_role;
EXCEPTION WHEN OTHERS THEN
    -- If enum creation fails, just update role column to text with check constraint
    ALTER TABLE public.profiles 
    ALTER COLUMN role TYPE text,
    ADD CONSTRAINT valid_roles CHECK (role IN ('fan', 'member', 'admin', 'super-admin'));
END $$;

-- Migrate data from gw_profiles to profiles
UPDATE public.profiles 
SET 
    phone = gw.phone,
    voice_part = gw.voice_part,
    class_year = gw.class_year,
    join_date = gw.join_date,
    status = gw.status,
    dues_paid = gw.dues_paid,
    notes = gw.notes,
    is_admin = gw.is_admin,
    is_super_admin = gw.is_super_admin,
    is_exec_board = gw.is_exec_board,
    exec_board_role = gw.exec_board_role,
    title = gw.title,
    bio = gw.bio,
    graduation_year = gw.graduation_year,
    avatar_url = COALESCE(profiles.avatar_url, gw.avatar_url),
    verified = gw.verified,
    role = CASE 
        WHEN gw.is_super_admin = true THEN 'super-admin'
        WHEN gw.is_admin = true THEN 'admin'
        WHEN gw.role = 'member' THEN 'member'
        WHEN gw.role = 'fan' THEN 'fan'
        ELSE 'fan'
    END::text
FROM public.gw_profiles gw
WHERE profiles.id = gw.user_id;

-- Update any remaining "user" roles to appropriate defaults
UPDATE public.profiles 
SET role = CASE 
    WHEN is_super_admin = true THEN 'super-admin'
    WHEN is_admin = true THEN 'admin'
    WHEN is_exec_board = true THEN 'member'
    ELSE 'fan'
END::text
WHERE role = 'user' OR role IS NULL;

-- Create function to update profiles table when auth.users is updated
CREATE OR REPLACE FUNCTION public.handle_updated_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    email = NEW.email,
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger to sync auth.users updates to profiles
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_user();

-- Update security functions to use profiles table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND (role = 'admin' OR role = 'super-admin' OR is_admin = true OR is_super_admin = true)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = _user_id AND (role = 'super-admin' OR is_super_admin = true)
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role IN ('admin', 'super-admin') OR is_admin = true OR is_super_admin = true)
  );
$$;

-- Update RLS policies to use new role system
DROP POLICY IF EXISTS "Users can view their profiles" ON public.profiles;
CREATE POLICY "Users can view their profiles" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their profiles" ON public.profiles;
CREATE POLICY "Users can update their profiles" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'super-admin') OR is_admin = true OR is_super_admin = true)
  )
);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'super-admin') OR is_admin = true OR is_super_admin = true)
  )
);

-- Add comments for clarity
COMMENT ON TABLE public.profiles IS 'Consolidated user profiles table with all user data and roles';
COMMENT ON COLUMN public.profiles.role IS 'Primary user role: fan, member, admin, super-admin';
COMMENT ON COLUMN public.profiles.is_admin IS 'Legacy admin flag - use role column instead';
COMMENT ON COLUMN public.profiles.is_super_admin IS 'Legacy super admin flag - use role column instead';