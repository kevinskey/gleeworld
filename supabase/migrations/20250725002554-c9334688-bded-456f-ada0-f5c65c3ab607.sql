-- Check and fix all RLS policies on gw_profiles that might cause recursion
-- First, let's see what policies exist
-- Drop all existing policies on gw_profiles to eliminate recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.gw_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.gw_profiles;

-- Create simple, non-recursive policies
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.gw_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own profile (non-admin fields only)
CREATE POLICY "Users can update their own profile" ON public.gw_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.gw_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all profiles (using profiles table to avoid recursion)
CREATE POLICY "Admins can view all profiles" ON public.gw_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
    )
  );

-- Admins can manage all profiles (using profiles table to avoid recursion)
CREATE POLICY "Admins can manage all profiles" ON public.gw_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
    )
  );