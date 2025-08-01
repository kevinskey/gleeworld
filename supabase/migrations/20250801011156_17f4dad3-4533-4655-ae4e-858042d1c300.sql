-- Fix RLS policies for gw_profiles to allow admins to update executive board roles

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "gw_profiles_basic_access" ON public.gw_profiles;
DROP POLICY IF EXISTS "Treasurers and admins can view all profiles v2" ON public.gw_profiles;

-- Create comprehensive RLS policies for gw_profiles
-- Allow users to view their own profiles
CREATE POLICY "Users can view their own profile" 
ON public.gw_profiles FOR SELECT 
USING (user_id = auth.uid());

-- Allow users to update their own profiles
CREATE POLICY "Users can update their own profile" 
ON public.gw_profiles FOR UPDATE 
USING (user_id = auth.uid());

-- Allow users to insert their own profiles
CREATE POLICY "Users can insert their own profile" 
ON public.gw_profiles FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Allow admins and super admins to manage all profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.gw_profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles admin_profile 
    WHERE admin_profile.user_id = auth.uid() 
    AND (admin_profile.is_admin = true OR admin_profile.is_super_admin = true)
  )
);

-- Allow treasurers to view all profiles
CREATE POLICY "Treasurers can view all profiles" 
ON public.gw_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'treasurer' 
    AND is_active = true
  )
);

-- Allow executive board members to view all profiles for leadership duties
CREATE POLICY "Executive board members can view all profiles" 
ON public.gw_profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);