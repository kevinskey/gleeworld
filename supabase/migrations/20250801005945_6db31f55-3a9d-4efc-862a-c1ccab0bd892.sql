-- Fix infinite recursion in gw_profiles RLS policies

-- First, create a security definer function to check if user is admin/super admin
CREATE OR REPLACE FUNCTION public.is_current_user_gw_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Function to check if user is treasurer
CREATE OR REPLACE FUNCTION public.is_current_user_treasurer()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'treasurer'::executive_position 
    AND is_active = true
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Treasurers and admins can view all profiles" ON public.gw_profiles;

-- Create new policy using security definer functions
CREATE POLICY "Treasurers and admins can view all profiles v2" 
ON public.gw_profiles 
FOR SELECT 
USING (
  public.is_current_user_treasurer() OR 
  public.is_current_user_gw_admin()
);