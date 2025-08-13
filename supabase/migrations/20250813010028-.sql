-- Update RLS policies to give executive board members full access to auditioner data

-- First, let's check what executive board members can access
-- Update the function to explicitly grant access to executive board members
CREATE OR REPLACE FUNCTION public.is_executive_board_or_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin/super admin
  IF EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is executive board member
  IF EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Update the auditioner profiles policy to include exec board access
DROP POLICY IF EXISTS "Users with auditions access can view auditioner profiles" ON public.gw_profiles;
CREATE POLICY "Users with auditions access can view auditioner profiles"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  -- Allow viewing auditioner profiles if user has auditions access OR is exec board/admin
  (gw_profiles.role = 'auditioner' AND (
    public.can_view_auditioner_profiles() OR 
    public.is_executive_board_or_admin()
  ))
);

-- Add policy for executive board to manage all audition applications
CREATE POLICY "Executive board and admins can manage all audition applications"
ON public.audition_applications
FOR ALL
TO authenticated
USING (public.is_executive_board_or_admin())
WITH CHECK (public.is_executive_board_or_admin());

-- Ensure executive board can view all auditions from gw_auditions table
CREATE POLICY "Executive board and admins can view all gw_auditions"
ON public.gw_auditions
FOR SELECT
TO authenticated
USING (public.is_executive_board_or_admin());

-- Allow executive board to manage gw_auditions
CREATE POLICY "Executive board and admins can manage gw_auditions"
ON public.gw_auditions
FOR ALL
TO authenticated
USING (public.is_executive_board_or_admin())
WITH CHECK (public.is_executive_board_or_admin());