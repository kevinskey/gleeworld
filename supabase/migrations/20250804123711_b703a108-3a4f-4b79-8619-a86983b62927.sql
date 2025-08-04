-- Fix infinite recursion in gw_profiles policies by creating security definer functions
-- and updating problematic policies

-- First, drop any problematic policies on gw_profiles that might cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON gw_profiles; 
DROP POLICY IF EXISTS "Admins can view all profiles" ON gw_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON gw_profiles;

-- Create or replace security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_profile_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.gw_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_gw_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Create simple, non-recursive policies for gw_profiles
CREATE POLICY "Users can view their own gw_profile"
ON gw_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own gw_profile"
ON gw_profiles  
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own gw_profile"
ON gw_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix other table policies that reference gw_profiles to use security definer functions instead
-- Products table
DROP POLICY IF EXISTS "Admins can manage all products" ON products;
CREATE POLICY "Admins can manage all products"
ON products
FOR ALL
TO authenticated
USING (public.is_current_user_gw_admin_safe());

-- Audio archive table  
DROP POLICY IF EXISTS "Admins can manage audio archive" ON audio_archive;
CREATE POLICY "Admins can manage audio archive"
ON audio_archive
FOR ALL
TO authenticated
USING (public.is_current_user_gw_admin_safe());

-- Events table
DROP POLICY IF EXISTS "Admins can manage all events" ON gw_events;
CREATE POLICY "Admins can manage all events"
ON gw_events
FOR ALL
TO authenticated
USING (public.is_current_user_gw_admin_safe());