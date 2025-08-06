-- Fix the recursive RLS policy issue by creating a security definer function
-- and updating the admin policy

-- First, drop the problematic admin policy
DROP POLICY IF EXISTS "Admin full access to all profiles" ON public.gw_profiles;

-- Create a security definer function to check admin status safely
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true OR role IN ('admin', 'super-admin'))
  );
$$;

-- Create new admin policy using the security definer function
CREATE POLICY "Admin full access to all profiles" 
ON public.gw_profiles 
FOR ALL 
USING (public.is_current_user_admin());