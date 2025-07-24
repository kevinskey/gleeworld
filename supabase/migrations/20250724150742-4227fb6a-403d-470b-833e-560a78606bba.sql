-- Fix infinite recursion in gw_profiles RLS policies
-- First, let's drop all existing policies on gw_profiles and recreate them properly

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.gw_profiles;

-- Create proper RLS policies without recursion
CREATE POLICY "Allow authenticated users to view profiles" 
ON public.gw_profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow users to update their own profile" 
ON public.gw_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own profile" 
ON public.gw_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage all profiles by checking against the profiles table directly
-- to avoid recursion
CREATE POLICY "Allow admins to update all profiles" 
ON public.gw_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Allow super admins to delete profiles" 
ON public.gw_profiles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super-admin'
  )
);