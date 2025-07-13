-- Fix the infinite recursion in gw_profiles policies
-- First, create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.is_gw_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE gw_profiles.user_id = $1 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Drop existing problematic policies on gw_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.gw_profiles;

-- Create new safe policies for gw_profiles
CREATE POLICY "Users can view their own gw_profile" 
ON public.gw_profiles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own gw_profile" 
ON public.gw_profiles 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own gw_profile" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Add username permission for sheet music migration
INSERT INTO public.username_permissions (user_email, module_name, granted_by, notes)
VALUES ('sparkleme2002@gmail.com', 'migrate_sheet_music', 'system', 'Access to sheet music migration tool')
ON CONFLICT (user_email, module_name) DO NOTHING;