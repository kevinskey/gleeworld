-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.gw_profiles;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.gw_profiles
    WHERE gw_profiles.user_id = is_admin_user.user_id
    AND (gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
  )
$$;

-- Create non-recursive RLS policies using the security definer function
CREATE POLICY "Admins can view all profiles"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin_user(auth.uid()) OR user_id = auth.uid()
);

CREATE POLICY "Admins can update all profiles"
ON public.gw_profiles
FOR UPDATE
TO authenticated
USING (
  public.is_admin_user(auth.uid()) OR user_id = auth.uid()
);

CREATE POLICY "Admins can insert profiles"
ON public.gw_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_user(auth.uid()) OR user_id = auth.uid()
);