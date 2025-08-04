-- First, create a security definer function to check admin status
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

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;

-- Create a new policy using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.gw_profiles 
FOR SELECT 
USING (public.is_current_user_admin());

-- Also ensure users can view their own profiles
CREATE POLICY "Users can view own profile" 
ON public.gw_profiles 
FOR SELECT 
USING (auth.uid() = user_id);