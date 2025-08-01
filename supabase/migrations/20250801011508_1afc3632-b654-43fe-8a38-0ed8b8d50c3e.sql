-- Fix infinite recursion in gw_profiles RLS policies

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.gw_profiles;

-- Create a new admin policy using the security definer function to avoid recursion
CREATE POLICY "Admins can manage all profiles v2" 
ON public.gw_profiles FOR ALL 
USING (public.is_current_user_gw_admin());