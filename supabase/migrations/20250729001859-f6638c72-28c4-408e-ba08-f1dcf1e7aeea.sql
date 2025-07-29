-- Fix RLS policies for gw_meeting_minutes to avoid infinite recursion
-- Drop existing policies
DROP POLICY IF EXISTS "Executive board members can view all meeting minutes" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "Executive board members can create meeting minutes" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "Executive board members can update meeting minutes" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "Executive board members can delete meeting minutes" ON public.gw_meeting_minutes;

-- Create security definer function to check executive board membership
CREATE OR REPLACE FUNCTION public.is_executive_board_member_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Create new policies using the security definer function
CREATE POLICY "Executive board members can view all meeting minutes" 
ON public.gw_meeting_minutes 
FOR SELECT 
USING (public.is_executive_board_member_or_admin());

CREATE POLICY "Executive board members can create meeting minutes" 
ON public.gw_meeting_minutes 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  public.is_executive_board_member_or_admin()
);

CREATE POLICY "Executive board members can update meeting minutes" 
ON public.gw_meeting_minutes 
FOR UPDATE 
USING (public.is_executive_board_member_or_admin());

CREATE POLICY "Executive board members can delete meeting minutes" 
ON public.gw_meeting_minutes 
FOR DELETE 
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);