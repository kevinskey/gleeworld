-- Create RLS policies for gw_profiles to allow admins to manage all profiles

-- Policy: Admins and super admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles AS admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
  OR user_id = auth.uid()
);

-- Policy: Admins and super admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.gw_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles AS admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
  OR user_id = auth.uid()
);

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.gw_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());