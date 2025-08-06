-- Fix RLS policies for gw_profiles to allow admins to view all profiles

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Profile access" ON public.gw_profiles;

-- Create comprehensive admin management policy
CREATE POLICY "Admin full access to all profiles" 
ON public.gw_profiles 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.gw_profiles gp 
        WHERE gp.user_id = auth.uid() 
        AND (gp.is_admin = true OR gp.is_super_admin = true OR gp.role IN ('admin', 'super-admin'))
    )
);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" 
ON public.gw_profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Allow users to update their own profile  
CREATE POLICY "Users can update own profile" 
ON public.gw_profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());