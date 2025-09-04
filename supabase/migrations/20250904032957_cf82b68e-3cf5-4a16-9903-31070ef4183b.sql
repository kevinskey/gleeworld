-- Fix the user_has_admin_role function to avoid recursion
CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Get profile data directly from a query that won't trigger RLS
  SELECT EXISTS (
    SELECT 1 
    FROM public.gw_profiles p
    WHERE p.user_id = user_id_param
    AND (p.is_admin = true OR p.is_super_admin = true)
  );
$$;

-- Drop and recreate the problematic policy using a simpler approach
DROP POLICY IF EXISTS "gw_profiles_admin_manage_all" ON public.gw_profiles;

-- Create a simpler admin policy that checks admin status directly
CREATE POLICY "gw_profiles_admin_manage_all"
ON public.gw_profiles
FOR ALL
TO authenticated
USING (
  -- Direct check for admin status to avoid recursion
  EXISTS (
    SELECT 1 FROM public.gw_profiles p
    WHERE p.user_id = auth.uid()
    AND (p.is_admin = true OR p.is_super_admin = true)
    LIMIT 1
  )
);