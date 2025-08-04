-- Create a security definer function to check admin status from gw_profiles
CREATE OR REPLACE FUNCTION public.is_gw_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Update the RLS policy to use the new function
DROP POLICY IF EXISTS "gw_profiles_admin_access" ON public.gw_profiles;

CREATE POLICY "gw_profiles_admin_full_access" 
ON public.gw_profiles 
FOR ALL 
USING (public.is_gw_admin());

-- Also create a policy for super admins to have unrestricted access
CREATE POLICY "gw_profiles_super_admin_access" 
ON public.gw_profiles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND is_super_admin = true
  )
);