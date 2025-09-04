-- Add RLS policy to allow treasurers to view all profiles for dues management
CREATE POLICY "gw_profiles_treasurer_view_all"
ON public.gw_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'treasurer' 
    AND is_active = true
  )
  OR
  -- Also allow users with treasurer role permissions
  EXISTS (
    SELECT 1 FROM public.username_permissions 
    WHERE user_email = (
      SELECT email FROM public.gw_profiles WHERE user_id = auth.uid()
    )
    AND module_name IN ('treasurer', 'dues-management')
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
);