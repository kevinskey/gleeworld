-- Fix infinite recursion in executive board members policies
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Executive board members can view all member info" ON public.gw_executive_board_members;
DROP POLICY IF EXISTS "Executive board members can view other members" ON public.gw_executive_board_members;

-- Create a simpler, non-recursive policy for executive board members
CREATE POLICY "Admin and super admin can view all executive board members" 
ON public.gw_executive_board_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Allow executive board members to view basic info without recursion
CREATE POLICY "Current exec board members can view basic member list" 
ON public.gw_executive_board_members 
FOR SELECT 
USING (
  -- Only show basic info, avoid recursive checks
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Fix the spiritual reflections policy to avoid recursion issues
DROP POLICY IF EXISTS "Chaplains can manage spiritual reflections" ON public.gw_spiritual_reflections;

-- Create a simpler policy for spiritual reflections
CREATE POLICY "Chaplains and admins can manage spiritual reflections" 
ON public.gw_spiritual_reflections 
FOR ALL 
USING (
  -- Check if user is admin/super admin first (no recursion)
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  -- Or check if user has chaplain role directly
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'chaplain'
  )
);

-- Create an insert policy for spiritual reflections
CREATE POLICY "Chaplains and admins can create spiritual reflections" 
ON public.gw_spiritual_reflections 
FOR INSERT 
WITH CHECK (
  -- Check if user is admin/super admin first
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR
  -- Or check if user has chaplain role
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'chaplain'
  )
);