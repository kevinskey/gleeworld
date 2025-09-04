-- Create a working admin policy using a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.get_user_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin, false) OR COALESCE(is_super_admin, false)
  FROM public.gw_profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Now create an admin policy using this function
CREATE POLICY "gw_profiles_admin_manage_final"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (public.get_user_admin_status() = true);