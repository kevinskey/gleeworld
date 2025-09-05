-- Fix infinite recursion in gw_profiles RLS policies
-- Create security definer function to check admin status safely

-- First, create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_gw_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "gw_profiles_admin_all" ON public.gw_profiles;

-- Create a simplified admin policy using the security definer function
CREATE POLICY "gw_profiles_admin_manage" 
ON public.gw_profiles 
FOR ALL 
TO authenticated 
USING (public.is_gw_admin_safe())
WITH CHECK (public.is_gw_admin_safe());