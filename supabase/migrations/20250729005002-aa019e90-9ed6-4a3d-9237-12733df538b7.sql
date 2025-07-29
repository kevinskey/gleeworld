-- Create a security definer function to check executive board membership without recursion
CREATE OR REPLACE FUNCTION public.check_executive_board_access()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  );
$$;

-- Drop existing meeting minutes policies and recreate with the new function
DROP POLICY IF EXISTS "meeting_minutes_select" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "meeting_minutes_insert" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "meeting_minutes_update" ON public.gw_meeting_minutes;
DROP POLICY IF EXISTS "meeting_minutes_delete" ON public.gw_meeting_minutes;

-- Create new policies using the security definer function
CREATE POLICY "meeting_minutes_select" ON public.gw_meeting_minutes
  FOR SELECT USING (public.check_executive_board_access());

CREATE POLICY "meeting_minutes_insert" ON public.gw_meeting_minutes
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND public.check_executive_board_access()
  );

CREATE POLICY "meeting_minutes_update" ON public.gw_meeting_minutes
  FOR UPDATE USING (
    (created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )) AND public.check_executive_board_access()
  );

CREATE POLICY "meeting_minutes_delete" ON public.gw_meeting_minutes
  FOR DELETE USING (
    (created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.gw_profiles 
      WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
    )) AND public.check_executive_board_access()
  );